import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer, linkToken } = await hre.getNamedAccounts();

  await deploy("VRFCoordinatorMock", {
    from: deployer,
    contract: "VRFCoordinatorMockV2",
    args: [linkToken],
    log: true,
    deterministicDeployment: false,
  });
};

module.exports = deploy;
module.exports.tags = ["VRFCoordinatorMock"];
