import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer } from "ethers";
import { AccessoryType } from "./utils";

describe("AccessoryLayer", () => {
  let accounts: Signer[];
  let accessoryLayer: Contract;
  let minter: Signer;
  const name: string = "Illuvitar Body";
  const symbol: string = "ILV-Body";
  const accessoryType: AccessoryType = AccessoryType.Body;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [minter] = accounts;
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
});
