import { BigNumber, BigNumberish, utils } from "ethers";
import {
  Portrait,
  Accessory,
  MintRequest,
  PortraitMintParams,
  AccessorySemiRandomMintParams,
  AccessoryFullRandomMintParams,
  BoxType,
  BackgroundLine,
  ExpressionType,
  FinishType,
  MintResult,
} from "./types";
import { getBackgroundTierChance } from "./background_chances_utils";
import { accessoryPrices, portraitPrices, backgroundLines, backgroundStages, backgroundVariations } from "./utils";

const toUint8 = (value: BigNumberish): BigNumber => {
  if (!(value instanceof BigNumber)) value = BigNumber.from(value);
  const bitMask = BigNumber.from(2).pow(8).sub(1);
  return value.and(bitMask);
};

const toUint16 = (value: BigNumberish): BigNumber => {
  if (!(value instanceof BigNumber)) value = BigNumber.from(value);
  const bitMask = BigNumber.from(2).pow(16).sub(1);
  return value.and(bitMask);
};

export class IlluvitarsMintResults {
  static STAGE_COUNT = 3;
  static FULL_PERCENT = 100;
  static TIER_COUNT = 6;
  static EXPRESSION_COUNT = 3;
  static MAX_TIER_CHANCE = 10000; // 100%
  static MAX_TIER = 5;
  static PORTRAIT_MASK = 6;

  static stageProbability = [45, 80, 100];
  static backgroundCounts = [10, 10, 10, 10, 5, 5];
  static expressionProbability = [50, 80, 100];
  static illuvialCounts = [3, 6, 5, 4, 4, 3];

  /**
   * @dev Get mintable portrait and accessory infos with chainlink random number
   * @param requestId Request id of mint request.
   * @return requester Requester address
   * @return seed Seed random number from chainlink
   * @return portraits Mintable portrait on-chain metadata
   * @return accessories Mintable accessory on-chain metadata
   */
  static getMintResult(mintRequest: MintRequest): MintResult {
    if (mintRequest.randomNumber.eq(0)) throw "No random number generated";
    const requester = mintRequest.requester;
    const seed = mintRequest.randomNumber;

    let rand = seed;
    let portraits = [] as Portrait[];
    if (mintRequest.portraitMintParams.length > 0) {
      [portraits, rand] = IlluvitarsMintResults._getPortraitsInfo(
        rand,
        mintRequest.portraitMintParams,
        mintRequest.portraitStartTokenId,
      );
    }

    let accessories = [] as Accessory[];
    if (mintRequest.accessoryFullRandomMintParams.length > 0 || mintRequest.accessorySemiRandomMintParams.length > 0) {
      accessories = IlluvitarsMintResults._getAccessoriesInfo(
        rand,
        mintRequest.accessoryFullRandomMintParams,
        mintRequest.accessorySemiRandomMintParams,
        mintRequest.accessoryStartTokenId,
      );
    }

    return {
      requester,
      seed,
      portraits,
      accessories,
    };
  }

  /**
   * @dev Internal method to get mintable portrait infos
   * @param seed Seed random number to generate portrait infos
   * @param portraitMintParams Users portrait mint params
   * @return portraits Mintable portrait on-chain metadata
   * @return nextRand Last random number to generate accessory metadata
   */
  static _getPortraitsInfo(
    seed: BigNumber,
    portraitMintParams: PortraitMintParams[],
    startTokenId: BigNumber,
  ): [Portrait[], BigNumber] {
    let portraitAmount = BigNumber.from(0);

    const length = portraitMintParams.length;
    for (let i = 0; i < length; i += 1) {
      portraitAmount = portraitAmount.add(portraitMintParams[i].amount);
    }

    let tokenId = startTokenId;
    let nextRand = seed;

    const portraits = new Array(portraitAmount.toNumber()) as Portrait[];
    let idx = 0;

    let mintParam;
    let amount;
    for (let i = 0; i < length; i += 1) {
      mintParam = portraitMintParams[i];
      amount = mintParam.amount;

      for (let j = BigNumber.from(0); j.lt(amount); j = j.add(1)) {
        [portraits[idx], nextRand, tokenId] = IlluvitarsMintResults._getPortraitInfo(nextRand, mintParam, tokenId);
        idx += 1;
      }
    }
    return [portraits, nextRand];
  }

  /**
   * @dev Internal method to get portrait info
   * @param rand Random number
   * @param mintParam Portrait mint params
   * @param tokenId token id
   * @return portrait Mintable portrait on-chain metadata
   * @return nextRand Next random number
   * @return nextTokenId Next item token id
   */
  static _getPortraitInfo(
    rand: BigNumber,
    mintParam: PortraitMintParams,
    tokenId: BigNumber,
  ): [Portrait, BigNumber, BigNumber] {
    // eslint-disable-next-line prefer-const
    let [_rand, chance] = IlluvitarsMintResults._getQuotientAndRemainder16(rand, IlluvitarsMintResults.MAX_TIER_CHANCE);

    const tier = IlluvitarsMintResults._getTier(
      IlluvitarsMintResults._portraitMintInfo(mintParam.boxType).tierChances,
      chance,
    );

    const portrait = {} as Portrait;

    portrait.tokenId = tokenId;
    portrait.boxType = mintParam.boxType;
    portrait.tier = tier;

    let illuvialBN;
    // eslint-disable-next-line prefer-const
    [_rand, illuvialBN] = IlluvitarsMintResults._getQuotientAndRemainder8(
      _rand,
      IlluvitarsMintResults.illuvialCounts[tier],
    );
    portrait.illuvial = illuvialBN.toNumber();

    [_rand, portrait.backgroundTier] = IlluvitarsMintResults._getBackgroundTier(tier, mintParam.boxType, _rand);

    let backgroundIdxBN;
    // eslint-disable-next-line prefer-const
    [_rand, backgroundIdxBN] = IlluvitarsMintResults._getQuotientAndRemainder8(
      _rand,
      toUint8(IlluvitarsMintResults._backgroundLinesLength(portrait.backgroundTier)),
    );
    portrait.backgroundLine = IlluvitarsMintResults._backgroundLines(
      portrait.backgroundTier,
      backgroundIdxBN.toNumber(),
    );

    [_rand, backgroundIdxBN] = IlluvitarsMintResults._getQuotientAndRemainder8(
      _rand,
      toUint8(IlluvitarsMintResults._backgroundStagesLength(portrait.backgroundTier, portrait.backgroundLine)),
    );
    portrait.backgroundStage = IlluvitarsMintResults._backgroundStages(
      portrait.backgroundTier,
      portrait.backgroundLine,
      backgroundIdxBN.toNumber(),
    );

    let backgroundVariationBN;
    // eslint-disable-next-line prefer-const
    [_rand, backgroundVariationBN] = IlluvitarsMintResults._getQuotientAndRemainder8(
      _rand,
      backgroundVariations[portrait.backgroundTier][portrait.backgroundLine][portrait.backgroundStage],
    );
    portrait.backgroundVariation = backgroundVariationBN.toNumber();

    [_rand, portrait.expression] = IlluvitarsMintResults._getExpression(_rand);
    [, portrait.finish] = IlluvitarsMintResults._getFinish(_rand, mintParam.boxType);

    const nextTokenId = tokenId.add(IlluvitarsMintResults.PORTRAIT_MASK);
    const nextRand = IlluvitarsMintResults._illuvitarsHash(rand);

    return [portrait, nextRand, nextTokenId];
  }

  /**
   * @dev Internal method to get semi accessory info
   * @param rand Random number
   * @param mintParam Accessory semi mint params
   * @param tokenId token id
   * @return accessory Mintable accessory on-chain metadata
   * @return nextRand Next random number
   * @return nextTokenId Next item token id
   */
  static _getSemiAcccessoryInfo(
    rand: BigNumber,
    mintParam: AccessorySemiRandomMintParams,
    tokenId: BigNumber,
  ): [Accessory, BigNumber, BigNumber] {
    const [_rand, chance] = IlluvitarsMintResults._getQuotientAndRemainder16(
      rand,
      IlluvitarsMintResults.MAX_TIER_CHANCE,
    );

    const accessory = {} as Accessory;

    accessory.tokenId = tokenId;
    accessory.boxType = mintParam.boxType;
    accessory.accessoryType = mintParam.accessoryType;

    accessory.tier = IlluvitarsMintResults._getTier(
      IlluvitarsMintResults._accessoryMintInfo(mintParam.boxType).tierChances,
      chance,
    );
    [, accessory.stage] = IlluvitarsMintResults._getAccessoryStage(_rand);

    const nextTokenId = tokenId.add(1);
    const nextRand = IlluvitarsMintResults._illuvitarsHash(rand);

    return [accessory, nextRand, nextTokenId];
  }

  /**
   * @dev Internal method to get full accessory info
   * @param rand Random number
   * @param mintParam Accessory full mint params
   * @param tokenId token id
   * @return accessory Mintable accessory on-chain metadata
   * @return nextRand Next random number
   * @return nextTokenId Next item token id
   */
  static _getFullAcccessoryInfo(
    rand: BigNumber,
    mintParam: AccessoryFullRandomMintParams,
    tokenId: BigNumber,
  ): [Accessory, BigNumber, BigNumber] {
    const [_rand, chance] = IlluvitarsMintResults._getQuotientAndRemainder16(
      rand,
      IlluvitarsMintResults.MAX_TIER_CHANCE,
    );

    const accessory = {} as Accessory;

    accessory.tokenId = tokenId;
    accessory.boxType = mintParam.boxType;
    accessory.accessoryType = toUint8(_rand.mod(5)).toNumber();

    const tier = IlluvitarsMintResults._getTier(
      IlluvitarsMintResults._accessoryMintInfo(mintParam.boxType).tierChances,
      chance,
    );
    accessory.tier = tier;
    [, accessory.stage] = IlluvitarsMintResults._getAccessoryStage(_rand);

    const nextTokenId = tokenId.add(1);
    const nextRand = IlluvitarsMintResults._illuvitarsHash(rand);

    return [accessory, nextRand, nextTokenId];
  }

  /**
   * @dev Internal method to get mintable accessories infos
   * @param seed Seed random number to generate portrait infos
   * @param fullRandomMintParams Users accessory full mint params
   * @param semiRandomMintParams Users accessory semi mint params
   * @return accessories Mintable accessory on-chain metadata
   */
  static _getAccessoriesInfo(
    seed: BigNumber,
    fullRandomMintParams: AccessoryFullRandomMintParams[],
    semiRandomMintParams: AccessorySemiRandomMintParams[],
    startTokenId: BigNumber,
  ): Accessory[] {
    let fullRandomAmount = BigNumber.from(0);
    let semiRandomAmount = BigNumber.from(0);
    let length = fullRandomMintParams.length;
    for (let i = 0; i < length; i += 1) {
      fullRandomAmount = fullRandomAmount.add(fullRandomMintParams[i].amount);
    }

    let tokenId = startTokenId;
    length = semiRandomMintParams.length;
    for (let i = 0; i < length; i += 1) {
      semiRandomAmount = semiRandomAmount.add(semiRandomMintParams[i].amount);
    }

    let idx = 0;
    let nextRand = seed;
    const accessories: Accessory[] = new Array(semiRandomAmount.add(fullRandomAmount).toNumber());

    let mintParam;
    for (let i = 0; i < length; i += 1) {
      mintParam = semiRandomMintParams[i];
      for (let j = BigNumber.from(0); j.lt(mintParam.amount); j = j.add(1)) {
        [accessories[idx], nextRand, tokenId] = IlluvitarsMintResults._getSemiAcccessoryInfo(
          nextRand,
          mintParam,
          tokenId,
        );
        idx += 1;
      }
    }

    length = fullRandomMintParams.length;
    for (let i = 0; i < length; i += 1) {
      mintParam = fullRandomMintParams[i];
      for (let j = BigNumber.from(0); j.lt(mintParam.amount); j = j.add(1)) {
        [accessories[idx], nextRand, tokenId] = IlluvitarsMintResults._getFullAcccessoryInfo(
          nextRand,
          fullRandomMintParams[i],
          tokenId,
        );
        idx += 1;
      }
    }

    return accessories;
  }

  static _getTier(tierChances: number[], chance: BigNumber): number {
    for (let k = 0; k < IlluvitarsMintResults.TIER_COUNT; k += 1) {
      if (chance.lt(tierChances[k])) {
        return k;
      }
    }
    return 0;
  }

  static _getBackgroundTier(tier: number, boxType: BoxType, rand: BigNumber): [BigNumber, number] {
    if (boxType == BoxType.Virtual) {
      return [rand, 0];
    }
    const [newRand, chance] = IlluvitarsMintResults._getQuotientAndRemainder16(
      rand,
      IlluvitarsMintResults.MAX_TIER_CHANCE,
    );

    const chances = IlluvitarsMintResults._backgroundTierChances(tier, boxType);

    let backgroundTier = 1;
    for (let k = 0; k < IlluvitarsMintResults.MAX_TIER; k += 1) {
      if (chance.lt(chances[k])) {
        backgroundTier = k + 1;
        break;
      }
    }

    return [newRand, backgroundTier];
  }

  static _getExpression(rand: BigNumber): [BigNumber, ExpressionType] {
    const [newRand, value] = IlluvitarsMintResults._getQuotientAndRemainder16(rand, IlluvitarsMintResults.FULL_PERCENT);

    let expression = 0;
    for (let i = 0; i < IlluvitarsMintResults.EXPRESSION_COUNT; i += 1) {
      if (value.lt(IlluvitarsMintResults.expressionProbability[i])) {
        expression = i;
        break;
      }
    }

    return [newRand, expression];
  }

  static _getFinish(rand: BigNumber, boxType: BoxType): [BigNumber, FinishType] {
    const [newRand, value] = IlluvitarsMintResults._getQuotientAndRemainder16(rand, IlluvitarsMintResults.FULL_PERCENT);

    let finish;
    if (value.lte(IlluvitarsMintResults._portraitMintInfo(boxType).holoProbability)) {
      finish = FinishType.Holo;
    } else {
      finish = FinishType.Normal;
    }

    return [newRand, finish];
  }

  static _getAccessoryStage(rand: BigNumber): [BigNumber, number] {
    const [newRand, value] = IlluvitarsMintResults._getQuotientAndRemainder16(rand, IlluvitarsMintResults.FULL_PERCENT);

    let stage = 0;
    for (let i = 0; i < IlluvitarsMintResults.STAGE_COUNT; i += 1) {
      if (value.lt(IlluvitarsMintResults.stageProbability[i])) {
        stage = i + 1;
        break;
      }
    }
    return [newRand, stage];
  }

  /// @dev calculate quotient and remainder
  static _getQuotientAndRemainder16(a: BigNumber, b: BigNumberish): [BigNumber, BigNumber] {
    return [a.div(b), toUint16(a.mod(b))];
  }

  /// @dev calculate quotient and remainder
  static _getQuotientAndRemainder8(a: BigNumber, b: BigNumberish): [BigNumber, BigNumber] {
    return [a.div(b), toUint8(a.mod(b))];
  }

  static _portraitMintInfo(boxType: BoxType): { price: BigNumber; tierChances: number[]; holoProbability: number } {
    switch (boxType) {
      case BoxType.Virtual:
        return {
          price: portraitPrices[boxType],
          tierChances: [10000, 0, 0, 0, 0, 0],
          holoProbability: 2,
        };
      case BoxType.Bronze:
        return {
          price: portraitPrices[boxType],
          tierChances: [0, 8000, 9700, 9930, 9980, 10000],
          holoProbability: 2,
        };
      case BoxType.Silver:
        return {
          price: portraitPrices[boxType],
          tierChances: [0, 6100, 8800, 9700, 9950, 10000],
          holoProbability: 2,
        };
      case BoxType.Gold:
        return {
          price: portraitPrices[boxType],
          tierChances: [0, 2400, 6600, 8800, 9700, 10000],
          holoProbability: 2,
        };
      case BoxType.Platinum:
        return {
          price: portraitPrices[boxType],
          tierChances: [0, 500, 2000, 4250, 8250, 10000],
          holoProbability: 3,
        };
      case BoxType.Diamond:
        return {
          price: portraitPrices[boxType],
          tierChances: [0, 200, 1000, 2500, 5000, 10000],
          holoProbability: 5,
        };
      default:
        throw "Invalid BoxType";
    }
  }

  static _accessoryMintInfo(boxType: BoxType): {
    randomPrice: BigNumber;
    semiRandomPrice: BigNumber;
    tierChances: number[];
  } {
    switch (boxType) {
      case BoxType.Virtual:
        return {
          ...accessoryPrices[boxType],
          tierChances: [10000, 0, 0, 0, 0, 0],
        };
      case BoxType.Bronze:
        return {
          ...accessoryPrices[boxType],
          tierChances: [0, 8100, 9200, 9700, 9900, 10000],
        };
      case BoxType.Silver:
        return {
          ...accessoryPrices[boxType],
          tierChances: [0, 3000, 7600, 8800, 9700, 10000],
        };
      case BoxType.Gold:
        return {
          ...accessoryPrices[boxType],
          tierChances: [0, 1500, 4700, 7200, 9000, 10000],
        };
      case BoxType.Platinum:
        return {
          ...accessoryPrices[boxType],
          tierChances: [0, 500, 2000, 5300, 8000, 10000],
        };
      case BoxType.Diamond:
        return {
          ...accessoryPrices[boxType],
          tierChances: [0, 100, 600, 2800, 6000, 10000],
        };
      default:
        throw "Invalid BoxType";
    }
  }

  static _backgroundTierChances(tier: number, boxType: BoxType): number[] {
    return getBackgroundTierChance(tier, boxType);
  }

  static _backgroundLinesLength(tier: number): number {
    return backgroundLines[tier].length;
  }

  static _backgroundLines(tier: number, index: number): BackgroundLine {
    return backgroundLines[tier][index];
  }

  static _backgroundStagesLength(tier: number, backgroundLine: BackgroundLine): number {
    return backgroundStages[tier][backgroundLine].length;
  }

  static _backgroundStages(tier: number, backgroundLine: BackgroundLine, index: number): number {
    return backgroundStages[tier][backgroundLine][index];
  }

  static _backgroundVariations(tier: number, backgroundLine: BackgroundLine, backgroundStage: number): number {
    return backgroundVariations[tier][backgroundLine][backgroundStage];
  }

  static _illuvitarsHash(rand: BigNumber): BigNumber {
    return BigNumber.from(utils.keccak256(utils.defaultAbiCoder.encode(["uint256", "uint256"], [rand, rand])));
  }
}

export const getMintResultJS = IlluvitarsMintResults.getMintResult;
