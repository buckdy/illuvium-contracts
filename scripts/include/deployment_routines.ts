import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

export const deployProxy = async (
  hre: HardhatRuntimeEnvironment,
  name: string,
  contractName: string,
  args: any[],
): Promise<void> => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const implementation = await deploy(`${name}_Implementation`, {
    contract: contractName,
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
  });

  const factory = await ethers.getContractFactory(contractName);
  const data = factory.interface.encodeFunctionData("initialize", args);

  await deploy(name, {
    contract: "ERC1967Proxy",
    from: deployer,
    args: [implementation.address, data],
    log: true,
    deterministicDeployment: false,
  });
};
