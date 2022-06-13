import { HardhatRuntimeEnvironment } from "hardhat/types";
import { constants } from "ethers";
import { ethers } from "hardhat";
import { deployProxy, deploy } from "./include/utils";

// [ERC20/ERC721] Enables transfers of the tokens (transfer by the token owner himself)
const FEATURE_TRANSFERS = 0x0000_0001;

// [ERC20/ERC721] Enables transfers on behalf (transfer by someone else on behalf of token owner)
const FEATURE_TRANSFERS_ON_BEHALF = 0x0000_0002;

module.exports = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  let { chainlinkAggregator, sIlvAddress, linkToken, vrfCoordinator } = await hre.getNamedAccounts();
  const chainId = parseInt(await hre.getChainId());

  if (chainId > 1) {
    if (!sIlvAddress) {
      // deploy sILV Mock contract
      const silvMock = await deploy(hre, "sILVMock", "ERC20Mock", ["sILV", "Escrowed Illuvium"]);
      sIlvAddress = silvMock.address;

      // verify TOKEN_UID and set it (if required)
      const expectedUid = "0xac3051b8d4f50966afb632468a4f61483ae6a953b74e387a01ef94316d6b7d62";
      const actualUid = await silvMock.TOKEN_UID();
      console.log("sILVMock.TOKEN_UID: %o", actualUid.toHexString());
      if (expectedUid !== actualUid.toHexString()) {
        const receipt = await silvMock.setUid(expectedUid);
        console.log("sILVMock.setUid(%o): %o", expectedUid, receipt.hash);
      }

      // transfers and transfers on behalf should be enabled, since LandSale initializer calls it
      const sIlvFeatures = ethers.BigNumber.from(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
      // verify if transfers and transfers on behalf are enabled if required
      const features = await silvMock.features();
      if (!features.eq(sIlvFeatures)) {
        await silvMock.updateFeatures(sIlvFeatures);
      }
    }
    // deploy Chainlink Aggregator Mock (if required)
    if (!chainlinkAggregator) {
      const chainlinkAggregatorMock = await deploy(hre, "ChainlinkAggregatorMock", "ChainlinkAggregatorV3Mock", []);
      chainlinkAggregator = chainlinkAggregatorMock.address;
    }
    // deploy Chainlink VRF Coordinator Mock (if required)
    if (!vrfCoordinator) {
      // deploy Chainlink LINK token Mock (if required -- VRFCoordinator's hard dependency)
      if (!linkToken) {
        const linkTokenMock = await deploy(hre, "LinkTokenMock", "LinkToken", []);
        linkToken = linkTokenMock.address;
      }
      const vrfCoordinatorMock = await deploy(hre, "VRFCoordinatorMock", "VRFCoordinatorMock", [linkToken]);
      vrfCoordinator = vrfCoordinatorMock.address;
    }
  }

  await deployProxy(hre, "IlluvitarsPriceOracle", "IlluvitarsPriceOracleV1", [chainlinkAggregator]);
  const illuvitarsPriceOracleProxy = await hre.deployments.get("IlluvitarsPriceOracle_Proxy");

  await deployProxy(hre, "Minter", "Minter", [
    vrfCoordinator,
    linkToken,
    constants.HashZero,
    "0",
    deployer,
    sIlvAddress,
    illuvitarsPriceOracleProxy.address,
  ]);
};

module.exports.tags = ["Minter"];
