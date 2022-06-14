import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { constants, utils, BigNumberish } from "ethers";
import { Minter, VRFCoordinatorMock, LinkToken } from "../typechain";
import { generateRandomAddress, generatePurchaseParams, random_int } from "./utils";
import { doesNotMatch } from "assert";

describe("Minter", () => {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let randomnessFulfiller: SignerWithAddress;
  let vrfCoordinator: VRFCoordinatorMock;
  let linkToken: LinkToken;
  let minterContract: Minter;
  let oracleRegistry: string;

  const keyHash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
  const fee = utils.parseEther("0.0001");

  const portraitSaleDuration = 259200; // 3 days

  const treasury = generateRandomAddress();
  const sILV = generateRandomAddress();

  async function getBlockTimestamp() {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    return blockBefore.timestamp;
  }

  async function deployMinterProxy(
    vrfCoordinator: string,
    linkToken: string,
    keyHash: string,
    fee: BigNumberish,
    treasury: string,
    sILV: string,
    oracleRegistry: string,
  ): Promise<Minter> {
    const MinterFactory = await ethers.getContractFactory("Minter");
    const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");

    const minterImpl = await MinterFactory.deploy();
    const minterData = await MinterFactory.interface.encodeFunctionData("initialize", [
      vrfCoordinator,
      linkToken,
      keyHash,
      fee,
      treasury,
      sILV,
      oracleRegistry,
    ]);
    const minterProxy = await ProxyFactory.deploy(minterImpl.address, minterData);
    minterContract = MinterFactory.attach(minterProxy.address);
    return minterContract;
  }

  beforeEach(async () => {
    [owner, alice, randomnessFulfiller] = await ethers.getSigners();
    const LinkTokenFactory = await ethers.getContractFactory("LinkToken");
    const VRFCoordinatorMockFactory = await ethers.getContractFactory("VRFCoordinatorMock");
    const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
    const ChainlinkAggregatorMockFactory = await ethers.getContractFactory("ChainlinkAggregatorV3Mock");
    const IlluvitarsPriceOracleFactory = await ethers.getContractFactory("IlluvitarsPriceOracleV1");

    linkToken = await LinkTokenFactory.deploy();
    vrfCoordinator = await VRFCoordinatorMockFactory.deploy(linkToken.address);
    const chainlinkAggregatorMock = await ChainlinkAggregatorMockFactory.deploy();
    const illuvitarsPriceOracleImpl = await IlluvitarsPriceOracleFactory.deploy();
    const illuvitarsPriceOracleData = await IlluvitarsPriceOracleFactory.interface.encodeFunctionData("initialize", [
      chainlinkAggregatorMock.address,
    ]);
    const illuvitarsPriceOracleProxy = await ProxyFactory.deploy(
      illuvitarsPriceOracleImpl.address,
      illuvitarsPriceOracleData,
    );
    oracleRegistry = illuvitarsPriceOracleProxy.address;

    minterContract = await deployMinterProxy(
      vrfCoordinator.address,
      linkToken.address,
      keyHash,
      fee,
      treasury,
      sILV,
      oracleRegistry,
    );

    await linkToken.transfer(minterContract.address, 10 ** 15);
  });

  describe("initialize", async () => {
    it("Revert if zero address", async () => {
      await expect(
        deployMinterProxy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          constants.AddressZero,
          sILV,
          oracleRegistry,
        ),
      ).to.revertedWith("cannot zero address");

      await expect(
        deployMinterProxy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          treasury,
          constants.AddressZero,
          oracleRegistry,
        ),
      ).to.revertedWith("cannot zero address");

      await expect(
        deployMinterProxy(
          vrfCoordinator.address,
          linkToken.address,
          keyHash,
          fee,
          treasury,
          sILV,
          constants.AddressZero,
        ),
      ).to.revertedWith("cannot zero address");
    });

    it("should set properly", async () => {
      expect(await minterContract.illuvitarsPriceOracle()).to.equal(oracleRegistry);
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
      const newTreasury = "0xA4e47B38415201d4c8aB42711892A31C7B06bdE9";
      await minterContract.connect(owner).setTreasury(newTreasury);
      expect(await minterContract.treasury()).to.equal(newTreasury);
    });
  });

  describe("purchasing illuvitars", () => {
    beforeEach(async () => {
      const blockTimestamp = await getBlockTimestamp();
      await minterContract.setPortraitSaleWindow({
        start: blockTimestamp,
        end: blockTimestamp + portraitSaleDuration,
      });
    });
    it("purchase an item, fulfill randomness and get minting results", async () => {
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams();

      const txResponse = await minterContract
        .connect(alice)
        .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
          value: etherPrice,
        });

      const events = (await txResponse.wait()).events ?? [];
      expect(events?.length).to.be.greaterThan(0);

      const requester = events[events.length - 1].args?.requester;
      const requestId = events[events.length - 1].args?.requestId;

      expect(requester).to.be.equal(await alice.getAddress());

      const randomNumber = random_int(1, 50000);
      await expect(vrfCoordinator.callBackWithRandomness(requestId, randomNumber, minterContract.address))
        .to.emit(minterContract, "RequestFulfilled")
        .withArgs(requestId, randomNumber);

      await minterContract.getMintResult(requestId, { gasLimit: constants.MaxUint256 });
    });
  });
});
