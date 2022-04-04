import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { utils } from "ethers";
import { AccessoryLayer, PortraitLayer } from "../typechain";
import { AccessoryType, BoxType } from "./utils";

describe("PortraitLayer", () => {
  let portraitLayer: PortraitLayer;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let minter: SignerWithAddress;
  let accessoryLayer: AccessoryLayer;
  const NAME: string = "Illuvitar Portrait";
  const SYMBOL: string = "ILV-PORT";

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [owner, alice, minter] = accounts;
    const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
    const PortraitLayerFactory = await ethers.getContractFactory("PortraitLayer");

    accessoryLayer = (await upgrades.deployProxy(AccessoryLayerFactory, [
      "Illuvitar Accessory",
      "ILV-ACC",
      minter.address,
    ])) as AccessoryLayer;

    portraitLayer = (await upgrades.deployProxy(PortraitLayerFactory, [
      NAME,
      SYMBOL,
      minter.address,
      accessoryLayer.address,
    ])) as PortraitLayer;
  });

  describe("initializer", () => {
    it("check initial data", async () => {
      expect(await portraitLayer.accessoryLayer()).to.equal(accessoryLayer.address);
    });
  });

  describe("combine", () => {
    const tokenId = 1;

    beforeEach(async () => {
      let data = utils.defaultAbiCoder.encode(["uint8", "uint8"], [BoxType.Diamond, 2]);
      await portraitLayer.connect(minter).mintFor(alice.address, 1, data);

      data = utils.defaultAbiCoder.encode(["uint8", "uint8", "uint8"], [BoxType.Diamond, 2, AccessoryType.Body]);
      await accessoryLayer.connect(minter).mintFor(alice.address, 1, data);

      data = utils.defaultAbiCoder.encode(["uint8", "uint8", "uint8"], [BoxType.Diamond, 2, AccessoryType.EyeWear]);
      await accessoryLayer.connect(minter).mintFor(alice.address, 1, data);

      await accessoryLayer.connect(alice).approve(portraitLayer.address, 1);
      await accessoryLayer.connect(alice).approve(portraitLayer.address, 2);
    });

    it("Revert if accessoryIds length is zero", async () => {
      await expect(portraitLayer.combine(tokenId, [])).to.revertedWith("Invalid length");
    });

    it("Revert if not portrait owner", async () => {
      const data = utils.defaultAbiCoder.encode(["uint8", "uint8", "uint8"], [BoxType.Diamond, 2, AccessoryType.Body]);
      await accessoryLayer.connect(minter).mintFor(owner.address, 1, data);

      await accessoryLayer.connect(owner).approve(portraitLayer.address, 3);

      await expect(portraitLayer.connect(owner).combine(tokenId, [3])).to.revertedWith("Not portrait layer owner");
    });

    it("Revert if not accessory owner", async () => {
      const data = utils.defaultAbiCoder.encode(["uint8", "uint8"], [BoxType.Diamond, 2]);
      await portraitLayer.connect(minter).mintFor(owner.address, 1, data);

      await expect(portraitLayer.connect(owner).combine(2, [1])).to.revertedWith(
        "ERC721: transfer of token that is not own",
      );
    });

    it("should combine", async () => {
      const tx = await portraitLayer.connect(alice).combine(tokenId, [2, 1]);
      await expect(tx).to.emit(portraitLayer, "Combined").withArgs(tokenId, AccessoryType.EyeWear, 2);
      await expect(tx).to.emit(portraitLayer, "Combined").withArgs(tokenId, AccessoryType.Body, 1);
      expect(await portraitLayer.accessories(tokenId, AccessoryType.EyeWear)).to.be.equal(2);
      expect(await portraitLayer.accessories(tokenId, AccessoryType.Body)).to.be.equal(1);
    });

    it("Revert if already combined", async () => {
      const data = utils.defaultAbiCoder.encode(["uint8", "uint8", "uint8"], [BoxType.Diamond, 2, AccessoryType.Body]);
      await accessoryLayer.connect(minter).mintFor(alice.address, 1, data);

      await portraitLayer.connect(alice).combine(tokenId, [1]);

      await expect(portraitLayer.connect(alice).combine(tokenId, [3])).to.revertedWith("Already combined");
    });
  });

  describe("mint", () => {
    it("mint with metadata", async () => {
      const data = utils.defaultAbiCoder.encode(["uint8", "uint8"], [BoxType.Diamond, 2]);
      await portraitLayer.connect(minter).mintFor(alice.address, 1, data);
      const metadata = await portraitLayer.metadata(1);

      expect(metadata.boxType).to.equal(BoxType.Diamond);
      expect(metadata.tier).to.equal(2);
    });
  });
});
