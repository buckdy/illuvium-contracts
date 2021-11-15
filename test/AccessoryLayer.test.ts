import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer } from "ethers";

describe("AccessoryLayer", () => {
  let accounts: Signer[];
  let accessoryLayer: Contract;
  let minter: Signer;
  const name: string = "BodyAccessory";
  const symbol: string = "BodyA";

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [minter] = accounts;
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
});
