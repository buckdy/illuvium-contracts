import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { Contract } from "ethers";

export const deployProxy = async (
  hre: HardhatRuntimeEnvironment,
  name: string,
  contractName: string,
  implementation: Contract,
  args: any[],
): Promise<void> => {
  const implReceipt = await implementation.deployTransaction.wait(1);

  const implArtifact = await hre.deployments.getExtendedArtifact(contractName);
  const implDeployments = {
    address: implementation.address,
    transactionHash: implementation.deployTransaction.hash,
    receipt: implReceipt,
    args: [],
    ...implArtifact,
  };

  await hre.deployments.save(`${name}_Implementation`, implDeployments);

  console.log(`Deploy ${name} Implementation done -> ` + implementation.address);

  const factory = await ethers.getContractFactory(contractName);
  const data = factory.interface.encodeFunctionData("initialize", args);

  const ERC1967ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");

  const proxy = await ERC1967ProxyFactory.deploy(implementation.address, data);
  const proxyReceipt = await proxy.deployTransaction.wait(1);

  const proxyArtifact = await hre.deployments.getExtendedArtifact("ERC1967Proxy");
  const proxyDeployments = {
    address: proxy.address,
    transactionHash: proxy.deployTransaction.hash,
    receipt: proxyReceipt,
    args: [implementation.address, data],
    ...proxyArtifact,
  };

  await hre.deployments.save(`${name}_Proxy`, proxyDeployments);

  const deploymentsInfo = {
    address: proxy.address,
    transactionHash: proxy.deployTransaction.hash,
    receipt: proxyReceipt,
    args,
    ...implArtifact,
  };

  await hre.deployments.save(`${name}`, deploymentsInfo);

  console.log(`Deploy ${name} Proxy done -> ` + proxy.address);
};
