import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { utils } from "ethers";
import { PortraitLayer } from "../typechain";
import { BoxType, makePortraitMintingBlob } from "./utils";

describe("PortraitLayer", () => {
  let portraitLayer: PortraitLayer;
  let alice: SignerWithAddress;
  let minter: SignerWithAddress;
  const NAME: string = "Illuvitar Portrait";
  const SYMBOL: string = "ILV-PORT";

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [alice, minter] = accounts;
    const PortraitLayerFactory = await ethers.getContractFactory("PortraitLayer");

    portraitLayer = (await upgrades.deployProxy(PortraitLayerFactory, [NAME, SYMBOL, minter.address])) as PortraitLayer;
  });

  describe("mint", () => {
    it("mint with metadata", async () => {
      const data = makePortraitMintingBlob(1, BoxType.Diamond, 3, 20, 31, 42, 53, 68);
      await portraitLayer.connect(minter).mintFor(alice.address, 1, data);
      const metadata = await portraitLayer.metadata(1);

      expect(metadata.boxType).to.equal(BoxType.Diamond);
      expect(metadata.tier).to.equal(3);
      expect(metadata.skinId).to.equal(20);
      expect(metadata.bodyId).to.equal(31);
      expect(metadata.eyeId).to.equal(42);
      expect(metadata.headId).to.equal(53);
      expect(metadata.propsId).to.equal(68);
    });
  });
});
