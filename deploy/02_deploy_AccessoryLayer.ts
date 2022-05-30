import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { deployProxy } from "./utils";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { imxMinter } = await hre.getNamedAccounts();

  const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
  const impl = await AccessoryLayerFactory.deploy();

  await deployProxy(hre, "SkinAccessoryLayer", "AccessoryLayer", impl, ["Illuvitar Skin Accessory", "ISA", imxMinter]);
  await deployProxy(hre, "BodyAccessoryLayer", "AccessoryLayer", impl, ["Illuvitar Body Accessory", "IBA", imxMinter]);
  await deployProxy(hre, "EyeWearAccessoryLayer", "AccessoryLayer", impl, [
    "Illuvitar EyeWear Accessory",
    "IEA",
    imxMinter,
  ]);
  await deployProxy(hre, "HeadWearAccessoryLayer", "AccessoryLayer", impl, [
    "Illuvitar HeadWear Accessory",
    "IHA",
    imxMinter,
  ]);
  await deployProxy(hre, "PropsAccessoryLayer", "AccessoryLayer", impl, [
    "Illuvitar Props Accessory",
    "IPA",
    imxMinter,
  ]);
};

module.exports = deploy;
module.exports.tags = ["AccessoryLayer"];
