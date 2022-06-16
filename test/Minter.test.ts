import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, constants, utils, BigNumberish, BigNumber } from "ethers";
import {
  Minter,
  VRFCoordinatorMock,
  LinkToken,
  ERC20Mock,
  IlluvitarsPriceOracle__factory,
  UUPSUpgradeable,
} from "../typechain";
import {
  generateRandomAddress,
  generatePurchaseParams,
  random_int,
  random_bn256,
  random_bytes,
  random_element,
} from "./utils";

describe("Minter", () => {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let randomnessFulfiller: SignerWithAddress;
  let vrfCoordinator: VRFCoordinatorMock;
  let linkToken: LinkToken;
  let minterContract: Minter;
  let sIlvMock: ERC20Mock;
  let oracleRegistry: string;

  const keyHash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
  const fee = utils.parseEther("0.0001");

  const portraitSaleDuration = 259200; // 3 days

  const treasury = generateRandomAddress();

  async function getBlockTimestamp() {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    return blockBefore.timestamp;
  }

  async function deploy(contractName: string, args: any[]): Promise<Contract> {
    const Factory = await ethers.getContractFactory(contractName);
    return await Factory.deploy(...args);
  }

  async function deployProxy(contractName: string, args: any[]): Promise<Contract> {
    const Factory = await ethers.getContractFactory(contractName);
    const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");

    const impl = await Factory.deploy();
    const data = Factory.interface.encodeFunctionData("initialize", args);
    const proxy = await ProxyFactory.deploy(impl.address, data);
    return Factory.attach(proxy.address);
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
    return (await deployProxy("Minter", [
      vrfCoordinator,
      linkToken,
      keyHash,
      fee,
      treasury,
      sILV,
      oracleRegistry,
    ])) as Minter;
  }

  beforeEach(async () => {
    [owner, alice, randomnessFulfiller] = await ethers.getSigners();

    linkToken = (await deploy("LinkToken", [])) as LinkToken;
    vrfCoordinator = (await deploy("VRFCoordinatorMock", [linkToken.address])) as VRFCoordinatorMock;
    const chainlinkAggregatorMock = await deploy("ChainlinkAggregatorV3Mock", []);
    sIlvMock = (await deploy("ERC20Mock", ["Escrowed Illuvium Mock", "sILV2"])) as ERC20Mock;
    oracleRegistry = (await deployProxy("IlluvitarsPriceOracleV1", [chainlinkAggregatorMock.address])).address;

    minterContract = await deployMinterProxy(
      vrfCoordinator.address,
      linkToken.address,
      keyHash,
      fee,
      treasury,
      sIlvMock.address,
      oracleRegistry,
    );

    await linkToken.transfer(minterContract.address, BigNumber.from(10).pow(27));
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
          sIlvMock.address,
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
          sIlvMock.address,
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

  describe("wrong randomness fulfillment", () => {
    let minterWithMockedVRFCoordinator: Minter;
    beforeEach(async () => {
      const linkToken = (await deploy("LinkToken", [])) as LinkToken;
      minterWithMockedVRFCoordinator = await deployMinterProxy(
        await owner.getAddress(), // `owner` is the `VRFCoordinator`
        linkToken.address,
        keyHash,
        fee,
        treasury,
        sIlvMock.address,
        oracleRegistry,
      );

      const blockTimestamp = await getBlockTimestamp();
      await minterWithMockedVRFCoordinator.setPortraitSaleWindow({
        start: blockTimestamp,
        end: blockTimestamp + portraitSaleDuration,
      });

      await linkToken.transfer(minterWithMockedVRFCoordinator.address, BigNumber.from(10).pow(27));
    });

    it("revert if randomness is fulfilled for a non-purchased mint request", async () => {
      const requestId = random_bytes(32);
      let randomNumber = random_bn256();
      randomNumber = randomNumber.eq("0") ? randomNumber.add("1") : randomNumber;

      await expect(minterWithMockedVRFCoordinator.rawFulfillRandomness(requestId, randomNumber)).to.be.revertedWith(
        "No request exist",
      );
    });

    it("revert if randomness is fulfilled more than once to the same mint request", async () => {
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams();

      const txResponse = await minterWithMockedVRFCoordinator
        .connect(alice)
        .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
          value: etherPrice,
        });

      const events = (await txResponse.wait()).events ?? [];
      expect(events?.length).to.be.greaterThan(0);

      const requestId = events[events.length - 1].args?.requestId;

      let randomNumber = random_bn256();
      randomNumber = randomNumber.eq("0") ? randomNumber.add("1") : randomNumber;

      await minterWithMockedVRFCoordinator.rawFulfillRandomness(requestId, randomNumber);

      await expect(minterWithMockedVRFCoordinator.rawFulfillRandomness(requestId, randomNumber)).to.be.revertedWith(
        "Random number already fulfilled",
      );
    });
  });

  describe("purchasing illuvitars", () => {
    async function testPurchase(
      purchaser: SignerWithAddress,
      randomnessFulfiller: SignerWithAddress,
      useSIlv: boolean,
      sIlvMock?: ERC20Mock,
    ): Promise<void> {
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams();

      let sIlvPrice;
      let treasuryPreviousBalance = BigNumber.from(0);
      if (useSIlv) {
        if (!sIlvMock) throw "sIlvMock contract needs to be provided";
        const illuvitarsPriceOracle = IlluvitarsPriceOracle__factory.connect(
          await minterContract.illuvitarsPriceOracle(),
          purchaser,
        );
        sIlvPrice = await illuvitarsPriceOracle.ethToIlv(etherPrice);
        try {
          await sIlvMock.mint(await purchaser.getAddress(), sIlvPrice);
        } catch (err) {
          throw "Full access mint function is required on sILVMock contract";
        }
        await sIlvMock.connect(purchaser).approve(minterContract.address, sIlvPrice);
        treasuryPreviousBalance = treasuryPreviousBalance.add(
          await sIlvMock.balanceOf(await minterContract.treasury()),
        );
      }

      const txResponse = await minterContract
        .connect(purchaser)
        .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, useSIlv, {
          value: useSIlv ? 0 : etherPrice,
        });

      if (useSIlv) {
        const treasuryBalanceDelta = (await sIlvMock?.balanceOf(await minterContract.treasury()))?.sub(
          treasuryPreviousBalance,
        );
        expect(treasuryBalanceDelta).to.be.equal(sIlvPrice);
        expect(await sIlvMock?.balanceOf(await purchaser.getAddress())).to.be.equal("0");
      }

      const events = (await txResponse.wait()).events ?? [];
      expect(events?.length).to.be.greaterThan(0);

      const requester = events[events.length - 1].args?.requester;
      const requestId = events[events.length - 1].args?.requestId;

      expect(requester).to.be.equal(await purchaser.getAddress());

      let randomNumber = random_bn256();
      randomNumber = randomNumber.eq("0") ? randomNumber.add("1") : randomNumber;
      await expect(
        vrfCoordinator
          .connect(randomnessFulfiller)
          .callBackWithRandomness(requestId, randomNumber, minterContract.address),
      )
        .to.emit(minterContract, "RequestFulfilled")
        .withArgs(requestId, randomNumber.toString());

      // TODO: Need to verify this result somehow (compare with JS implementation?)
      await minterContract.getMintResult(requestId, { gasLimit: constants.MaxUint256 });
    }
    beforeEach(async () => {
      const blockTimestamp = await getBlockTimestamp();
      await minterContract.setPortraitSaleWindow({
        start: blockTimestamp,
        end: blockTimestamp + portraitSaleDuration,
      });
    });

    it("try to purchase without setting the `portrait portraitSaleWindow`", async () => {
      const currentBlockTimeStamp = BigNumber.from(await getBlockTimestamp());
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams();

      await minterContract.setPortraitSaleWindow({
        start: currentBlockTimeStamp.add(10),
        end: currentBlockTimeStamp.add(20),
      });

      await expect(
        minterContract
          .connect(alice)
          .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
            value: etherPrice,
          }),
      ).to.be.revertedWith("Sale not started or ended");

      await network.provider.send("evm_setNextBlockTimestamp", [currentBlockTimeStamp.add(20).toNumber()]);
      await network.provider.send("evm_mine");

      await expect(
        minterContract
          .connect(alice)
          .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
            value: etherPrice,
          }),
      ).to.be.revertedWith("Sale not started or ended");
    });

    it("should revert when `_saleWindow.start >= _saleWindow.end`", async () => {
      const saleWindowStart = random_bn256().mod(BigNumber.from(2).pow(64).sub(1));
      const saleWindowEnd = saleWindowStart.eq(0) ? saleWindowStart : random_bn256().mod(saleWindowStart);

      await expect(
        minterContract.setPortraitSaleWindow({
          start: saleWindowStart,
          end: saleWindowEnd,
        }),
      ).to.be.revertedWith("Invalid sale window");
    });

    it("only VRFCoordinator can fulfill randomness", async () => {
      const requestId = random_bytes(32);
      let randomNumber = random_bn256();
      randomNumber = randomNumber.eq("0") ? randomNumber.add("1") : randomNumber;

      await expect(minterContract.rawFulfillRandomness(requestId, randomNumber)).to.be.revertedWith(
        "Only VRFCoordinator can fulfill",
      );
    });

    it("purchase only Accessories", async () => {
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams(0, 0);

      const txResponse = await minterContract
        .connect(alice)
        .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
          value: etherPrice,
        });

      const events = (await txResponse.wait()).events ?? [];
      expect(events?.length).to.be.greaterThan(0);

      const requestId = events[events.length - 1].args?.requestId;

      let randomNumber = random_bn256();
      randomNumber = randomNumber.eq("0") ? randomNumber.add("1") : randomNumber;
      await expect(
        vrfCoordinator
          .connect(randomnessFulfiller)
          .callBackWithRandomness(requestId, randomNumber, minterContract.address),
      )
        .to.emit(minterContract, "RequestFulfilled")
        .withArgs(requestId, randomNumber.toString());

      // TODO: Need to verify this result somehow (compare with JS implementation?)
      await minterContract.getMintResult(requestId, { gasLimit: constants.MaxUint256 });
    });

    it("purchase only Portrait", async () => {
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams(undefined, undefined, 0, 0, 0, 0);

      const txResponse = await minterContract
        .connect(alice)
        .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
          value: etherPrice,
        });

      const events = (await txResponse.wait()).events ?? [];
      expect(events?.length).to.be.greaterThan(0);

      const requestId = events[events.length - 1].args?.requestId;

      let randomNumber = random_bn256();
      randomNumber = randomNumber.eq("0") ? randomNumber.add("1") : randomNumber;
      await expect(
        vrfCoordinator
          .connect(randomnessFulfiller)
          .callBackWithRandomness(requestId, randomNumber, minterContract.address),
      )
        .to.emit(minterContract, "RequestFulfilled")
        .withArgs(requestId, randomNumber.toString());

      // TODO: Need to verify this result somehow (compare with JS implementation?)
      await minterContract.getMintResult(requestId, { gasLimit: constants.MaxUint256 });
    });

    it("revert when portrait mint amount is ZERO", async () => {
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams();

      random_element(portraitMintParams).amount = 0;

      await expect(
        minterContract
          .connect(alice)
          .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
            value: etherPrice,
          }),
      ).to.be.revertedWith("Invalid amount");
    });

    it("revert when semi-random accessory mint amount is ZERO", async () => {
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams();

      random_element(accessorySemiRandomMintParams).amount = 0;

      await expect(
        minterContract
          .connect(alice)
          .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
            value: etherPrice,
          }),
      ).to.be.revertedWith("Invalid amount");
    });

    it("purchasing only virtual items should have ZERO etherPrice", async () => {
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams(undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);

      const txResponse = await minterContract
        .connect(alice)
        .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
          value: etherPrice,
        });

      const events = (await txResponse.wait()).events ?? [];
      expect(events?.length).to.be.greaterThan(0);

      const requestId = events[events.length - 1].args?.requestId;

      let randomNumber = random_bn256();
      randomNumber = randomNumber.eq("0") ? randomNumber.add("1") : randomNumber;
      await expect(
        vrfCoordinator
          .connect(randomnessFulfiller)
          .callBackWithRandomness(requestId, randomNumber, minterContract.address),
      )
        .to.emit(minterContract, "RequestFulfilled")
        .withArgs(requestId, randomNumber.toString());

      // TODO: Need to verify this result somehow (compare with JS implementation?)
      await minterContract.getMintResult(requestId, { gasLimit: constants.MaxUint256 });
    });

    it("amount of ethers sent should be equal to etherPrice", async () => {
      const { portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, etherPrice } =
        generatePurchaseParams();

      await expect(
        minterContract
          .connect(alice)
          .purchase(portraitMintParams, accessorySemiRandomMintParams, accessoryFullRandomMintParams, false, {
            value: random_bn256().mod(etherPrice),
          }),
      ).to.be.revertedWith("Invalid price");
    });

    it("revert when getting mint results for unfulfilled randomness requests", async () => {
      const requestId = random_bn256().toHexString();
      await expect(minterContract.getMintResult(requestId, { gasLimit: constants.MaxUint256 })).to.be.revertedWith(
        "No random number generated",
      );
    });

    // Buy with ETH
    it("purchase an item, fulfill randomness and get minting results (ETH)", async () => {
      for (let i = 0; i < 100; i++) {
        await testPurchase(alice, randomnessFulfiller, false);
      }
    });

    // Buy with sILV2
    it("purchase an item, fulfill randomness and get minting results (sILV2)", async () => {
      for (let i = 0; i < 100; i++) {
        await testPurchase(alice, randomnessFulfiller, true, sIlvMock);
      }
    });
  });

  describe("proxy functionalities", () => {
    it("upgrade contract", async () => {
      const newImpl = await deploy("Minter", []);
      await expect((<UUPSUpgradeable>minterContract).upgradeTo(newImpl.address))
        .to.emit(minterContract, "Upgraded")
        .withArgs(newImpl.address);
    });
  });
});
