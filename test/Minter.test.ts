import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer, Wallet, constants, utils } from "ethers";

enum Accessory {
  EYE = 0,
  BODY = 1,
  MOUTH = 2,
  HEAD = 3,
}

const generateRandomAddress = () => Wallet.createRandom().address;

describe("Minter", () => {
  let owner: Signer;
  let alice: Signer;
  let minter: Signer;
  let vrfCoordinator: Contract;
  let linkToken: Contract;
  let minterContract: Contract;
  let baseLayer: Contract;
  let eyeLayer: Contract;
  let bodyLayer: Contract;
  let mouthLayer: Contract;
  let headLayer: Contract;

  const keyHash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
  const fee = utils.parseEther("0.0001");

  const treasury = generateRandomAddress();
  const weth = generateRandomAddress();
  const oracleRegistry = generateRandomAddress();

  beforeEach(async () => {
    [owner, alice, minter] = await ethers.getSigners();
    const LinkTokenFactory = await ethers.getContractFactory("LinkToken");
    const VRFCoordinatorMockFactory = await ethers.getContractFactory("VRFCoordinatorMock");
    const AccessoryLayerFactory = await ethers.getContractFactory("AccessoryLayer");
    const BaseLayerFactory = await ethers.getContractFactory("BaseLayer");
    const MinterFactory = await ethers.getContractFactory("Minter");

    eyeLayer = await upgrades.deployProxy(AccessoryLayerFactory, ["Eye", "EYE", await minter.getAddress()]);
    bodyLayer = await upgrades.deployProxy(AccessoryLayerFactory, ["Body", "BODY", await minter.getAddress()]);
    mouthLayer = await upgrades.deployProxy(AccessoryLayerFactory, ["Mouth", "MOUTH", await minter.getAddress()]);
    headLayer = await upgrades.deployProxy(AccessoryLayerFactory, ["Head", "HEAD", await minter.getAddress()]);
    baseLayer = await upgrades.deployProxy(BaseLayerFactory, [
      "Base",
      "BASE",
      await minter.getAddress(),
      eyeLayer.address,
      bodyLayer.address,
      mouthLayer.address,
      headLayer.address,
    ]);

    linkToken = await LinkTokenFactory.deploy();
    vrfCoordinator = await VRFCoordinatorMockFactory.deploy(linkToken.address);
    minterContract = await MinterFactory.deploy(
      vrfCoordinator.address,
      linkToken.address,
      keyHash,
      fee,
      baseLayer.address,
      eyeLayer.address,
      bodyLayer.address,
      mouthLayer.address,
      headLayer.address,
      treasury,
      weth,
      oracleRegistry,
    );

    await baseLayer.setMinter(minterContract.address);
    await eyeLayer.setMinter(minterContract.address);
    await bodyLayer.setMinter(minterContract.address);
    await mouthLayer.setMinter(minterContract.address);
    await headLayer.setMinter(minterContract.address);
    await linkToken.transfer(minterContract.address, 10 ** 15);
  });

  describe("constructor", async () => {
    const MinterFactory = await ethers.getContractFactory("Minter");

    it("Revert if zero address", async () => {
      await expect(
        MinterFactory.deploy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          constants.AddressZero,
          eyeLayer.address,
          bodyLayer.address,
          mouthLayer.address,
          headLayer.address,
          treasury,
          weth,
          oracleRegistry,
        ),
      ).to.revertedWith("cannot zero address");

      await expect(
        MinterFactory.deploy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          baseLayer.address,
          constants.AddressZero,
          bodyLayer.address,
          mouthLayer.address,
          headLayer.address,
          treasury,
          weth,
          oracleRegistry,
        ),
      ).to.revertedWith("cannot zero address");

      await expect(
        MinterFactory.deploy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          baseLayer.address,
          eyeLayer.address,
          constants.AddressZero,
          mouthLayer.address,
          headLayer.address,
          treasury,
          weth,
          oracleRegistry,
        ),
      ).to.revertedWith("cannot zero address");

      await expect(
        MinterFactory.deploy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          baseLayer.address,
          eyeLayer.address,
          bodyLayer.address,
          constants.AddressZero,
          headLayer.address,
          treasury,
          weth,
          oracleRegistry,
        ),
      ).to.revertedWith("cannot zero address");

      await expect(
        MinterFactory.deploy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          baseLayer.address,
          eyeLayer.address,
          bodyLayer.address,
          mouthLayer.address,
          constants.AddressZero,
          treasury,
          weth,
          oracleRegistry,
        ),
      ).to.revertedWith("cannot zero address");

      await expect(
        MinterFactory.deploy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          baseLayer.address,
          eyeLayer.address,
          bodyLayer.address,
          mouthLayer.address,
          headLayer.address,
          constants.AddressZero,
          weth,
          oracleRegistry,
        ),
      ).to.revertedWith("cannot zero address");
    });

    it("should set properly", async () => {
      expect(await minterContract.oracleRegistry()).to.equal(oracleRegistry);
    });
  });

  describe("setTreasury", () => {
    it("Revert if caller is not owner", async () => {
      await expect(minterContract.connect(alice).setTreasury(treasury)).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Revert if zero address", async () => {
      await expect(minterContract.setTreasury(constants.AddressZero)).to.revertedWith("Treasury address cannot zero");
    });

    it("should set treasury", async () => {
      expect(await minterContract.treasury()).to.equal(treasury);
      await minterContract.connect(owner).setTreasury(baseLayer.address);
      expect(await minterContract.treasury()).to.equal(baseLayer.address);
    });
  });

  describe("setBaseLayerPricePerTier", () => {
    it("Revert if caller is not owner", async () => {
      await expect(minterContract.connect(alice).setBaseLayerPricePerTier(0, fee)).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Revert if tier not exist", async () => {
      await expect(minterContract.setBaseLayerPricePerTier(6, fee)).to.revertedWith("only exist 6 tiers");
    });

    it("should set tier price", async () => {
      await minterContract.setBaseLayerPricePerTier(0, fee);
      expect(await minterContract.baseLayerPricePerTier(0)).to.equal(fee);
    });
  });

  describe("setAccessoryPrice", () => {
    it("Revert if caller is not owner", async () => {
      await expect(minterContract.connect(alice).setAccessoryPrice(Accessory.EYE, fee)).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("should set accessory price", async () => {
      await minterContract.setAccessoryPrice(Accessory.EYE, fee);
      expect(await minterContract.accessoryPrice(Accessory.EYE)).to.equal(fee);
    });
  });

  describe("setAccessoryRandomPrice", () => {
    it("Revert if caller is not owner", async () => {
      await expect(minterContract.connect(alice).setAccessoryRandomPrice(fee)).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("should set accessory random price", async () => {
      await minterContract.setAccessoryRandomPrice(fee);
      expect(await minterContract.accessoryRandomPrice()).to.equal(fee);
    });
  });

  describe("setOracleRegistry", () => {
    it("Revert if caller is not owner", async () => {
      await expect(minterContract.connect(alice).setOracleRegistry(oracleRegistry)).to.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("should set oracle registry", async () => {
      expect(await minterContract.oracleRegistry()).to.equal(oracleRegistry);
      await minterContract.setOracleRegistry(treasury);
      expect(await minterContract.oracleRegistry()).to.equal(treasury);
    });
  });

  describe("purchase + fulfillRandomness", () => {
    it("should mint random based and delete requester", async () => {
      await minterContract.setBaseLayerPricePerTier(Accessory.EYE, fee);
      await minterContract.setAccessoryPrice(Accessory.EYE, fee);
      await minterContract.setAccessoryRandomPrice(fee);
      const baseLayerMintParams = [[Accessory.EYE, 1]];
      const accessoryMintParams = [[Accessory.EYE, 1]];
      const tx = await minterContract
        .connect(alice)
        .purchase(baseLayerMintParams, accessoryMintParams, 1, constants.AddressZero, { value: fee.mul(3) });
      const receipt = await tx.wait();
      const requestId = receipt.events[5].data;
      await expect(tx)
        .emit(minterContract, "RandomAccessoryRequested")
        .withArgs(await alice.getAddress(), requestId);
      expect((await minterContract.randomAccessoryRequester(requestId))[0]).to.equal(await alice.getAddress());
      expect(await eyeLayer.balanceOf(await alice.getAddress())).to.equal(1);
      await vrfCoordinator.callBackWithRandomness(requestId, "256", minterContract.address);
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(await eyeLayer.balanceOf(await alice.getAddress())).to.equal(2);
      expect((await minterContract.randomAccessoryRequester(requestId))[0]).to.equal(constants.AddressZero);
    });
  });
});
