import fs from "fs";
import path from "path";
import { BoxType } from "./types";

const portraitTierChancePerBoxType = {
  [BoxType.Virtual]: [100.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [BoxType.Bronze]: [0.0, 80.0, 17.0, 2.3, 0.5, 0.2],
  [BoxType.Silver]: [0.0, 61.0, 27.0, 9.0, 2.5, 0.5],
  [BoxType.Gold]: [0.0, 24.0, 42.0, 22.0, 9.0, 3.0],
  [BoxType.Platinum]: [0.0, 5.0, 15.0, 22.5, 40.0, 17.5],
  [BoxType.Diamond]: [0.0, 2.0, 8.0, 15.0, 25.0, 50.0],
};

function getBackgroundChances(illuvialTier: number, boxType: BoxType) {
  if (!(illuvialTier >= 1 && illuvialTier <= 5)) {
    throw "Invalid `illuvial_tier";
  }
  const boxProbs = portraitTierChancePerBoxType[boxType];
  const backgroundProbs = [];
  let normalizingFactor = 0;
  for (let i = 1; i < boxProbs.length; i++) {
    backgroundProbs.push(boxProbs[i] * (Math.abs(i - illuvialTier) + 1));
    normalizingFactor += backgroundProbs[i - 1];
  }
  return backgroundProbs.map(value => {
    return +((value / normalizingFactor) * 100).toFixed(2);
  });
}

function getSolidityProbs(probs: number[]) {
  const solidityProbs: number[] = [];
  for (let i = 0; i < probs.length - 1; i++) {
    if (i > 0) {
      solidityProbs.push(Math.round(probs[i] * 100 + solidityProbs[i - 1]));
      continue;
    }
    solidityProbs.push(Math.round(probs[i] * 100));
  }
  solidityProbs.push(10000);
  return solidityProbs;
}

export function getBackgroundTierChance(tier: number, boxType: BoxType): number[] {
  return getSolidityProbs(getBackgroundChances(tier, boxType));
}

/*
function main(): void {
  let tierProbs: { [boxType: string]: number[] } = {};
  const solidityBackgroundProbs: { [tier: string]: typeof tierProbs } = {};
  const boxTypes = Object.keys(portraitTierChancePerBoxType);
  for (let tier = 1; tier <= 5; tier++) {
    for (const boxType of boxTypes) {
      if (boxType === "0") continue;
      tierProbs[BoxType[parseInt(boxType)]] = getBackgroundTierChance(tier, parseInt(boxType) as BoxType);
    }
    solidityBackgroundProbs[tier.toString()] = tierProbs;
    tierProbs = {};
  }
  fs.writeFileSync(path.join(__dirname, "background_probs.json"), JSON.stringify(solidityBackgroundProbs));
}

main();
*/
