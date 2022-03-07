import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer, constants } from "ethers";
import { AccessoryType, BoxType } from "./utils";

describe("BaseIlluvitar", () => {
  let accounts: Signer[];
  let accessoryLayer: Contract;
  let owner: Signer;
  let alice: Signer;
  let bob: Signer;
  let minter: Signer;
  const name: string = "Illuvitar Body";
  const symbol: string = "ILV-Body";
  const accessoryType: AccessoryType = AccessoryType.Body;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [owner, alice, bob, minter] = accounts;
    const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
    accessoryLayer = await upgrades.deployProxy(AccessoryLayerFactory, [
      name,
      symbol,
      await minter.getAddress(),
      accessoryType,
    ]);
  });

  describe("initializer", () => {
    it("check initialized data", async () => {
      expect(await accessoryLayer.name()).to.equal(name);
      expect(await accessoryLayer.symbol()).to.equal(symbol);
      expect(await accessoryLayer.minter()).to.equal(await minter.getAddress());
      expect(await accessoryLayer.layerType()).to.equal(accessoryType);
    });
  });

  describe("setMinter", () => {
    it("Revert if not owner", async () => {
      await expect(accessoryLayer.connect(alice).setMinter(await bob.getAddress())).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Revert if minter is zero", async () => {
      await expect(accessoryLayer.connect(owner).setMinter(constants.AddressZero)).to.revertedWith(
        "Minter cannot zero",
      );
    });

    it("set minter by owner", async () => {
      const tx = await accessoryLayer.connect(owner).setMinter(await bob.getAddress());
      expect(await accessoryLayer.connect(owner).minter()).to.equal(await bob.getAddress());
      await expect(tx)
        .to.emit(accessoryLayer, "MinterUpdated")
        .withArgs(await bob.getAddress());
    });
  });

  describe("setBaseUri", () => {
    it("Revert if not owner", async () => {
      await expect(accessoryLayer.connect(alice).setBaseUri("https://illuvium.io/")).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("set baseUri by owner", async () => {
      await accessoryLayer.connect(owner).setBaseUri("https://illuvium.io/");
      await accessoryLayer.connect(minter).mintMultiple(await bob.getAddress(), 1, [BoxType.Diamond], [4]);
      expect(await accessoryLayer.tokenURI("1")).to.be.equal("https://illuvium.io/1");
    });
  });

  describe("mintMultiple", () => {
    const boxTypes = [BoxType.Diamond, BoxType.Bronze, BoxType.Platinum];
    const tiers = [4, 2, 3];

    it("Revert if sender is not minter", async () => {
      await expect(
        accessoryLayer.connect(alice).mintMultiple(await bob.getAddress(), 3, boxTypes, tiers),
      ).to.revertedWith("This is not minter");
    });

    it("mint token", async () => {
      const amount = 3;
      await accessoryLayer.connect(minter).mintMultiple(await bob.getAddress(), 3, boxTypes, tiers);
      expect(await accessoryLayer.lastTokenId()).to.equal(3);
      for (let i = 1; i <= amount; i += 1) {
        expect(await accessoryLayer.ownerOf(i)).to.equal(await bob.getAddress());
        expect(await accessoryLayer.boxTypes(i)).to.equal(boxTypes[i - 1]);
        expect(await accessoryLayer.tiers(i)).to.equal(tiers[i - 1]);
      }
    });
  });
});
