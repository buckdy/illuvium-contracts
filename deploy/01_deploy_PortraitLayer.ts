import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployProxy } from "../scripts/include/deployment_routines";

module.exports = async function (hre: HardhatRuntimeEnvironment) {
  const { imxMinter } = await hre.getNamedAccounts();
  await deployProxy(hre, "Illuvitar Portrait", "PortraitLayer", ["Illuvitar Portrait", "ILP", imxMinter]);
};

module.exports.tags = ["PortraitLayer"];
