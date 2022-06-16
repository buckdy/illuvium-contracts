import { HardhatRuntimeEnvironment } from "hardhat/types";
import { constants } from "ethers";
import { deployProxy } from "../scripts/include/deployment_routines";

module.exports = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  let { chainlinkAggregator, sIlvAddress, linkToken, vrfCoordinator } = await hre.getNamedAccounts();
  const chainId = parseInt(await hre.getChainId());

  if (chainId > 1) {
    if (!sIlvAddress) {
      // deploy sILV Mock contract
      const sILV2Mock = await deploy("sILV2Mock", {
        contract: "ERC20Mock",
        from: deployer,
        args: ["sILV2", "Escrowed Illuvium"],
        log: true,
        deterministicDeployment: false,
      });
      sIlvAddress = sILV2Mock.address;
    }

    // deploy Chainlink Aggregator Mock (if required)
    if (!chainlinkAggregator) {
      const chainlinkAggregatorMock = await deploy("ChainlinkAggregatorMock", {
        contract: "ChainlinkAggregatorV3Mock",
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
      });

      chainlinkAggregator = chainlinkAggregatorMock.address;
    }
    // deploy Chainlink VRF Coordinator Mock (if required)
    if (!vrfCoordinator) {
      // deploy Chainlink LINK token Mock (if required -- VRFCoordinator's hard dependency)
      if (!linkToken) {
        const linkTokenMock = await deploy("LinkToken", {
          from: deployer,
          args: [],
          log: true,
          deterministicDeployment: false,
        });

        linkToken = linkTokenMock.address;
      }
      const vrfCoordinatorMock = await deploy("VRFCoordinatorMock", {
        from: deployer,
        args: [linkToken],
        log: true,
        deterministicDeployment: false,
      });

      vrfCoordinator = vrfCoordinatorMock.address;
    }
  }

  await deployProxy(hre, "IlluvitarsPriceOracle", "IlluvitarsPriceOracleV1", [chainlinkAggregator]);
  const illuvitarsPriceOracleProxy = await hre.deployments.get("IlluvitarsPriceOracle");

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
