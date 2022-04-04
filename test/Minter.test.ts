import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, constants, utils } from "ethers";
import { Minter } from "../typechain";
import { generateRandomAddress, BoxType } from "./utils";

describe("Minter", () => {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let vrfCoordinator: Contract;
  let linkToken: Contract;
  let minterContract: Minter;

  const keyHash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
  const fee = utils.parseEther("0.0001");

  const treasury = generateRandomAddress();
  const weth = generateRandomAddress();
  const oracleRegistry = generateRandomAddress();

  beforeEach(async () => {
    [owner, alice] = await ethers.getSigners();
    const LinkTokenFactory = await ethers.getContractFactory("LinkToken");
    const VRFCoordinatorMockFactory = await ethers.getContractFactory("VRFCoordinatorMock");
    const MinterFactory = await ethers.getContractFactory("Minter");

    linkToken = await LinkTokenFactory.deploy();
    vrfCoordinator = await VRFCoordinatorMockFactory.deploy(linkToken.address);
    minterContract = await MinterFactory.deploy(
      vrfCoordinator.address,
      linkToken.address,
      keyHash,
      fee,
      treasury,
      weth,
      oracleRegistry,
    );

    await linkToken.transfer(minterContract.address, 10 ** 15);
  });

  describe("constructor", async () => {
    const MinterFactory = await ethers.getContractFactory("Minter");

    it("Revert if zero address", async () => {
      await expect(
        MinterFactory.deploy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          constants.AddressZero,
          weth,
          oracleRegistry,
        ),
      ).to.revertedWith("cannot zero address");
    });

    it("should set properly", async () => {
      expect(await minterContract.oracleRegistry()).to.equal(oracleRegistry);
    });
  });

  describe("setTreasury", () => {
    it("Revert if caller is not owner", async () => {
      await expect(minterContract.connect(alice).setTreasury(treasury)).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Revert if zero address", async () => {
      await expect(minterContract.setTreasury(constants.AddressZero)).to.revertedWith("Treasury address cannot zero");
    });

    it("should set treasury", async () => {
      expect(await minterContract.treasury()).to.equal(treasury);
      const newTreasury = "0xA4e47B38415201d4c8aB42711892A31C7B06bdE9";
      await minterContract.connect(owner).setTreasury(newTreasury);
      expect(await minterContract.treasury()).to.equal(newTreasury);
    });
  });

  describe("setPortraitLayerPrice", () => {
    const price = utils.parseEther("0.2");

    it("Revert if caller is not owner", async () => {
      await expect(minterContract.connect(alice).setPortraitLayerPrice([BoxType.Diamond], [price])).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Revert if length is invalid", async () => {
      await expect(minterContract.setPortraitLayerPrice([], [])).to.revertedWith("Invalid length");
      await expect(minterContract.setPortraitLayerPrice([BoxType.Diamond, 1], [price])).to.revertedWith(
        "Invalid length",
      );
    });

    it("set portrait price", async () => {
      await minterContract.setPortraitLayerPrice([BoxType.Diamond], [price]);
      expect(await minterContract.portraitLayerPrices(BoxType.Diamond)).to.equal(price);
    });
  });

  describe("setAccessoryLayerFullRandomPrice", () => {
    const price = utils.parseEther("0.2");

    it("Revert if caller is not owner", async () => {
      await expect(
        minterContract.connect(alice).setAccessoryLayerFullRandomPrice([BoxType.Diamond], [price]),
      ).to.revertedWith("Ownable: caller is not the owner");
    });

    it("Revert if length is invalid", async () => {
      await expect(minterContract.setAccessoryLayerFullRandomPrice([], [])).to.revertedWith("Invalid length");
      await expect(minterContract.setAccessoryLayerFullRandomPrice([BoxType.Diamond, 1], [price])).to.revertedWith(
        "Invalid length",
      );
    });

    it("set portrait price", async () => {
      await minterContract.setAccessoryLayerFullRandomPrice([BoxType.Diamond], [price]);
      expect(await minterContract.accessoryLayerFullRandomPrices(BoxType.Diamond)).to.equal(price);
    });
  });

  describe("setAccessoryLayerSemiRandomPrices", () => {
    const price = utils.parseEther("0.2");

    it("Revert if caller is not owner", async () => {
      await expect(
        minterContract.connect(alice).setAccessoryLayerSemiRandomPrices([BoxType.Diamond], [price]),
      ).to.revertedWith("Ownable: caller is not the owner");
    });

    it("Revert if length is invalid", async () => {
      await expect(minterContract.setAccessoryLayerSemiRandomPrices([], [])).to.revertedWith("Invalid length");
      await expect(minterContract.setAccessoryLayerSemiRandomPrices([BoxType.Diamond, 1], [price])).to.revertedWith(
        "Invalid length",
      );
    });

    it("set portrait price", async () => {
      await minterContract.setAccessoryLayerSemiRandomPrices([BoxType.Diamond], [price]);
      expect(await minterContract.accessoryLayerSemiRandomPrices(BoxType.Diamond)).to.equal(price);
    });
  });

  describe("setOracleRegistry", () => {
    it("Revert if caller is not owner", async () => {
      await expect(minterContract.connect(alice).setOracleRegistry(oracleRegistry)).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("should set oracle registry", async () => {
      expect(await minterContract.oracleRegistry()).to.equal(oracleRegistry);
      await minterContract.setOracleRegistry(treasury);
      expect(await minterContract.oracleRegistry()).to.equal(treasury);
    });
  });
});
