import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";
import { utils } from "ethers";
import { AccessoryLayer } from "../typechain";
import { AccessoryType, BoxType } from "./utils";

describe("AccessoryLayer", () => {
  let accessoryLayer: AccessoryLayer;
  let alice: SignerWithAddress;
  let minter: SignerWithAddress;
  const NAME: string = "Illuvitar Accessory Layer";
  const SYMBOL: string = "ILVA";

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [alice, minter] = accounts;
    const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
    accessoryLayer = (await upgrades.deployProxy(AccessoryLayerFactory, [
      NAME,
      SYMBOL,
      minter.address,
    ])) as AccessoryLayer;
  });

  describe("mint", () => {
    it("mint with metadata", async () => {
      const data = utils.defaultAbiCoder.encode(
        ["uint8", "uint8", "uint8"],
        [BoxType.Diamond, 2, AccessoryType.EyeWear],
      );
      await accessoryLayer.connect(minter).mintFor(alice.address, 1, data);
      const metadata = await accessoryLayer.metadata(1);

      expect(metadata.boxType).to.equal(BoxType.Diamond);
      expect(metadata.tier).to.equal(2);
      expect(await accessoryLayer.accessoryTypes(1)).to.equal(AccessoryType.EyeWear);
    });
  });
});
