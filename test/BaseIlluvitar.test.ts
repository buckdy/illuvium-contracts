import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { constants, utils } from "ethers";
import { BaseIlluvitar } from "../typechain";
import { BoxType, AccessoryType } from "./utils";

describe("BaseIlluvitar", () => {
  let baseIlluvitar: BaseIlluvitar;
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
    ])) as BaseIlluvitar;
  });

  describe("initializer", () => {
    it("check initialized data", async () => {
      expect(await baseIlluvitar.name()).to.equal(NAME);
      expect(await baseIlluvitar.symbol()).to.equal(SYMBOL);
      expect(await baseIlluvitar.minter()).to.equal(minter.address);
    });
  });

  describe("setMinter", () => {
    it("Revert if not owner", async () => {
      await expect(baseIlluvitar.connect(alice).setMinter(alice.address)).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Revert if minter is zero", async () => {
      await expect(baseIlluvitar.connect(owner).setMinter(constants.AddressZero)).to.revertedWith("Minter cannot zero");
    });

    it("set minter by owner", async () => {
      const tx = await baseIlluvitar.connect(owner).setMinter(alice.address);
      expect(await baseIlluvitar.connect(owner).minter()).to.equal(alice.address);
      await expect(tx).to.emit(baseIlluvitar, "MinterUpdated").withArgs(alice.address);
    });
  });

  describe("setBaseUri", () => {
    it("Revert if not owner", async () => {
      await expect(baseIlluvitar.connect(alice).setBaseUri("https://illuvium.io/")).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("set baseUri by owner", async () => {
      await baseIlluvitar.connect(owner).setBaseUri("https://illuvium.io/");

      const data = utils.defaultAbiCoder.encode(
        ["uint8", "uint8", "uint8"],
        [BoxType.Diamond, 2, AccessoryType.EyeWear],
      );
      await baseIlluvitar.connect(minter).mint(alice.address, data);

      expect(await baseIlluvitar.tokenURI("1")).to.be.equal("https://illuvium.io/1");
    });
  });
});
