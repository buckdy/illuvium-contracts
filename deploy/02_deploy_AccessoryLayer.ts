import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployProxy } from "../scripts/include/deployment_routines";

module.exports = async function (hre: HardhatRuntimeEnvironment) {
  const { imxMinter } = await hre.getNamedAccounts();

  await deployProxy(hre, "Illuvitar Accessory", "AccessoryLayer", ["Illuvitar Accessory", "ILA", imxMinter]);
};

module.exports.tags = ["AccessoryLayer"];
