// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../chainlink/VRFConsumerBaseUpgradeable.sol";
import "../DataTypes.sol";
import "../interfaces/PriceOracleSpec.sol";

/**
 * @title Minter
 * @notice Allow users to request minting Illuvitars.
 * @dev Users can use ETH or sILV to request minting.
 * @dev Minter uses an chainlink VRF to genrate randomness.
 * @author Dmitry Yakovlevich
 */
contract Minter is VRFConsumerBaseUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint16 public constant MAX_TIER_CHANCE = 10000; // 100%
    uint16 public constant FULL_PERCENT = 100; // 100%
    uint8 public constant MAX_TIER = 5;
    /// @dev tier0 ~ 5
    uint8 public constant TIER_COUNT = 6;
    /// @dev expression count - Normal, Expression A, Expression B
    uint8 public constant EXPRESSION_COUNT = 3;
    uint8 public constant STAGE_COUNT = 3;
    /// @dev 0: without accessory
    ///      1: bonded 1 slot
    ///      2: bonded 2 slot
    ///      3: bonded 3 slot
    ///      4: bonded 4 slot
    ///      5: bonded 5 slot
    uint8 public constant PORTRAIT_MASK = 6;

    /// @dev Portrait mint information
    mapping(BoxType => PortraitMintInfo) public portraitMintInfo;
    /// @dev Accessory mint information
    mapping(BoxType => AccessoryMintInfo) public accessoryMintInfo;
    /// @dev Background tier chances
    mapping(uint8 => mapping(BoxType => uint16[MAX_TIER])) public backgroundTierChances;
    /// @dev expression probability
    uint16[EXPRESSION_COUNT] public expressionProbability;
    /// @dev stage probability
    uint16[STAGE_COUNT] public stageProbability;

    /// @dev Background count per tier
    uint8[TIER_COUNT] public backgroundCounts;
    /// @dev Illuvial count per tier
    uint8[TIER_COUNT] public illuvialCounts;

    /// @dev User's mint requests
    mapping(bytes32 => MintRequest) public mintRequests;
    /// @dev Portrait sale window
    SaleWindow public portraitSaleWindow;

    /// @dev sILV2 token address
    address public sIlv;
    /// @dev treasury address
    address public treasury;
    /// @dev ILV/ETH Chainlink price feed address
    IlluvitarsPriceOracle public illuvitarsPriceOracle;
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
        BoxType boxType;
        uint64 amount;
    }

    /// @dev Accessory semi random mint params
    struct AccessorySemiRandomMintParams {
        AccessoryType accessoryType;
        BoxType boxType;
        uint64 amount;
    }

    /// @dev Accessory full random mint params
    struct AccessoryFullRandomMintParams {
        BoxType boxType;
        uint64 amount;
    }

    /// @dev User's mint request data
    struct MintRequest {
        address requester;
        PortraitMintParams[] portraitMintParams;
        uint256 portraitAmount; // total portrait amount
        AccessorySemiRandomMintParams[] accessorySemiRandomMintParams;
        AccessoryFullRandomMintParams[] accessoryFullRandomMintParams;
        uint256 accessoryAmount; // total accessory amount
        uint256 randomNumber; // random number from chainlink
        uint256 portraitStartTokenId; // portrait start token id for this request
        uint256 accessoryStartTokenId; // accessory start token id for this request
    }

    /// @dev Mintable portrait info
    struct PortraitInfo {
        uint256 tokenId;
        BoxType boxType;
        uint8 tier;
        uint8 illuvial;
        uint8 backgroundTier;
        uint8 backgroundIdx;
        ExpressionType expression;
        FinishType finish;
    }

    /// @dev Mintable accessory info
    struct AccessoryInfo {
        uint256 tokenId;
        BoxType boxType;
        AccessoryType accessoryType;
        uint8 tier;
        uint8 stage;
    }

    /// @dev Portrait price and tier pick chances for each box type
    struct PortraitMintInfo {
        uint256 price; // price
        uint16[TIER_COUNT] tierChances; // tier chances
        uint16 holoProbability; // Holo probability
    }

    /// @dev Accessory semi and random price and tier pick chances for each box type
    struct AccessoryMintInfo {
        uint256 randomPrice; // full random price
        uint256 semiRandomPrice; // semi random price
        uint16[TIER_COUNT] tierChances; // tier chances
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
     * @param _illuvitarsPriceOracle ILV/ETH Chainlink price feed base illuvitars price oracle
     */
    function initialize(
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _vrfKeyhash,
        uint256 _vrfFee,
        address _treasury,
        address _sIlv,
        address _illuvitarsPriceOracle
    ) external initializer {
        require(
            _treasury != address(0) && _illuvitarsPriceOracle != address(0) && _sIlv != address(0),
            "cannot zero address"
        );

        __Ownable_init();
        __VRFConsumerBase_init(_vrfCoordinator, _linkToken);

        vrfKeyHash = _vrfKeyhash;
        vrfFee = _vrfFee;
        sIlv = _sIlv;
        treasury = _treasury;
        illuvitarsPriceOracle = IlluvitarsPriceOracle(_illuvitarsPriceOracle);
        nextPortraitTokenId = 1;
        nextAccessoryTokenId = 1;

        _initializePortraitMintInfo();
        _initializeAccessoryMintInfo();
        _initializeBackgroundTierChances();
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
                block.timestamp >= portraitSaleWindow.start && block.timestamp <= portraitSaleWindow.end,
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

        mintRequest.portraitAmount = portraitAmount;
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

        mintRequest.accessoryAmount = accessoryAmount;
        mintRequest.accessoryStartTokenId = nextAccessoryTokenId;
        nextAccessoryTokenId += accessoryAmount;

        if (etherPrice != 0) {
            if (useSIlv) {
                uint256 tokenAmount = uint256(illuvitarsPriceOracle.ethToIlv(etherPrice));
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
     * @return nextRand Last random number to generate accessory metadata
     */
    function _getPortraitsInfo(
        uint256 seed,
        PortraitMintParams[] memory portraitMintParams,
        uint256 startTokenId
    ) internal view returns (PortraitInfo[] memory portraits, uint256 nextRand) {
        uint256 portraitAmount;

        uint256 length = portraitMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            portraitAmount += portraitMintParams[i].amount;
        }

        uint256 tokenId = startTokenId;
        nextRand = seed;

        portraits = new PortraitInfo[](portraitAmount);
        uint256 idx;

        for (uint256 i = 0; i < length; i += 1) {
            PortraitMintParams memory mintParam = portraitMintParams[i];
            uint256 amount = mintParam.amount;

            for (uint256 j = 0; j < amount; j += 1) {
                (portraits[idx], nextRand, tokenId) = _getPortraitInfo(nextRand, mintParam, tokenId);
                idx += 1;
            }
        }
    }

    /**
     * @dev Internal method to get portrait info
     * @param rand Random number
     * @param mintParam Portrait mint params
     * @param tokenId token id
     * @return portrait Mintable portrait on-chain metadata
     * @return nextRand Next random number
     * @return nextTokenId Next item token id
     */
    function _getPortraitInfo(
        uint256 rand,
        PortraitMintParams memory mintParam,
        uint256 tokenId
    )
        internal
        view
        returns (
            PortraitInfo memory portrait,
            uint256 nextRand,
            uint256 nextTokenId
        )
    {
        (uint256 _rand, uint16 chance) = _getQuotientAndRemainder16(rand, MAX_TIER_CHANCE);

        portrait.tokenId = tokenId;
        portrait.boxType = mintParam.boxType;

        uint8 tier = _getTier(portraitMintInfo[mintParam.boxType].tierChances, chance);
        portrait.tier = tier;

        (_rand, portrait.illuvial) = _getQuotientAndRemainder8(_rand, illuvialCounts[tier]);

        (_rand, portrait.backgroundTier) = _getBackgroundTier(tier, mintParam.boxType, _rand);
        (_rand, portrait.backgroundIdx) = _getQuotientAndRemainder8(_rand, backgroundCounts[portrait.backgroundTier]);

        (_rand, portrait.expression) = _getExpression(_rand);
        (, portrait.finish) = _getFinish(_rand, mintParam.boxType);

        nextTokenId = tokenId + PORTRAIT_MASK;
        nextRand = uint256(keccak256(abi.encode(rand, rand)));
    }

    /**
     * @dev Internal method to get semi accessory info
     * @param rand Random number
     * @param mintParam Accessory semi mint params
     * @param tokenId token id
     * @return accessory Mintable accessory on-chain metadata
     * @return nextRand Next random number
     * @return nextTokenId Next item token id
     */
    function _getSemiAcccessoryInfo(
        uint256 rand,
        AccessorySemiRandomMintParams memory mintParam,
        uint256 tokenId
    )
        internal
        view
        returns (
            AccessoryInfo memory accessory,
            uint256 nextRand,
            uint256 nextTokenId
        )
    {
        (uint256 _rand, uint16 chance) = _getQuotientAndRemainder16(rand, MAX_TIER_CHANCE);

        accessory.tokenId = tokenId;
        accessory.boxType = mintParam.boxType;
        accessory.accessoryType = mintParam.accessoryType;

        uint8 tier = _getTier(accessoryMintInfo[mintParam.boxType].tierChances, chance);
        accessory.tier = tier;
        (, accessory.stage) = _getAccessoryStage(_rand);

        nextTokenId = tokenId + 1;
        nextRand = uint256(keccak256(abi.encode(rand, rand)));
    }

    /**
     * @dev Internal method to get full accessory info
     * @param rand Random number
     * @param mintParam Accessory full mint params
     * @param tokenId token id
     * @return accessory Mintable accessory on-chain metadata
     * @return nextRand Next random number
     * @return nextTokenId Next item token id
     */
    function _getFullAcccessoryInfo(
        uint256 rand,
        AccessoryFullRandomMintParams memory mintParam,
        uint256 tokenId
    )
        internal
        view
        returns (
            AccessoryInfo memory accessory,
            uint256 nextRand,
            uint256 nextTokenId
        )
    {
        (uint256 _rand, uint16 chance) = _getQuotientAndRemainder16(rand, MAX_TIER_CHANCE);

        accessory.tokenId = tokenId;
        accessory.boxType = mintParam.boxType;
        accessory.accessoryType = AccessoryType(uint8(_rand % 5));

        uint8 tier = _getTier(accessoryMintInfo[mintParam.boxType].tierChances, chance);
        accessory.tier = tier;
        (, accessory.stage) = _getAccessoryStage(_rand);

        nextTokenId = tokenId + 1;
        nextRand = uint256(keccak256(abi.encode(rand, rand)));
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

        uint256 idx;
        uint256 nextRand = seed;
        accessories = new AccessoryInfo[](semiRandomAmount + fullRandomAmount);

        for (uint256 i = 0; i < length; i += 1) {
            AccessorySemiRandomMintParams memory mintParam = semiRandomMintParams[i];
            uint256 amount = mintParam.amount;
            for (uint256 j = 0; j < amount; j += 1) {
                (accessories[idx], nextRand, tokenId) = _getSemiAcccessoryInfo(nextRand, mintParam, tokenId);
                idx += 1;
            }
        }

        length = fullRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            AccessoryFullRandomMintParams memory mintParam = fullRandomMintParams[i];
            uint256 amount = mintParam.amount;
            for (uint256 j = 0; j < amount; j += 1) {
                (accessories[idx], nextRand, tokenId) = _getFullAcccessoryInfo(nextRand, mintParam, tokenId);
                idx += 1;
            }
        }
    }

    /**
     * @dev Initialize portrait mint information
     * @notice Price and tier chances are constant
     */
    function _initializePortraitMintInfo() internal {
        portraitMintInfo[BoxType.Virtual] = PortraitMintInfo({
            price: 0,
            tierChances: [10000, 0, 0, 0, 0, 0],
            holoProbability: 2
        });
        portraitMintInfo[BoxType.Bronze] = PortraitMintInfo({
            price: 5e16,
            tierChances: [0, 8000, 9700, 9930, 9980, 10000],
            holoProbability: 2
        });
        portraitMintInfo[BoxType.Silver] = PortraitMintInfo({
            price: 10e16,
            tierChances: [0, 6100, 8800, 9700, 9950, 10000],
            holoProbability: 2
        });
        portraitMintInfo[BoxType.Gold] = PortraitMintInfo({
            price: 25e16,
            tierChances: [0, 2400, 6600, 8800, 9700, 10000],
            holoProbability: 2
        });
        portraitMintInfo[BoxType.Platinum] = PortraitMintInfo({
            price: 75e16,
            tierChances: [0, 500, 2000, 4250, 8250, 10000],
            holoProbability: 3
        });
        portraitMintInfo[BoxType.Diamond] = PortraitMintInfo({
            price: 250e16,
            tierChances: [0, 200, 1000, 2500, 5000, 10000],
            holoProbability: 5
        });

        backgroundCounts = [10, 10, 10, 10, 5, 5];
        expressionProbability = [50, 80, 100];
        illuvialCounts = [3, 6, 5, 4, 4, 3];
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

        stageProbability = [45, 80, 100];
    }

    /**
     * @dev Initialize background tier chances
     */
    function _initializeBackgroundTierChances() internal {
        // tier 1
        backgroundTierChances[1][BoxType.Bronze] = [6457, 9201, 9758, 9919, 10000];
        backgroundTierChances[1][BoxType.Silver] = [3948, 7443, 9191, 9838, 10000];
        backgroundTierChances[1][BoxType.Gold] = [1067, 4800, 7733, 9333, 10000];
        backgroundTierChances[1][BoxType.Platinum] = [143, 1000, 2929, 7500, 10000];
        backgroundTierChances[1][BoxType.Diamond] = [48, 435, 1525, 3946, 10000];

        // tier 2
        backgroundTierChances[2][BoxType.Bronze] = [8700, 9624, 9874, 9956, 10000];
        backgroundTierChances[2][BoxType.Silver] = [6912, 8442, 9462, 9887, 10000];
        backgroundTierChances[2][BoxType.Gold] = [2775, 5203, 7746, 9307, 10000];
        backgroundTierChances[2][BoxType.Platinum] = [385, 962, 2693, 7308, 10000];
        backgroundTierChances[2][BoxType.Diamond] = [126, 378, 1324, 3690, 10000];

        // tier 3
        backgroundTierChances[3][BoxType.Bronze] = [8636, 9859, 9942, 9978, 10000];
        backgroundTierChances[3][BoxType.Silver] = [7248, 9387, 9743, 9941, 10000];
        backgroundTierChances[3][BoxType.Gold] = [3512, 7610, 8683, 9561, 10000];
        backgroundTierChances[3][BoxType.Platinum] = [750, 2250, 3375, 7375, 10000];
        backgroundTierChances[3][BoxType.Diamond] = [253, 928, 1561, 3671, 10000];

        // tier 4
        backgroundTierChances[4][BoxType.Bronze] = [8499, 9854, 9976, 9989, 10000];
        backgroundTierChances[4][BoxType.Silver] = [7042, 9380, 9899, 9971, 10000];
        backgroundTierChances[4][BoxType.Gold] = [3416, 7900, 9466, 9786, 10000];
        backgroundTierChances[4][BoxType.Platinum] = [1081, 3513, 5945, 8107, 10000];
        backgroundTierChances[4][BoxType.Diamond] = [428, 1711, 3315, 4652, 10000];

        // tier 5
        backgroundTierChances[5][BoxType.Bronze] = [8402, 9830, 9975, 9996, 10000];
        backgroundTierChances[5][BoxType.Silver] = [6846, 9270, 9876, 9988, 10000];
        backgroundTierChances[5][BoxType.Gold] = [3200, 7680, 9440, 9920, 10000];
        backgroundTierChances[5][BoxType.Platinum] = [1000, 3400, 6100, 9300, 10000];
        backgroundTierChances[5][BoxType.Diamond] = [535, 2246, 4652, 7326, 10000];
    }

    function _getTier(uint16[TIER_COUNT] memory tierChances, uint16 chance) internal pure returns (uint8) {
        for (uint8 k = 0; k < TIER_COUNT; k += 1) {
            if (tierChances[k] > chance) {
                return k;
            }
        }
        return 0;
    }

    function _getBackgroundTier(
        uint8 tier,
        BoxType boxType,
        uint256 rand
    ) internal view returns (uint256 newRand, uint8 backgroundTier) {
        if (boxType == BoxType.Virtual) {
            return (rand, 0);
        }

        uint16 chance;
        (newRand, chance) = _getQuotientAndRemainder16(rand, MAX_TIER_CHANCE);

        uint16[MAX_TIER] memory chances = backgroundTierChances[tier][boxType];

        for (uint8 k = 0; k < MAX_TIER; k += 1) {
            if (chances[k] > chance) {
                backgroundTier = k + 1;
            }
        }
        backgroundTier = 1;
    }

    function _getExpression(uint256 rand) internal view returns (uint256 newRand, ExpressionType expression) {
        uint16 value;
        (newRand, value) = _getQuotientAndRemainder16(rand, FULL_PERCENT);

        for (uint8 i = 0; i < EXPRESSION_COUNT; i += 1) {
            if (value < expressionProbability[i]) {
                expression = ExpressionType(i);
                break;
            }
        }
    }

    function _getFinish(uint256 rand, BoxType boxType) internal view returns (uint256 newRand, FinishType finish) {
        uint16 value;
        (newRand, value) = _getQuotientAndRemainder16(rand, FULL_PERCENT);

        if (value <= portraitMintInfo[boxType].holoProbability) {
            finish = FinishType.Holo;
        } else {
            finish = FinishType.Normal;
        }
    }

    function _getAccessoryStage(uint256 rand) internal view returns (uint256 newRand, uint8 stage) {
        uint16 value;
        (newRand, value) = _getQuotientAndRemainder16(rand, FULL_PERCENT);

        for (uint8 i = 0; i < STAGE_COUNT; i += 1) {
            if (value < stageProbability[i]) {
                stage = i + 1;
                break;
            }
        }
    }

    /// @dev calculate quotient and remainder
    function _getQuotientAndRemainder16(uint256 a, uint16 b) internal pure returns (uint256, uint16) {
        return (a / b, uint16(a % b));
    }

    /// @dev calculate quotient and remainder
    function _getQuotientAndRemainder8(uint256 a, uint8 b) internal pure returns (uint256, uint8) {
        return (a / b, uint8(a % b));
    }

    /// @inheritdoc UUPSUpgradeable
    function _authorizeUpgrade(address) internal virtual override onlyOwner {}
}
