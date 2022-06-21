import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { constants } from "ethers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { AccessoryLayer, UUPSUpgradeable } from "../typechain";
import { makeAccessoryMintingBlob } from "./include/utils";
import { BoxType, AccessoryType } from "./include/types";

describe("BaseIlluvitar", () => {
  let baseIlluvitar: AccessoryLayer;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let minter: SignerWithAddress;
  const NAME: string = "Illuvitar NFT";
  const SYMBOL: string = "ILV-NFT";

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [owner, alice, minter] = accounts;
    const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
    baseIlluvitar = (await upgrades.deployProxy(AccessoryLayerFactory, [
      NAME,
      SYMBOL,
      minter.address,
    ])) as AccessoryLayer;
  });

  describe("markForSale", () => {
    beforeEach(async () => {
      const data = makeAccessoryMintingBlob(1, BoxType.Diamond, 3, AccessoryType.EyeWear);
      await baseIlluvitar.connect(minter).mintFor(await owner.getAddress(), 1, data);
    });

    it("revert if caller is not the token owner", async () => {
      await expect(baseIlluvitar.connect(alice).markForSale("1", true)).to.be.revertedWith("Not token owner");
    });

    it("should emit OpenForSale event", async () => {
      await expect(baseIlluvitar.markForSale("1", true)).to.emit(baseIlluvitar, "OpenForSale").withArgs("1", true);
    });
  });

  describe("initializer", () => {
    it("check initialized data", async () => {
      expect(await baseIlluvitar.name()).to.equal(NAME);
      expect(await baseIlluvitar.symbol()).to.equal(SYMBOL);
      expect(await baseIlluvitar.imxMinter()).to.equal(minter.address);
    });

    it("reverts if `imxMinter` is the ZERO address", async () => {
      const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
      const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
      const impl = await AccessoryLayerFactory.deploy();
      const data = AccessoryLayerFactory.interface.encodeFunctionData("initialize", [
        NAME,
        SYMBOL,
        constants.AddressZero,
      ]);
      await expect(ProxyFactory.deploy(impl.address, data)).to.be.revertedWith("Minter cannot zero");
    });
  });

  describe("setBaseUri", () => {
    it("Revert if not owner", async () => {
      await expect(baseIlluvitar.connect(alice).setBaseUri("https://illuvium.io/")).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("set baseUri by owner", async () => {
      const tx = await baseIlluvitar.connect(owner).setBaseUri("https://illuvium.io/");
      await expect(tx).to.emit(baseIlluvitar, "BaseUriUpdated").withArgs("https://illuvium.io/");

      const data = makeAccessoryMintingBlob(1, BoxType.Diamond, 3, AccessoryType.EyeWear);
      await baseIlluvitar.connect(minter).mintFor(alice.address, 1, data);

      expect(await baseIlluvitar.tokenURI("1")).to.be.equal("https://illuvium.io/1");
    });
  });

  describe("mintFor", () => {
    const data = makeAccessoryMintingBlob(1, BoxType.Diamond, 3, AccessoryType.EyeWear);

    it("Revert if not owner", async () => {
      await expect(baseIlluvitar.connect(alice).mintFor(alice.address, 1, data)).to.revertedWith(
        "caller is not minter",
      );
    });

    it("Revert if amount is not one", async () => {
      await expect(baseIlluvitar.connect(minter).mintFor(alice.address, 2, data)).to.revertedWith("Amount must be 1");
    });

    it("Mint by minter", async () => {
      await baseIlluvitar.connect(minter).mintFor(alice.address, 1, data);

      expect(await baseIlluvitar.ownerOf("1")).to.be.equal(alice.address);
    });
  });

  describe("upgradeTo", async () => {
    let newImpl: AccessoryLayer;

    beforeEach(async () => {
      const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
      newImpl = await AccessoryLayerFactory.deploy();
    });

    it("Implementation address should be updated", async () => {
      await expect((<UUPSUpgradeable>baseIlluvitar).upgradeTo(newImpl.address))
        .to.emit(baseIlluvitar, "Upgraded")
        .withArgs(newImpl.address);
    });
  });
});
