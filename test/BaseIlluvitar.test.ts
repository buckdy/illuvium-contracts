import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer, constants } from "ethers";

describe("AccessoryLayer", () => {
  let accounts: Signer[];
  let accessoryLayer: Contract;
  let owner: Signer;
  let alice: Signer;
  let bob: Signer;
  const name: string = "BodyAccessory";
  const symbol: string = "BodyA";
  let minter: Signer;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [owner, alice, bob, minter] = accounts;
    const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
    accessoryLayer = await upgrades.deployProxy(AccessoryLayerFactory, [name, symbol, await minter.getAddress()]);
  });

  describe("initializer", () => {
    it("check name", async () => {
      expect(await accessoryLayer.name()).to.equal(name);
    });

    it("check symbol", async () => {
      expect(await accessoryLayer.symbol()).to.equal(symbol);
    });

    it("check minter", async () => {
      expect(await accessoryLayer.minter()).to.equal(await minter.getAddress());
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

    it("set minter", async () => {
      const tx = await accessoryLayer.connect(owner).setMinter(await bob.getAddress());
      expect(await accessoryLayer.connect(owner).minter()).to.equal(await bob.getAddress());
      await expect(tx)
        .to.emit(accessoryLayer, "MinterUpdated")
        .withArgs(await bob.getAddress());
    });
  });

  describe("mintMultiple", () => {
    it("Revert if sender is not minter", async () => {
      await expect(accessoryLayer.connect(alice).mintMultiple(await bob.getAddress(), 3)).to.revertedWith(
        "This is not minter",
      );
    });

    it("mint token", async () => {
      await accessoryLayer.connect(minter).mintMultiple(await bob.getAddress(), 3);
      expect(await accessoryLayer.lastTokenId()).to.equal(3);
    });
  });
});
