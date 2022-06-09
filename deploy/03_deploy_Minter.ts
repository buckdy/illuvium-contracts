import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { constants } from "ethers";
import { ethers } from "hardhat";
import { deployProxy } from "./utils";

// [ERC20/ERC721] Enables transfers of the tokens (transfer by the token owner himself)
const FEATURE_TRANSFERS = 0x0000_0001;

// [ERC20/ERC721] Enables transfers on behalf (transfer by someone else on behalf of token owner)
const FEATURE_TRANSFERS_ON_BEHALF = 0x0000_0002;

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer, linkToken, vrfCoordinator } = await hre.getNamedAccounts();
  let { chainlinkAggregator, sIlvAddress } = await hre.getNamedAccounts();
  const chainId = parseInt(await hre.getChainId());

  const MinterFactory = await ethers.getContractFactory("Minter");
  const minterImpl = await MinterFactory.deploy();

  if (chainId > 1) {
    if (!sIlvAddress) {
      const SIlvMockFactory = await ethers.getContractFactory("ERC20Mock");
      const sIlvMock = await SIlvMockFactory.deploy("sILV", "Escrowed Illuvium");
      sIlvAddress = sIlvMock.address;
      console.log(`Deploy SIlvMock Implementation done -> ` + sIlvAddress);

      const sIlvMockReceipt = await sIlvMock.deployTransaction.wait(1);

      const sIlvMockArtifact = await hre.deployments.getExtendedArtifact("ERC20Mock");
      const sIlvDeployments = {
        address: sIlvAddress,
        transactionHash: sIlvMock.deployTransaction.hash,
        receipt: sIlvMockReceipt,
        args: [],
        ...sIlvMockArtifact,
      };
      await hre.deployments.save(`SIlvMock`, sIlvDeployments);

      // verify TOKEN_UID and set it (if required)
      const expectedUid = "0xac3051b8d4f50966afb632468a4f61483ae6a953b74e387a01ef94316d6b7d62";
      const actualUid = await sIlvMock.TOKEN_UID();
      console.log("sILV_Mock.TOKEN_UID: %o", actualUid.toHexString());
      if (expectedUid !== actualUid.toHexString()) {
        const receipt = await sIlvMock.setUid(expectedUid);
        console.log("sILV_Mock.setUid(%o): %o", expectedUid, receipt.hash);
      }

      // transfers and transfers on behalf should be enabled, since LandSale initializer calls it
      const sIlvFeatures = ethers.BigNumber.from(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
      // verify if transfers and transfers on behalf are enabled if required
      const features = await sIlvMock.features();
      if (!features.eq(sIlvFeatures)) {
        await sIlvMock.updateFeatures(sIlvFeatures);
      }
    }
    // deploy Chainlink Aggregator Mock (if required)
    if (!chainlinkAggregator) {
      const ChainlinkAggregatorMockFactory = await ethers.getContractFactory("ChainlinkAggregatorV3Mock");
      const chainlinkAggregatorMock = await ChainlinkAggregatorMockFactory.deploy();

      const chainlinkAggregatorMockReceipt = await chainlinkAggregatorMock.deployTransaction.wait(1);

      const chainlinkAggregatorMockArtifact = await hre.deployments.getExtendedArtifact("ChainlinkAggregatorV3Mock");
      const chainlinkAggregatorDeployments = {
        address: sIlvAddress,
        transactionHash: chainlinkAggregatorMock.deployTransaction.hash,
        receipt: chainlinkAggregatorMockReceipt,
        args: [],
        ...chainlinkAggregatorMockArtifact,
      };
      await hre.deployments.save(`SIlvMock`, chainlinkAggregatorDeployments);
      chainlinkAggregator = chainlinkAggregatorMock.address;
      console.log(`Deploy ChainlinkAggregatorMock Implementation done -> ` + chainlinkAggregator);
    }
  }

  const PriceOracleFactory = await ethers.getContractFactory("IlluvitarsPriceOracleV1");
  const priceOracleImpl = await PriceOracleFactory.deploy();

  await deployProxy(hre, "IlluvitarsPriceOracle", "IlluvitarsPriceOracleV1", priceOracleImpl, [chainlinkAggregator]);
  const illuvitarsPriceOracleProxy = await hre.deployments.get("IlluvitarsPriceOracle_Proxy");

  await deployProxy(hre, "Minter", "Minter", minterImpl, [
    vrfCoordinator,
    linkToken,
    constants.HashZero,
    "0",
    deployer,
    sIlvAddress,
    illuvitarsPriceOracleProxy.address,
  ]);
};

module.exports = deploy;
module.exports.tags = ["Minter"];
