import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { Contract } from "ethers";

export const deploy = async (
  hre: HardhatRuntimeEnvironment,
  name: string,
  contractName: string,
  args: any[],
): Promise<Contract> => {
  const ContractFactory = await ethers.getContractFactory(contractName);
  const contract = await ContractFactory.deploy(...args);

  const contractReceipt = await contract.deployTransaction.wait(1);

  const chainlinkAggregatorMockArtifact = await hre.deployments.getExtendedArtifact(contractName);
  const chainlinkAggregatorDeployments = {
    address: contract.address,
    transactionHash: contract.deployTransaction.hash,
    receipt: contractReceipt,
    args: [],
    ...chainlinkAggregatorMockArtifact,
  };
  await hre.deployments.save(`${name}_Implementation`, chainlinkAggregatorDeployments);
  console.log(`Deploy ${name} Implementation done -> ` + contract.address);

  return contract;
};

export const deployProxy = async (
  hre: HardhatRuntimeEnvironment,
  name: string,
  contractName: string,
  args: any[],
  implementation?: Contract,
): Promise<void> => {
  if (!implementation) implementation = await deploy(hre, name, contractName, []);

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

  const implArtifact = await hre.deployments.getExtendedArtifact(contractName);
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
