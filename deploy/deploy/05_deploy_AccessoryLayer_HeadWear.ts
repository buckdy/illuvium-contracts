import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy, get } = hre.deployments;
  const { deployer, imxMinter } = await hre.getNamedAccounts();

  await deploy("HeadWearAccessoryLayer", {
    contract: "AccessoryLayer",
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
          args: ["Illuvitar HeadWear Accessory", "IWA", imxMinter],
        },
      },
    },
  });
};

module.exports = deploy;
module.exports.tags = ["HeadWear"];
