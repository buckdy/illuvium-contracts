// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./chainlink/VRFConsumerBaseUpgradeable.sol";
import "./DataTypes.sol";
import "./interfaces/IAggregator.sol";

/**
 * @title Minter
 * @notice Allow users to request minting Illuvitars.
 * @dev Users can use ETH or sILV to request minting.
 * @dev Minter uses an chainlink VRF to genrate randomness.
 * @author Dmitry Yakovlevich
 */
contract Minter is VRFConsumerBaseUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint16 public constant MAX_TIER_CHANCE = 10000;
    uint8 public constant TIER_COUNT = 6;
    uint8 public constant PORTRAIT_MASK = 6;

    /// @dev Portrait mint information
    mapping(BoxType => PortraitMintInfo) public portraitMintInfo;
    /// @dev Accessory mint information
    mapping(BoxType => AccessoryMintInfo) public accessoryMintInfo;
    /// @dev User's mint requests
    mapping(bytes32 => MintRequest) public mintRequests;
    /// @dev Portrait sale window
    SaleWindow public portraitSaleWindow;

    /// @dev sILV2 token address
    address public sIlv;
    /// @dev treasury address
    address public treasury;
    /// @dev ILV/ETH Chainlink price feed address
    IAggregator public ilvETHAggregator;
    /// @dev chainlink VRF key hash
    bytes32 public vrfKeyHash;
    /// @dev chainlink VRF fee
    uint256 public vrfFee;
    /// @dev Next portrait token id to mint
    uint256 public nextPortraitTokenId;
    /// @dev Next accessory token id to mint
    uint256 public nextAccessoryTokenId;

    /* ======== EVENTS ======== */
    /// @dev Emitted when treasury updated.
    event TreasurySet(address indexed treasury);
    /// @dev Emitted when user request mint.
    event MintRequested(address indexed requester, bytes32 requestId);
    /// @dev Emitted when chainlink fulfilled VRF request.
    event RequestFulfilled(bytes32 indexed requestId, uint256 randomNumber);

    /* ======== STRUCT ======== */
    /// @dev Portrait mint params
    struct PortraitMintParams {
        BoxType boxType; // box type
        uint64 amount; // portrait amount to mint
    }

    /// @dev Accessory semi random mint params
    struct AccessorySemiRandomMintParams {
        AccessoryType accessoryType; // accessory type
        BoxType boxType; // box type
        uint64 amount; // accessory amount to mint
    }

    /// @dev Accessory full random mint params
    struct AccessoryFullRandomMintParams {
        BoxType boxType; // box type
        uint64 amount; // portrait amount to mint
    }

    /// @dev User's mint request data
    struct MintRequest {
        address requester; // requester address
        PortraitMintParams[] portraitMintParams; // portrait mint params
        AccessorySemiRandomMintParams[] accessorySemiRandomMintParams; // accessory semi mint params
        AccessoryFullRandomMintParams[] accessoryFullRandomMintParams; // accessory full mint params
        uint256 randomNumber; // random number from chainlink
        uint256 portraitStartTokenId;
        uint256 accessoryStartTokenId;
    }

    /// @dev Mintable portrait info
    struct PortraitInfo {
        uint256 tokenId; // tokenId
        BoxType boxType; // box type
        uint8 tier; // tier
        uint256 rand; // extra random number to generate another off-chain data
    }

    /// @dev Mintable accessory info
    struct AccessoryInfo {
        uint256 tokenId; // tokenId
        BoxType boxType; // box type
        AccessoryType accessoryType; // accessory type
        uint8 tier; // tier
    }

    /// @dev Portrait price and tier pick chances for each box type
    struct PortraitMintInfo {
        uint256 price; // price
        uint16[6] tierChances; // tier chances
    }

    /// @dev Accessory semi and random price and tier pick chances for each box type
    struct AccessoryMintInfo {
        uint256 randomPrice; // full random price
        uint256 semiRandomPrice; // semi random price
        uint16[6] tierChances; // tier chances
    }

    /// @dev Sale window
    struct SaleWindow {
        uint64 start;
        uint64 end;
    }

    /**
     * @dev UUPSUpgradeable initializer
     * @param _vrfCoordinator Chainlink VRF Coordinator address
     * @param _linkToken LINK token address
     * @param _vrfKeyhash Chainlink VRF Key Hash
     * @param _vrfFee Chainlink VRF Fee
     * @param _treasury Treasury address
     * @param _sIlv sILV2 token address
     * @param _ilvEthAggregator ILV/ETH Chainlink price feed
     */
    function initialize(
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _vrfKeyhash,
        uint256 _vrfFee,
        address _treasury,
        address _sIlv,
        address _ilvEthAggregator
    ) external initializer {
        require(
            _treasury != address(0) && _ilvEthAggregator != address(0) && _sIlv != address(0),
            "cannot zero address"
        );

        __Ownable_init();
        __VRFConsumerBase_init(_vrfCoordinator, _linkToken);

        vrfKeyHash = _vrfKeyhash;
        vrfFee = _vrfFee;
        sIlv = _sIlv;
        treasury = _treasury;
        nextPortraitTokenId = 1;
        nextAccessoryTokenId = 1;

        _initializePortraitMintInfo();
        _initializeAccessoryMintInfo();
    }

    /**
     * @dev Set portrait sale window.
     * @dev only owner can call this function.
     * @param _saleWindow New sale window.
     */
    function setPortraitSaleWindow(SaleWindow calldata _saleWindow) external onlyOwner {
        require(_saleWindow.start < _saleWindow.end, "Invalid sale window");
        portraitSaleWindow = _saleWindow;
    }

    /**
     * @dev Set new treasury address.
     * @dev only owner can call this function.
     * @param treasury_ Treasury Address.
     */
    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "Treasury address cannot zero");
        treasury = treasury_;

        emit TreasurySet(treasury_);
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
     * @dev Request minting Portrait and Accesory NFTs.
     * @notice Users pay ETH or sILV to request minting
     * @param portraitMintParams portrait layer mint params.
     * @param accessorySemiRandomMintParams accessory layer semi random mint params.
     * @param accessoryFullRandomMintParams accessory layer full random mint params.
     * @param useSIlv true to use sILV, false to use ETH.
     */
    function purchase(
        PortraitMintParams[] calldata portraitMintParams,
        AccessorySemiRandomMintParams[] calldata accessorySemiRandomMintParams,
        AccessoryFullRandomMintParams[] calldata accessoryFullRandomMintParams,
        bool useSIlv
    ) external payable {
        uint256 etherPrice;

        bytes32 requestId = requestRandomness(vrfKeyHash, vrfFee);

        MintRequest storage mintRequest = mintRequests[requestId];
        require(mintRequest.requester == address(0), "Already requested");
        mintRequest.requester = msg.sender;

        uint256 length = portraitMintParams.length;
        if (length > 0) {
            require(
                block.timestamp >= portraitSaleWindow.start && block.timestamp >= portraitSaleWindow.end,
                "Sale not started or ended"
            );
        }

        uint256 portraitAmount;
        for (uint256 i = 0; i < length; i += 1) {
            PortraitMintParams memory param = portraitMintParams[i];
            require(param.amount > 0, "Invalid amount");
            etherPrice += uint256(param.amount) * portraitMintInfo[param.boxType].price;
            portraitAmount += uint256(param.amount);
            mintRequest.portraitMintParams.push(param);
        }

        mintRequest.portraitStartTokenId = nextPortraitTokenId;
        nextPortraitTokenId += PORTRAIT_MASK * portraitAmount;

        length = accessorySemiRandomMintParams.length;

        uint256 accessoryAmount;
        for (uint256 i = 0; i < length; i += 1) {
            AccessorySemiRandomMintParams memory param = accessorySemiRandomMintParams[i];
            require(param.amount > 0, "Invalid amount");
            etherPrice += uint256(param.amount) * accessoryMintInfo[param.boxType].semiRandomPrice;
            accessoryAmount += uint256(param.amount);
            mintRequest.accessorySemiRandomMintParams.push(param);
        }

        length = accessoryFullRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            AccessoryFullRandomMintParams memory param = accessoryFullRandomMintParams[i];
            etherPrice += uint256(param.amount) * accessoryMintInfo[param.boxType].randomPrice;
            accessoryAmount += uint256(param.amount);
            mintRequest.accessoryFullRandomMintParams.push(param);
        }

        mintRequest.accessoryStartTokenId = nextAccessoryTokenId;
        nextAccessoryTokenId += accessoryAmount;

        if (etherPrice != 0) {
            if (useSIlv) {
                uint256 tokenAmount = _quoteSIlv(etherPrice);
                IERC20Upgradeable(sIlv).safeTransferFrom(msg.sender, treasury, tokenAmount);
            } else {
                require(msg.value == etherPrice, "Invalid price");
                payable(treasury).transfer(etherPrice);
            }
        }

        emit MintRequested(msg.sender, requestId);
    }

    /**
     * @dev Get mintable portrait and accessory infos with chainlink random number
     * @param requestId Request id of mint request.
     * @return requester Requester address
     * @return seed Seed random number from chainlink
     * @return portraits Mintable portrait on-chain metadata
     * @return accessories Mintable accessory on-chain metadata
     */
    function getMintResult(bytes32 requestId)
        external
        view
        returns (
            address requester,
            uint256 seed,
            PortraitInfo[] memory portraits,
            AccessoryInfo[] memory accessories
        )
    {
        require(mintRequests[requestId].randomNumber != 0, "No random number generated");
        MintRequest memory mintRequest = mintRequests[requestId];
        requester = mintRequest.requester;
        seed = mintRequest.randomNumber;

        uint256 rand = seed;
        if (mintRequest.portraitMintParams.length > 0) {
            (portraits, rand) = _getPortraitsInfo(
                rand,
                mintRequest.portraitMintParams,
                mintRequest.portraitStartTokenId
            );
        }

        if (
            mintRequest.accessoryFullRandomMintParams.length > 0 || mintRequest.accessorySemiRandomMintParams.length > 0
        ) {
            accessories = _getAccessoriesInfo(
                rand,
                mintRequest.accessoryFullRandomMintParams,
                mintRequest.accessorySemiRandomMintParams,
                mintRequest.accessoryStartTokenId
            );
        }
    }

    /**
     * @dev Internal method to get mintable portrait infos
     * @param seed Seed random number to generate portrait infos
     * @param portraitMintParams Users portrait mint params
     * @return portraits Mintable portrait on-chain metadata
     * @return lastRand Last random number to generate accessory metadata
     */
    function _getPortraitsInfo(
        uint256 seed,
        PortraitMintParams[] memory portraitMintParams,
        uint256 startTokenId
    ) internal view returns (PortraitInfo[] memory portraits, uint256 lastRand) {
        uint256 portraitAmount;

        uint256 length = portraitMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            portraitAmount += portraitMintParams[i].amount;
        }

        uint256 tokenId = startTokenId;
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
                                tokenId: tokenId,
                                boxType: portraitMintParams[i].boxType,
                                tier: k,
                                rand: rand / MAX_TIER_CHANCE
                            });
                            break;
                        }
                    }
                    tokenId += PORTRAIT_MASK;
                }
            }
        }
        lastRand = rand;
    }

    /**
     * @dev Internal method to get mintable accessories infos
     * @param seed Seed random number to generate portrait infos
     * @param fullRandomMintParams Users accessory full mint params
     * @param semiRandomMintParams Users accessory semi mint params
     * @return accessories Mintable accessory on-chain metadata
     */
    function _getAccessoriesInfo(
        uint256 seed,
        AccessoryFullRandomMintParams[] memory fullRandomMintParams,
        AccessorySemiRandomMintParams[] memory semiRandomMintParams,
        uint256 startTokenId
    ) internal view returns (AccessoryInfo[] memory accessories) {
        uint256 fullRandomAmount;
        uint256 semiRandomAmount;
        uint256 length = fullRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            fullRandomAmount += fullRandomMintParams[i].amount;
        }

        uint256 tokenId = startTokenId;
        length = semiRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            semiRandomAmount += semiRandomMintParams[i].amount;
        }

        uint256 rand = seed;
        if (semiRandomAmount > 0 || fullRandomAmount > 0) {
            accessories = new AccessoryInfo[](semiRandomAmount + fullRandomAmount);

            for (uint256 i = 0; i < length; i += 1) {
                AccessorySemiRandomMintParams memory mintParam = semiRandomMintParams[i];
                uint256 amount = mintParam.amount;
                for (uint256 j = 0; j < amount; j += 1) {
                    rand = uint256(keccak256(abi.encode(rand, rand)));
                    uint16 chance = uint16(rand % MAX_TIER_CHANCE);
                    uint16[6] memory tierChances = accessoryMintInfo[mintParam.boxType].tierChances;
                    for (uint8 k = 0; k < TIER_COUNT; k += 1) {
                        if (tierChances[k] > chance) {
                            accessories[i] = AccessoryInfo({
                                tokenId: tokenId,
                                boxType: mintParam.boxType,
                                accessoryType: mintParam.accessoryType,
                                tier: k
                            });
                            break;
                        }
                    }
                    tokenId += 1;
                }
            }

            length = fullRandomMintParams.length;
            for (uint256 i = 0; i < length; i += 1) {
                AccessoryFullRandomMintParams memory mintParam = fullRandomMintParams[i];
                uint256 amount = mintParam.amount;
                for (uint256 j = 0; j < amount; j += 1) {
                    rand = uint256(keccak256(abi.encode(rand, rand)));
                    uint16 chance = uint16(rand % MAX_TIER_CHANCE);
                    AccessoryType accessoryType = AccessoryType(uint8((rand / MAX_TIER_CHANCE) % 5));
                    uint16[6] memory tierChances = accessoryMintInfo[mintParam.boxType].tierChances;
                    for (uint8 k = 0; k < TIER_COUNT; k += 1) {
                        if (tierChances[k] > chance) {
                            accessories[i + semiRandomAmount] = AccessoryInfo({
                                tokenId: tokenId,
                                boxType: mintParam.boxType,
                                accessoryType: accessoryType,
                                tier: k
                            });
                            break;
                        }
                    }
                    tokenId += 1;
                }
            }
        }
    }

    /**
     * @dev Initialize portrait mint information
     * @notice Price and tier chances are constant
     */
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

    /**
     * @dev Initialize accessory mint information
     * @notice Price and tier chances are constant
     */
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

    function _quoteSIlv(uint256 etherAmount) internal view returns (uint256 sIlvAmount) {
        uint256 ilvEthPrice = uint256(ilvETHAggregator.latestAnswer());
        sIlvAmount = (ilvEthPrice * etherAmount) / 1e18;
    }

    /// @inheritdoc UUPSUpgradeable
    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
