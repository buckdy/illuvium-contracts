import { Wallet, utils, BigNumber } from "ethers";
import type { BigNumberish } from "ethers";

// crypto is used to get enough randomness for the random BN generation
import { randomBytes } from "crypto";

// we use assert to fail fast in case of any errors
import assert from "assert";

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

export interface IAccessoryPrices {
  randomPrice: BigNumberish;
  semiRandomPrice: BigNumberish;
}

class AccessoryPrices implements IAccessoryPrices {
  randomPrice;
  semiRandomPrice;

  constructor(_randomPrice: BigNumberish, _semiRandomPrice: BigNumberish) {
    if (!(_randomPrice instanceof BigNumber)) _randomPrice = BigNumber.from(_randomPrice);
    if (!(_semiRandomPrice instanceof BigNumber)) _semiRandomPrice = BigNumber.from(_semiRandomPrice);
    this.randomPrice = _randomPrice;
    this.semiRandomPrice = _semiRandomPrice;
  }
}

export interface PortraitMintParams {
  boxType: BoxType; // box type
  amount: BigNumberish; // portrait amount to mint
}

export interface AccessorySemiRandomMintParams {
  accessoryType: AccessoryType; // accessory type
  boxType: BoxType; // box type
  amount: BigNumberish; // accessory amount to mint
}

export interface AccessoryFullRandomMintParams {
  boxType: BoxType; // box type
  amount: BigNumberish; // portrait amount to mint
}

export const CENTIETHER: BigNumberish = BigNumber.from(10).pow(16);

export const centiethers = (cents: number): BigNumber => {
  return BigNumber.from(cents).mul(CENTIETHER);
};

export const accessoryPrices = {
  [BoxType.Virtual]: new AccessoryPrices(0, 0),
  [BoxType.Bronze]: new AccessoryPrices(centiethers(5), centiethers(10)),
  [BoxType.Silver]: new AccessoryPrices(centiethers(10), centiethers(20)),
  [BoxType.Gold]: new AccessoryPrices(centiethers(15), centiethers(30)),
  [BoxType.Platinum]: new AccessoryPrices(centiethers(20), centiethers(40)),
  [BoxType.Diamond]: new AccessoryPrices(centiethers(25), centiethers(50)),
};

export const portraitPrices = {
  [BoxType.Virtual]: BigNumber.from(0),
  [BoxType.Bronze]: centiethers(5),
  [BoxType.Silver]: centiethers(10),
  [BoxType.Gold]: centiethers(25),
  [BoxType.Platinum]: centiethers(75),
  [BoxType.Diamond]: centiethers(250),
};

// generates random integer in [from, to) range
export const random_int = (from: number, to: number): number => {
  assert(from <= to, '"from" must not exceed "to"');
  return Math.floor(from + Math.random() * (to - from));
};

export const random_bytes = (size: number): string => "0x" + randomBytes(size).toString("hex");

// generates random BN in a [0, 2^256) range: r ∈ [0, 2^256)
export const random_bn256 = (): BigNumber => {
  // use crypto.randomBytes to generate 256 bits of randomness and wrap it into BN
  return BigNumber.from(randomBytes(32));
};

// picks random element from the array
export const random_element = (array: any[], flat: boolean = true): any | { e: any; i: number } => {
  assert(array.length, "empty array");
  const i = random_int(0, array.length);
  const e = array[i];
  return flat ? e : { e, i };
};

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
  return utils.solidityPack(
    ["string"],
    [`{${tokenId.toString()}}:{${boxType}${tier},${skinId},${bodyId},${eyeId},${headId},${propsId}}`],
  );
};

export const makeAccessoryMintingBlob = (
  tokenId: BigNumberish,
  boxType: BoxType,
  tier: number,
  acccessoryType: AccessoryType,
): string => {
  return utils.solidityPack(["string"], [`{${tokenId.toString()}}:{${boxType}${tier}${acccessoryType}}`]);
};

export const generatePurchaseParams = (
  portraitMintMinLength: number = 1,
  portraitMintMaxLength: number = 3,
  accessorySemiRandomMintMinLength: number = 1,
  accessorySemiRandomMintMaxLength: number = 3,
  accessoryFullRandomMintMinLength: number = 1,
  accessoryFullRandomMintMaxLength: number = 3,
  maxAmountPerMint: number = 2,
  onlyVirtual: boolean = false,
): {
  portraitMintParams: PortraitMintParams[];
  accessorySemiRandomMintParams: AccessorySemiRandomMintParams[];
  accessoryFullRandomMintParams: AccessoryFullRandomMintParams[];
  etherPrice: BigNumberish;
} => {
  const boxTypeNumbers = Object.values(BoxType).filter(value => Number.isInteger(value));
  const accessoryTypeNumbers = Object.values(AccessoryType).filter(value => Number.isInteger(value));
  const getRandomAmount = () => BigNumber.from(random_int(1, maxAmountPerMint));

  let etherPrice = BigNumber.from(0);

  const portraitMintParams = [];
  const portraitMintLength = random_int(portraitMintMinLength, portraitMintMaxLength + 1);
  for (let i = 0; i < portraitMintLength; i++) {
    portraitMintParams.push({
      boxType: onlyVirtual ? BoxType.Virtual : (random_element(boxTypeNumbers) as BoxType),
      amount: getRandomAmount(),
    });
    etherPrice = etherPrice.add(portraitMintParams[i].amount.mul(portraitPrices[portraitMintParams[i].boxType]));
  }

  const accessorySemiRandomMintParams = [];
  const accessorySemiRandomMintLength = random_int(
    accessorySemiRandomMintMinLength,
    accessorySemiRandomMintMaxLength + 1,
  );
  for (let i = 0; i < accessorySemiRandomMintLength; i++) {
    accessorySemiRandomMintParams.push({
      accessoryType: random_element(accessoryTypeNumbers) as AccessoryType,
      boxType: onlyVirtual ? BoxType.Virtual : (random_element(boxTypeNumbers) as BoxType),
      amount: getRandomAmount(),
    });
    etherPrice = etherPrice.add(
      accessorySemiRandomMintParams[i].amount.mul(
        accessoryPrices[accessorySemiRandomMintParams[i].boxType].semiRandomPrice,
      ),
    );
  }

  const accessoryFullRandomMintParams = [];
  const accessoryFullRandomMintLength = random_int(
    accessoryFullRandomMintMinLength,
    accessoryFullRandomMintMaxLength + 1,
  );
  for (let i = 0; i < accessoryFullRandomMintLength; i++) {
    accessoryFullRandomMintParams.push({
      boxType: onlyVirtual ? BoxType.Virtual : (random_element(boxTypeNumbers) as BoxType),
      amount: getRandomAmount(),
    });
    etherPrice = etherPrice.add(
      accessoryFullRandomMintParams[i].amount.mul(
        accessoryPrices[accessoryFullRandomMintParams[i].boxType].randomPrice,
      ),
    );
  }

  return {
    portraitMintParams,
    accessorySemiRandomMintParams,
    accessoryFullRandomMintParams,
    etherPrice,
  };
};
