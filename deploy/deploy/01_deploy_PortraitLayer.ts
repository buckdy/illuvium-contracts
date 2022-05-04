import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy, get } = hre.deployments;
  const { deployer, imxMinter } = await hre.getNamedAccounts();

  await deploy("Portrait", {
    contract: "PortraitLayer",
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
    proxy: {
      owner: deployer,
      proxyContract: "TransparentUpgradeableProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: ["Illuvitar Portrait", "IPT", imxMinter],
        },
      },
    },
  });
};

module.exports = deploy;
module.exports.tags = ["PortraitLayer"];
