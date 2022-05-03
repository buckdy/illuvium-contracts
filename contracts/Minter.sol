// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "./DataTypes.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/IOracleRegistry.sol";

/**
    @title Minter, this contract is inherited from chainlink VRFConsumerBase,
    this contract contains purchase function which users interact to mint several base or accessory illuvitars.
    @author Dmitry Yakovlevich
 */

contract Minter is VRFConsumerBase, Ownable {
    using SafeERC20 for IERC20;

    event TreasurySet(address indexed treasury);
    event OracleRegistrySet(address indexed oracleRegistry);
    event RequestFulfilled(bytes32 indexed requestId, uint256 randomNumber);

    /**
     * @notice event emitted random accessory requested.
     * @dev emitted in {purchase} or {requestRandomAgain} function.
     * @param requester requester address.
     * @param requestId requestId number.
     */
    event MintRequested(address indexed requester, bytes32 requestId, MintRequest mintRequest);

    //Purchase Body struct
    struct PortraitMintParams {
        BoxType boxType;
        uint64 amount;
    }

    //Purchase Accessory struct
    struct AccessorySemiRandomMintParams {
        AccessoryType accessoryType;
        BoxType boxType;
        uint64 amount;
    }

    struct AccessoryFullRandomMintParams {
        BoxType boxType;
        uint64 amount;
    }

    //Purchase RandomAccessory struct
    struct MintRequest {
        address requester;
        PortraitMintParams[] portraitMintParams;
        AccessorySemiRandomMintParams[] accessorySemiRandomMintParams;
        AccessoryFullRandomMintParams[] accessoryFullRandomMintParams;
        uint256 randomNumber;
    }

    struct PortraitInfo {
        BoxType boxType;
        uint8 tier;
        uint256 rand;
    }

    struct AccessoryInfo {
        BoxType boxType;
        AccessoryType accessoryType;
        uint8 tier;
    }

    struct PortraitMintInfo {
        uint256 price;
        uint16[6] tierChances;
    }

    struct AccessoryMintInfo {
        uint256 randomPrice;
        uint256 semiRandomPrice;
        uint16[6] tierChances;
    }

    address private constant ETHER_ADDRESS = address(0x0000000000000000000000000000000000000000);
    uint16 public constant MAX_TIER_CHANCE = 10000;
    uint8 public constant TIER_COUNT = 6;

    mapping(BoxType => PortraitMintInfo) public portraitMintInfo;
    mapping(BoxType => AccessoryMintInfo) public accessoryMintInfo;

    mapping(bytes32 => MintRequest) public mintRequests;

    address public treasury;
    address public weth;
    address public oracleRegistry;
    bytes32 public vrfKeyHash;
    uint256 public vrfFee;

    /**
     * @notice Constructor.
     * @param _vrfCoordinator Chainlink VRF Coordinator address.
     * @param _linkToken LINK token address.
     * @param _vrfKeyhash Key Hash.
     * @param _vrfFee Fee.
     * @param _treasury Treasury Address.
     * @param _weth WETH Address.
     * @param _oracleRegistry IlluviumOracleRegistry Address.
     */
    constructor(
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _vrfKeyhash,
        uint256 _vrfFee,
        address _treasury,
        address _weth,
        address _oracleRegistry
    ) VRFConsumerBase(_vrfCoordinator, _linkToken) {
        require(_treasury != address(0), "cannot zero address");

        vrfKeyHash = _vrfKeyhash;
        vrfFee = _vrfFee;

        emit TreasurySet(_treasury);
        treasury = _treasury;
        weth = _weth;
        oracleRegistry = _oracleRegistry;

        _initializePortraitMintInfo();
        _initializeAccessoryMintInfo();
    }

    /**
     * @notice setFunction for Treasury Address.
     * @dev only owner can call this function.
     * @param treasury_ Treasury Address.
     */
    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "Treasury address cannot zero");
        treasury = treasury_;

        emit TreasurySet(treasury_);
    }

    /**
     * @notice setFunction for OracleRegistry Address.
     * @dev only owner can call this function.
     * @param oracleRegistry_ OracleRegistry Address.
     */
    function setOracleRegistry(address oracleRegistry_) external onlyOwner {
        oracleRegistry = oracleRegistry_;

        emit OracleRegistrySet(oracleRegistry_);
    }

    /**
     * @notice Mint for random accessory, callback for VRFConsumerBase
     * @dev inaccessible from outside
     * @param requestId requested random accesory Id.
     * @param randomNumber Random Number.
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomNumber) internal override {
        require(mintRequests[requestId].requester != address(0), "No request exist");
        require(mintRequests[requestId].randomNumber == 0, "Random number already fulfilled");

        mintRequests[requestId].randomNumber = randomNumber;

        emit RequestFulfilled(requestId, randomNumber);
    }

    /**
     * @notice Mint for Portrait and Accesory items. Users will send ETH or sILV to mint itmes
     * @param portraitMintParams portrait layer mint params.
     * @param accessorySemiRandomMintParams accessory layer semi random mint params.
     * @param accessoryFullRandomMintParams accessory layer full random mint params.
     * @param paymentToken payment token address.
     */
    function purchase(
        PortraitMintParams[] calldata portraitMintParams,
        AccessorySemiRandomMintParams[] calldata accessorySemiRandomMintParams,
        AccessoryFullRandomMintParams[] calldata accessoryFullRandomMintParams,
        address paymentToken
    ) external payable {
        uint256 etherPrice;

        bytes32 requestId = requestRandomness(vrfKeyHash, vrfFee);

        MintRequest storage mintRequest = mintRequests[requestId];
        require(mintRequest.requester == address(0), "Already requested");
        mintRequest.requester = _msgSender();

        uint256 length = portraitMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            PortraitMintParams memory param = portraitMintParams[i];
            require(param.amount > 0, "Invalid amount");
            etherPrice += uint256(param.amount) * portraitMintInfo[param.boxType].price;
            mintRequest.portraitMintParams.push(param);
        }

        length = accessorySemiRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            AccessorySemiRandomMintParams memory param = accessorySemiRandomMintParams[i];
            require(param.amount > 0, "Invalid amount");
            etherPrice += uint256(param.amount) * accessoryMintInfo[param.boxType].semiRandomPrice;
            mintRequest.accessorySemiRandomMintParams.push(param);
        }

        length = accessoryFullRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            AccessoryFullRandomMintParams memory param = accessoryFullRandomMintParams[i];
            etherPrice += uint256(param.amount) * accessoryMintInfo[param.boxType].randomPrice;
            mintRequest.accessoryFullRandomMintParams.push(param);
        }

        if (paymentToken == ETHER_ADDRESS) {
            require(msg.value == etherPrice, "Invalid price");
            payable(treasury).transfer(etherPrice);
        } else {
            IOracle oracle = IOracle(IOracleRegistry(oracleRegistry).getOracle(weth, paymentToken));
            oracle.update();
            uint256 tokenAmount = oracle.consult(weth, etherPrice);
            require(tokenAmount > 0, "Invalid price");
            IERC20(paymentToken).safeTransferFrom(_msgSender(), treasury, tokenAmount);
        }

        emit MintRequested(_msgSender(), requestId, mintRequests[requestId]);
    }

    function getMintResult(bytes32 requestId)
        external
        view
        returns (
            address requestor,
            uint256 seed,
            PortraitInfo[] memory portraits,
            AccessoryInfo[] memory accessories
        )
    {
        require(mintRequests[requestId].randomNumber != 0, "No random number generated");
        MintRequest memory mintRequest = mintRequests[requestId];
        requestor = mintRequest.requester;
        seed = mintRequest.randomNumber;

        uint256 rand = seed;
        if (mintRequest.portraitMintParams.length > 0) {
            (portraits, rand) = _getPortraitsInfo(rand, mintRequest.portraitMintParams);
        }

        if (
            mintRequest.accessoryFullRandomMintParams.length > 0 || mintRequest.accessorySemiRandomMintParams.length > 0
        ) {
            accessories = _getAccessoriesInfo(
                rand,
                mintRequest.accessoryFullRandomMintParams,
                mintRequest.accessorySemiRandomMintParams
            );
        }
    }

    function _getPortraitsInfo(uint256 seed, PortraitMintParams[] memory portraitMintParams)
        internal
        view
        returns (PortraitInfo[] memory portraits, uint256 lastRand)
    {
        uint256 portraitAmount;

        uint256 length = portraitMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            portraitAmount += portraitMintParams[i].amount;
        }

        uint256 rand = seed;
        if (portraitAmount > 0) {
            portraits = new PortraitInfo[](portraitAmount);

            for (uint256 i = 0; i < length; i += 1) {
                uint256 amount = portraitMintParams[i].amount;
                for (uint256 j = 0; j < amount; j += 1) {
                    rand = uint256(keccak256(abi.encode(rand, rand)));
                    uint16 chance = uint16(rand % MAX_TIER_CHANCE);
                    uint16[6] memory tierChances = portraitMintInfo[portraitMintParams[i].boxType].tierChances;
                    for (uint8 k = 0; k < TIER_COUNT; k += 1) {
                        if (tierChances[k] > chance) {
                            portraits[i] = PortraitInfo({
                                boxType: portraitMintParams[i].boxType,
                                tier: k,
                                rand: rand / MAX_TIER_CHANCE
                            });
                            break;
                        }
                    }
                }
            }
        }
        lastRand = rand;
    }

    function _getAccessoriesInfo(
        uint256 seed,
        AccessoryFullRandomMintParams[] memory fullRandomMintParams,
        AccessorySemiRandomMintParams[] memory semiRandomMintParams
    ) internal view returns (AccessoryInfo[] memory accessories) {
        uint256 fullRandomAmount;
        uint256 semiRandomAmount;
        uint256 length = fullRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            fullRandomAmount += fullRandomMintParams[i].amount;
        }

        length = semiRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            semiRandomAmount += semiRandomMintParams[i].amount;
        }

        uint256 rand = seed;
        if (semiRandomAmount > 0 || fullRandomAmount > 0) {
            accessories = new AccessoryInfo[](semiRandomAmount + fullRandomAmount);

            for (uint256 i = 0; i < length; i += 1) {
                uint256 amount = semiRandomMintParams[i].amount;
                for (uint256 j = 0; j < amount; j += 1) {
                    rand = uint256(keccak256(abi.encode(rand, rand)));
                    uint16 chance = uint16(rand % MAX_TIER_CHANCE);
                    uint16[6] memory tierChances = accessoryMintInfo[semiRandomMintParams[i].boxType].tierChances;
                    for (uint8 k = 0; k < TIER_COUNT; k += 1) {
                        if (tierChances[k] > chance) {
                            accessories[i] = AccessoryInfo({
                                boxType: semiRandomMintParams[i].boxType,
                                accessoryType: semiRandomMintParams[i].accessoryType,
                                tier: k
                            });
                            break;
                        }
                    }
                }
            }

            length = fullRandomMintParams.length;
            for (uint256 i = 0; i < length; i += 1) {
                uint256 amount = fullRandomMintParams[i].amount;
                for (uint256 j = 0; j < amount; j += 1) {
                    rand = uint256(keccak256(abi.encode(rand, rand)));
                    uint16 chance = uint16(rand % MAX_TIER_CHANCE);
                    AccessoryType accessoryType = AccessoryType(uint8((rand / MAX_TIER_CHANCE) % 5));
                    uint16[6] memory tierChances = accessoryMintInfo[fullRandomMintParams[i].boxType].tierChances;
                    for (uint8 k = 0; k < TIER_COUNT; k += 1) {
                        if (tierChances[k] > chance) {
                            accessories[i + semiRandomAmount] = AccessoryInfo({
                                boxType: fullRandomMintParams[i].boxType,
                                accessoryType: accessoryType,
                                tier: k
                            });
                            break;
                        }
                    }
                }
            }
        }
    }

    function fulfillMintRequest(bytes32 requestId) external onlyOwner {
        require(mintRequests[requestId].requester != address(0), "Request does not exist!");
        require(mintRequests[requestId].randomNumber != 0, "Random number not generated");
        delete mintRequests[requestId];
    }

    function _initializePortraitMintInfo() internal {
        portraitMintInfo[BoxType.Virtual] = PortraitMintInfo({ price: 0, tierChances: [10000, 0, 0, 0, 0, 0] });
        portraitMintInfo[BoxType.Bronze] = PortraitMintInfo({
            price: 5e16,
            tierChances: [0, 8000, 9700, 9930, 9980, 10000]
        });
        portraitMintInfo[BoxType.Silver] = PortraitMintInfo({
            price: 10e16,
            tierChances: [0, 6100, 8800, 9700, 9950, 10000]
        });
        portraitMintInfo[BoxType.Gold] = PortraitMintInfo({
            price: 25e16,
            tierChances: [0, 2400, 6600, 8800, 9700, 10000]
        });
        portraitMintInfo[BoxType.Platinum] = PortraitMintInfo({
            price: 75e16,
            tierChances: [0, 500, 2000, 4250, 8250, 10000]
        });
        portraitMintInfo[BoxType.Diamond] = PortraitMintInfo({
            price: 250e16,
            tierChances: [0, 200, 1000, 2500, 5000, 10000]
        });
    }

    function _initializeAccessoryMintInfo() internal {
        accessoryMintInfo[BoxType.Virtual] = AccessoryMintInfo({
            randomPrice: 0,
            semiRandomPrice: 0,
            tierChances: [10000, 0, 0, 0, 0, 0]
        });
        accessoryMintInfo[BoxType.Bronze] = AccessoryMintInfo({
            randomPrice: 5e16,
            semiRandomPrice: 10e16,
            tierChances: [0, 8100, 9200, 9700, 9900, 10000]
        });
        accessoryMintInfo[BoxType.Silver] = AccessoryMintInfo({
            randomPrice: 10e16,
            semiRandomPrice: 20e16,
            tierChances: [0, 3000, 7600, 8800, 9700, 10000]
        });
        accessoryMintInfo[BoxType.Gold] = AccessoryMintInfo({
            randomPrice: 15e16,
            semiRandomPrice: 30e16,
            tierChances: [0, 1500, 4700, 7200, 9000, 10000]
        });
        accessoryMintInfo[BoxType.Platinum] = AccessoryMintInfo({
            randomPrice: 20e16,
            semiRandomPrice: 40e16,
            tierChances: [0, 500, 2000, 5300, 8000, 10000]
        });
        accessoryMintInfo[BoxType.Diamond] = AccessoryMintInfo({
            randomPrice: 25e16,
            semiRandomPrice: 50e16,
            tierChances: [0, 100, 600, 2800, 6000, 10000]
        });
    }
}
