import { BigNumber, utils } from "ethers";

type PortraitMintInfo = {
  price: BigNumber;
  tierChances: number[];
  holoProbability: number;
};

type AccessoryMintInfo = {
  randomPrice: BigNumber;
  semiRandomPrice: BigNumber;
  tierChances: number[];
};

export enum BoxType {
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Platinum = 4,
  Diamond = 5,
}

export const PORTRAIT_MINT_INFO: Record<BoxType, PortraitMintInfo> = {
  [BoxType.Bronze]: {
    price: utils.parseEther("0.05"),
    tierChances: [8000, 9700, 9930, 9980],
    holoProbability: 200,
  },
  [BoxType.Silver]: {
    price: utils.parseEther("0.1"),
    tierChances: [6100, 8800, 9700, 9950],
    holoProbability: 200,
  },
  [BoxType.Gold]: {
    price: utils.parseEther("0.25"),
    tierChances: [2400, 6600, 8800, 9700],
    holoProbability: 200,
  },
  [BoxType.Platinum]: {
    price: utils.parseEther("0.75"),
    tierChances: [500, 2000, 4250, 8250],
    holoProbability: 300,
  },
  [BoxType.Diamond]: {
    price: utils.parseEther("2.5"),
    tierChances: [200, 1000, 2500, 5000],
    holoProbability: 500,
  },
};

export const ACCESSORY_MINT_INFO: Record<BoxType, AccessoryMintInfo> = {
  [BoxType.Bronze]: {
    randomPrice: utils.parseEther("0.05"),
    semiRandomPrice: utils.parseEther("0.1"),
    tierChances: [8100, 9200, 9700, 9900],
  },
  [BoxType.Silver]: {
    randomPrice: utils.parseEther("0.1"),
    semiRandomPrice: utils.parseEther("0.2"),
    tierChances: [3000, 7600, 8800, 9700],
  },
  [BoxType.Gold]: {
    randomPrice: utils.parseEther("0.15"),
    semiRandomPrice: utils.parseEther("0.3"),
    tierChances: [1500, 4700, 7200, 9000],
  },
  [BoxType.Platinum]: {
    randomPrice: utils.parseEther("0.2"),
    semiRandomPrice: utils.parseEther("0.4"),
    tierChances: [500, 2000, 5300, 8000],
  },
  [BoxType.Diamond]: {
    randomPrice: utils.parseEther("0.25"),
    semiRandomPrice: utils.parseEther("0.5"),
    tierChances: [100, 600, 2800, 6000],
  },
};
