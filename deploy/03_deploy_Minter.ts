import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { constants } from "ethers";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy, get } = hre.deployments;
  const { deployer, linkToken, weth, vrfCoordinator } = await hre.getNamedAccounts();

  await deploy("Minter", {
    from: deployer,
    args: [vrfCoordinator, linkToken, constants.HashZero, "0", deployer, weth, constants.AddressZero],
    log: true,
    deterministicDeployment: false,
  });
};

module.exports = deploy;
module.exports.tags = ["Minter"];
