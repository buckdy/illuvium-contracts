import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer, Wallet } from "ethers";

enum Accessory {
  EYE = 0,
  BODY = 1,
  MOUTH = 2,
  HEAD = 3,
}

const generateRandomAddress = () => Wallet.createRandom().address;

describe("PortraitLayer", () => {
  let accounts: Signer[];
  let baseLayer: Contract;
  let eyeAccessory: Contract;
  let bodyAccessory: Contract;
  let owner: Signer;
  let alice: Signer;
  const name: string = "BaseAccessory";
  const symbol: string = "BaseA";
  let minter: Signer;

  const mouth = generateRandomAddress();
  const head = generateRandomAddress();

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [owner, alice, minter] = accounts;
    const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
    const BaseLayerFactory = await ethers.getContractFactory("PortraitLayer");

    eyeAccessory = await upgrades.deployProxy(AccessoryLayerFactory, [name, symbol, await minter.getAddress()]);
    bodyAccessory = await upgrades.deployProxy(AccessoryLayerFactory, [name, symbol, await minter.getAddress()]);
    baseLayer = await upgrades.deployProxy(BaseLayerFactory, [
      name,
      symbol,
      await minter.getAddress(),
      eyeAccessory.address,
      bodyAccessory.address,
      mouth,
      head,
    ]);

    await eyeAccessory.connect(minter).mintMultiple(await alice.getAddress(), 1);
    await bodyAccessory.connect(minter).mintMultiple(await alice.getAddress(), 1);
    await baseLayer.connect(minter).mintMultiple(await alice.getAddress(), 1);
    await eyeAccessory.connect(alice).approve(baseLayer.address, 1);
    await bodyAccessory.connect(alice).approve(baseLayer.address, 1);
  });

  describe("initializer", () => {
    it("check name", async () => {
      expect(await baseLayer.name()).to.equal(name);
    });

    it("check symbol", async () => {
      expect(await baseLayer.symbol()).to.equal(symbol);
    });

    it("check minter", async () => {
      expect(await baseLayer.minter()).to.equal(await minter.getAddress());
    });

    it("check eye accessory", async () => {
      expect(await baseLayer.accessoryIlluvitars(Accessory.EYE)).to.equal(eyeAccessory.address);
    });

    it("check body accessory", async () => {
      expect(await baseLayer.accessoryIlluvitars(Accessory.BODY)).to.equal(bodyAccessory.address);
    });

    it("check mouth accessory", async () => {
      expect(await baseLayer.accessoryIlluvitars(Accessory.MOUTH)).to.equal(mouth);
    });

    it("check head accessory", async () => {
      expect(await baseLayer.accessoryIlluvitars(Accessory.HEAD)).to.equal(head);
    });
  });

  describe("combine", () => {
    const tokenId = 1;

    it("Revert if types and accessoryIds length mismatch", async () => {
      await expect(baseLayer.combine(tokenId, [], [])).to.revertedWith("Invalid length");
      await expect(baseLayer.combine(tokenId, [Accessory.EYE], [])).to.revertedWith("Invalid length");
    });

    it("Revert if not nft owner", async () => {
      await expect(baseLayer.connect(owner).combine(tokenId, [Accessory.EYE], [1])).to.revertedWith(
        "This is not owner",
      );
    });

    it("Revert if already combined", async () => {
      await expect(baseLayer.connect(alice).combine(tokenId, [Accessory.EYE, Accessory.EYE], [1, 1])).to.revertedWith(
        "Already combined",
      );
    });

    it("should combine", async () => {
      const tx = await baseLayer.connect(alice).combine(tokenId, [Accessory.EYE, Accessory.BODY], [1, 1]);
      await expect(tx).to.emit(baseLayer, "Combined").withArgs(tokenId, [Accessory.EYE, Accessory.BODY], [1, 1]);
      const metadata = await baseLayer.getMetadata(tokenId);
      expect(metadata[1]).to.equal(1);
      expect(metadata[2]).to.equal(1);
      expect(metadata[3]).to.equal(0);
      expect(metadata[4]).to.equal(0);
    });
  });
});
