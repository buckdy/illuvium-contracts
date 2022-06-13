import { HardhatRuntimeEnvironment } from "hardhat/types";
import { constants } from "ethers";
import { deployProxy, deploy } from "./include/utils";

module.exports = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  let { chainlinkAggregator, sIlvAddress, linkToken, vrfCoordinator } = await hre.getNamedAccounts();
  const chainId = parseInt(await hre.getChainId());

  if (chainId > 1) {
    if (!sIlvAddress) {
      // deploy sILV Mock contract
      const silvMock = await deploy(hre, "sILV2Mock", "ERC20Mock", ["sILV2", "Escrowed Illuvium"]);
      sIlvAddress = silvMock.address;
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
