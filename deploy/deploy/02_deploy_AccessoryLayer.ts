import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy, get } = hre.deployments;
  const { deployer, imxMinter } = await hre.getNamedAccounts();

  // const ProxyAdmin = await get("ProxyAdmin");

  await deploy("AccessoryLayer", {
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
          args: ["Test Accessory", "ACC", imxMinter],
        },
      },
    },
  });
};

module.exports = deploy;
module.exports.tags = ["AccessoryLayer"];
