import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { constants, utils } from "ethers";
import { AccessoryLayer } from "../typechain";
import { BoxType, AccessoryType } from "./utils";

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

  describe("initializer", () => {
    it("check initialized data", async () => {
      expect(await baseIlluvitar.name()).to.equal(NAME);
      expect(await baseIlluvitar.symbol()).to.equal(SYMBOL);
      expect(await baseIlluvitar.minter()).to.equal(minter.address);
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

      const data = utils.defaultAbiCoder.encode(
        ["uint8", "uint8", "uint8"],
        [BoxType.Diamond, 2, AccessoryType.EyeWear],
      );
      await baseIlluvitar.connect(minter).mintFor(alice.address, 1, data);

      expect(await baseIlluvitar.tokenURI("1")).to.be.equal("https://illuvium.io/1");
    });
  });

  describe("mintFor", () => {
    const data = utils.defaultAbiCoder.encode(["uint8", "uint8", "uint8"], [BoxType.Diamond, 2, AccessoryType.EyeWear]);

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
});
