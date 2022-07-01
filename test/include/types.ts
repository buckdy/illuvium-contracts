import { BigNumber, BigNumberish } from "ethers";

export interface IAccessoryPrices {
  randomPrice: BigNumberish;
  semiRandomPrice: BigNumberish;
}

export enum BoxType {
  Virtual = 0,
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Platinum = 4,
  Diamond = 5,
}

export enum AccessoryType {
  Skin,
  Body,
  EyeWear,
  HeadWear,
  Props,
}

export enum FinishType {
  Normal,
  Holo,
}

export enum ExpressionType {
  Normal,
  ExpressionA,
  ExpressionB,
}

export enum BackgroundLine {
  Dots,
  Flash,
  Hex,
  Rain,
  Spotlight,
  Mozart,
  Affinity,
  Arena,
  Token,
  Encounter,
}

export interface Portrait {
  tokenId: BigNumberish;
  boxType: BoxType;
  tier: number;
  illuvial: number;
  backgroundTier: number;
  backgroundLine: BackgroundLine;
  backgroundStage: number;
  backgroundVariation: number;
  expression: ExpressionType;
  finish: FinishType;
}

export interface Accessory {
  tokenId: BigNumber;
  boxType: BoxType;
  accessoryType: AccessoryType;
  tier: number;
  stage: number;
}

/// @dev Portrait mint params
export interface PortraitMintParams {
  boxType: BoxType;
  amount: BigNumber;
}

/// @dev Accessory semi random mint params
export interface AccessorySemiRandomMintParams {
  accessoryType: AccessoryType;
  boxType: BoxType;
  amount: BigNumber;
}

/// @dev Accessory full random mint params
export interface AccessoryFullRandomMintParams {
  boxType: BoxType;
  amount: BigNumber;
}

/// @dev User's mint request data
export interface MintRequest {
  requester: string;
  portraitMintParams: PortraitMintParams[];
  portraitAmount: BigNumber; // total portrait amount
  accessorySemiRandomMintParams: AccessorySemiRandomMintParams[];
  accessoryFullRandomMintParams: AccessoryFullRandomMintParams[];
  accessoryAmount: BigNumber; // total accessory amount
  randomNumber: BigNumber; // random number from chainlink
  portraitStartTokenId: BigNumber; // portrait start token id for this request
  accessoryStartTokenId: BigNumber; // accessory start token id for this request
}

export interface MintResult {
  requester: string;
  seed: BigNumber;
  portraits: Portrait[];
  accessories: Accessory[];
}
