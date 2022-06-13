import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployProxy } from "./include/utils";

module.exports = async function (hre: HardhatRuntimeEnvironment) {
  const { imxMinter } = await hre.getNamedAccounts();
  await deployProxy(hre, "PortraitLayer", "PortraitLayer", ["Illuvitar Portrait", "IPT", imxMinter]);
};

module.exports.tags = ["PortraitLayer"];
