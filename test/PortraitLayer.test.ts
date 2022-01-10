import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer } from "ethers";
import { AccessoryType, BoxType } from "./utils";

describe("PortraitLayer", () => {
  let accounts: Signer[];
  let portraitLayer: Contract;
  let owner: Signer;
  let alice: Signer;
  let minter: Signer;
  let accessories: Contract[];
  const name: string = "Illuvitar Portrait";
  const symbol: string = "ILV-PORT";

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [owner, alice, minter] = accounts;
    const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
    const PortraitLayerFactory = await ethers.getContractFactory("PortraitLayer");

    accessories = [];
    for (let i = 0; AccessoryType.Skin, i <= AccessoryType.Props; i += 1) {
      accessories.push(await upgrades.deployProxy(AccessoryLayerFactory, [name, symbol, await minter.getAddress(), i]));

      await accessories[i]
        .connect(minter)
        .mintMultiple(await alice.getAddress(), 2, [BoxType.Bronze, BoxType.Gold], [0, 3]);
    }
    portraitLayer = await upgrades.deployProxy(PortraitLayerFactory, [
      name,
      symbol,
      await minter.getAddress(),
      accessories.map(item => item.address),
    ]);

    await portraitLayer
      .connect(minter)
      .mintMultiple(await alice.getAddress(), 2, [BoxType.Diamond, BoxType.Platinum], [0, 3]);

    for (let i = 0; AccessoryType.Skin, i <= AccessoryType.Props; i += 1) {
      await accessories[i].connect(alice).approve(portraitLayer.address, 1);
      await accessories[i].connect(alice).approve(portraitLayer.address, 2);
    }
  });

  describe("initializer", () => {
    it("check NFT data", async () => {
      expect(await portraitLayer.name()).to.equal(name);
      expect(await portraitLayer.symbol()).to.equal(symbol);
    });

    it("check minter", async () => {
      expect(await portraitLayer.minter()).to.equal(await minter.getAddress());
    });

    it("check accessories", async () => {
      for (let i = 0; AccessoryType.Skin, i <= AccessoryType.Props; i += 1) {
        expect(await portraitLayer.accessoryIlluvitars(i)).to.equal(accessories[i].address);
      }
    });
  });

  describe("combine", () => {
    const tokenId = 1;

    it("Revert if types and accessoryIds length mismatch", async () => {
      await expect(portraitLayer.combine(tokenId, [], [])).to.revertedWith("Invalid length");
      await expect(portraitLayer.combine(tokenId, [AccessoryType.EyeWear], [])).to.revertedWith("Invalid length");
    });

    it("Revert if not nft owner", async () => {
      await expect(portraitLayer.connect(owner).combine(tokenId, [AccessoryType.EyeWear], [1])).to.revertedWith(
        "ERC721: transfer of token that is not own",
      );
    });

    it("should combine", async () => {
      const tx = await portraitLayer
        .connect(alice)
        .combine(tokenId, [AccessoryType.EyeWear, AccessoryType.Body], [2, 1]);
      await expect(tx).to.emit(portraitLayer, "Combined").withArgs(tokenId, AccessoryType.EyeWear, 2);
      await expect(tx).to.emit(portraitLayer, "Combined").withArgs(tokenId, AccessoryType.Body, 1);
      expect(await portraitLayer.accessories(tokenId, AccessoryType.EyeWear)).to.be.equal(2);
      expect(await portraitLayer.accessories(tokenId, AccessoryType.Body)).to.be.equal(1);
    });

    it("Revert if already combined", async () => {
      await portraitLayer.connect(alice).combine(tokenId, [AccessoryType.EyeWear, AccessoryType.Body], [1, 1]);

      await expect(portraitLayer.connect(alice).combine(tokenId, [AccessoryType.EyeWear], [2])).to.revertedWith(
        "Already combined",
      );
    });
  });
});
