import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployProxy, deploy } from "../scripts/include/deployment_routines";

module.exports = async function (hre: HardhatRuntimeEnvironment) {
  const { imxMinter } = await hre.getNamedAccounts();

  const impl = await deploy(hre, "AccessoryLayer", "AccessoryLayer", []);

  await deployProxy(hre, "SkinAccessoryLayer", "AccessoryLayer", ["Illuvitar Skin Accessory", "ISA", imxMinter], impl);
  await deployProxy(hre, "BodyAccessoryLayer", "AccessoryLayer", ["Illuvitar Body Accessory", "IBA", imxMinter], impl);
  await deployProxy(
    hre,
    "EyeWearAccessoryLayer",
    "AccessoryLayer",
    ["Illuvitar EyeWear Accessory", "IEA", imxMinter],
    impl,
  );
  await deployProxy(
    hre,
    "HeadWearAccessoryLayer",
    "AccessoryLayer",
    ["Illuvitar HeadWear Accessory", "IHA", imxMinter],
    impl,
  );
  await deployProxy(
    hre,
    "PropsAccessoryLayer",
    "AccessoryLayer",
    ["Illuvitar Props Accessory", "IPA", imxMinter],
    impl,
  );
};

module.exports.tags = ["AccessoryLayer"];
