import { Wallet } from "ethers";

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

export const generateRandomAddress = () => Wallet.createRandom().address;
