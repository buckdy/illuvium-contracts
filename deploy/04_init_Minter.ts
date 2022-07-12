import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { BoxType, PORTRAIT_MINT_INFO, ACCESSORY_MINT_INFO } from "./config";

module.exports = async function (hre: HardhatRuntimeEnvironment) {
  const { get } = hre.deployments;

  const MinterFactory = await ethers.getContractFactory("Minter");
  const minter = MinterFactory.attach((await get("Minter")).address);

  for (let i = BoxType.Bronze; i <= BoxType.Diamond; i += 1) {
    await minter.setPortraitMintInfo(i, PORTRAIT_MINT_INFO[i] as any);
    await minter.setAccessoryMintInfo(i, ACCESSORY_MINT_INFO[i] as any);
  }
};

module.exports.tags = ["InitMinter"];
