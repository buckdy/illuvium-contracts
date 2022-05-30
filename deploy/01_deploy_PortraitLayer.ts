import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { deployProxy } from "./utils";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { imxMinter } = await hre.getNamedAccounts();

  const PortraitLayerFactory = await ethers.getContractFactory("PortraitLayer");
  const impl = await PortraitLayerFactory.deploy();

  await deployProxy(hre, "PortraitLayer", "PortraitLayer", impl, ["Illuvitar Portrait", "IPT", imxMinter]);
};

module.exports = deploy;
module.exports.tags = ["PortraitLayer"];
