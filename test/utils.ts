import { BigNumberish, Wallet, utils } from "ethers";

export enum AccessoryType {
  Skin = 0,
  Body = 1,
  EyeWear = 2,
  HeadWear = 3,
  Props = 4,
}

export enum BoxType {
  Virtual = 0,
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Platinum = 4,
  Diamond = 5,
}

export const generateRandomAddress = (): string => Wallet.createRandom().address;

export const makePortraitMintingBlob = (
  tokenId: BigNumberish,
  boxType: BoxType,
  tier: number,
  skinId: BigNumberish,
  bodyId: BigNumberish,
  eyeId: BigNumberish,
  headId: BigNumberish,
  propsId: BigNumberish,
): string => {
  return utils.formatBytes32String(
    `{${tokenId.toString()}}:{${boxType}${tier},${skinId},${bodyId},${eyeId},${headId},${propsId}}`,
  );
};

export const makeAccessoryMintingBlob = (
  tokenId: BigNumberish,
  boxType: BoxType,
  tier: number,
  acccessoryType: AccessoryType,
): string => {
  return utils.formatBytes32String(`{${tokenId.toString()}}:{${boxType}${tier}${acccessoryType}}`);
};
