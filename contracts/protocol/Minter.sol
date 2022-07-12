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

    uint16 private constant MAX_CHANCE = 10000; // 100%
    uint8 private constant TIER_CHANCE_LEN = 4;
    /// @dev expression count - Normal, Expression A, Expression B
    uint8 private constant EXPRESSION_COUNT = 3;
    uint8 private constant STAGE_COUNT = 3;
    /// @dev 0: without accessory
    ///      1: bonded 1 slot
    ///      2: bonded 2 slot
    ///      3: bonded 3 slot
    ///      4: bonded 4 slot
    ///      5: bonded 5 slot
    uint8 private constant PORTRAIT_MASK = 6;

    /// @dev Portrait mint information
    mapping(BoxType => PortraitMintInfo) public portraitMintInfo;
    /// @dev Accessory mint information
    mapping(BoxType => AccessoryMintInfo) public accessoryMintInfo;
    /// @dev expression probability
    uint16[EXPRESSION_COUNT] private expressionProbability;
    /// @dev stage probability
    uint16[STAGE_COUNT] private stageProbability;

    /// @dev Background tier chances
    mapping(uint8 => mapping(BoxType => uint16[4])) public backgroundTierChances;
    /// @dev Background line info per tier
    mapping(uint8 => BackgroundLine[]) public backgroundLines;
    /// @dev Background stages info per (tier, line)
    mapping(uint8 => mapping(BackgroundLine => uint8[])) public backgroundStages;
    /// @dev Background variation count per (tier, line, stage)
    mapping(uint8 => mapping(BackgroundLine => mapping(uint8 => uint8))) public backgroundVariations;
    /// @dev Illuvial count per tier
    uint8[6] private illuvialCounts;

    /// @dev User's mint requests
    mapping(bytes32 => MintRequest) public mintRequests;
    /// @dev User's free mint requests
    mapping(uint256 => MintRequest) public freeRequests;
    /// @dev Free requests count
    uint256 public freeRequestCount;
    /// @dev Portrait sale window
    SaleWindow public portraitSaleWindow;

    /// @dev sILV2 token address
    address public sIlv;
    /// @dev treasury address
    address public treasury;
    /// @dev ILV/ETH Chainlink price feed address
    IlluvitarsPriceOracle public illuvitarsPriceOracle;
    /// @dev chainlink VRF key hash
    bytes32 private vrfKeyHash;
    /// @dev chainlink VRF fee
    uint256 private vrfFee;
    /// @dev Next portrait token id to mint
    uint256 private nextPortraitTokenId;
    /// @dev Next accessory token id to mint
    uint256 private nextAccessoryTokenId;
    uint256 public freePortraitLimitPerTx;
    uint256 public freeAccessoryLimitPerTx;

    /* ======== EVENTS ======== */
    /// @dev Emitted when treasury updated.
    event TreasurySet(address indexed treasury);
    /// @dev Emitted when user request mint.
    event MintRequested(address indexed requester, bytes32 requestId);
    /// @dev Emitted when user request free mint.
    event FreeMintRequested(address indexed requester, uint256 idx);
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
        BackgroundLine backgroundLine;
        uint8 backgroundStage;
        uint8 backgroundVariation;
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
        uint16[TIER_CHANCE_LEN] tierChances; // tier chances
        uint16 holoProbability; // Holo probability
    }

    /// @dev Accessory semi and random price and tier pick chances for each box type
    struct AccessoryMintInfo {
        uint256 randomPrice; // full random price
        uint256 semiRandomPrice; // semi random price
        uint16[TIER_CHANCE_LEN] tierChances; // tier chances
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
        _initializeBackgroundGenerationInfo();
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

    function setFreeMintLimitPerTx(uint256 _freePortraitLimitPerTx, uint256 _freeAccessoryLimitPerTx)
        external
        onlyOwner
    {
        freePortraitLimitPerTx = _freePortraitLimitPerTx;
        freeAccessoryLimitPerTx = _freeAccessoryLimitPerTx;
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
     * @dev Withdraw ether and sILV to treasury address.
     * @dev only owner can call this function.
     */
    function withdraw() external onlyOwner {
        uint256 etherBalance = address(this).balance;
        if (etherBalance != 0) {
            (bool success, ) = treasury.call{ value: etherBalance }("");
            require(success, "Ether withdraw failed");
        }

        uint256 sIlvBalance = IERC20Upgradeable(sIlv).balanceOf(address(this));
        if (sIlvBalance != 0) {
            IERC20Upgradeable(sIlv).safeTransfer(treasury, sIlvBalance);
        }
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
    function paidMint(
        PortraitMintParams[] calldata portraitMintParams,
        AccessorySemiRandomMintParams[] calldata accessorySemiRandomMintParams,
        AccessoryFullRandomMintParams[] calldata accessoryFullRandomMintParams,
        bool useSIlv
    ) public payable {
        uint256 etherPrice;

        bytes32 requestId = requestRandomness(vrfKeyHash, vrfFee);

        MintRequest storage mintRequest = mintRequests[requestId];
        require(mintRequest.requester == address(0), "Already requested");
        mintRequest.requester = msg.sender;

        etherPrice = _storePortraitRequest(mintRequest, portraitMintParams, false);
        etherPrice += _storeAccessoryRequest(
            mintRequest,
            accessorySemiRandomMintParams,
            accessoryFullRandomMintParams,
            false
        );

        if (etherPrice != 0) {
            if (useSIlv) {
                uint256 tokenAmount = uint256(illuvitarsPriceOracle.ethToIlv(etherPrice));
                IERC20Upgradeable(sIlv).safeTransferFrom(msg.sender, address(this), tokenAmount);
            }
        }

        emit MintRequested(msg.sender, requestId);
    }

    function _storePortraitRequest(
        MintRequest storage mintRequest,
        PortraitMintParams[] calldata portraitMintParams,
        bool isFree
    ) internal returns (uint256 etherPrice) {
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
            require(param.amount != 0, "Invalid amount");
            require(isFree == (param.boxType == BoxType.Virtual), "Invalid box type");
            if (!isFree) {
                etherPrice += uint256(param.amount) * portraitMintInfo[param.boxType].price;
            }
            portraitAmount += uint256(param.amount);
            mintRequest.portraitMintParams.push(param);
        }

        require(!isFree || portraitAmount <= freePortraitLimitPerTx, "Exceed limit");

        mintRequest.portraitAmount = portraitAmount;
        mintRequest.portraitStartTokenId = nextPortraitTokenId;
        nextPortraitTokenId += PORTRAIT_MASK * portraitAmount;
    }

    function _storeAccessoryRequest(
        MintRequest storage mintRequest,
        AccessorySemiRandomMintParams[] calldata accessorySemiRandomMintParams,
        AccessoryFullRandomMintParams[] calldata accessoryFullRandomMintParams,
        bool isFree
    ) internal returns (uint256 etherPrice) {
        uint256 length = accessorySemiRandomMintParams.length;

        uint256 accessoryAmount;
        for (uint256 i = 0; i < length; i += 1) {
            AccessorySemiRandomMintParams memory param = accessorySemiRandomMintParams[i];
            require(param.amount != 0, "Invalid amount");
            require(isFree == (param.boxType == BoxType.Virtual), "Invalid box type");
            if (!isFree) {
                etherPrice += uint256(param.amount) * accessoryMintInfo[param.boxType].semiRandomPrice;
            }
            accessoryAmount += uint256(param.amount);
            mintRequest.accessorySemiRandomMintParams.push(param);
        }

        length = accessoryFullRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            AccessoryFullRandomMintParams memory param = accessoryFullRandomMintParams[i];
            require(param.amount != 0, "Invalid amount");
            require(isFree == (param.boxType == BoxType.Virtual), "Invalid box type");
            if (!isFree) {
                etherPrice += uint256(param.amount) * accessoryMintInfo[param.boxType].randomPrice;
            }
            accessoryAmount += uint256(param.amount);
            mintRequest.accessoryFullRandomMintParams.push(param);
        }

        require(!isFree || accessoryAmount <= freeAccessoryLimitPerTx, "Exceed limit");

        mintRequest.accessoryAmount = accessoryAmount;
        mintRequest.accessoryStartTokenId = nextAccessoryTokenId;
        nextAccessoryTokenId += accessoryAmount;
    }

    /**
     * @dev Request minting Portrait and Accesory NFTs.
     * @notice Users pay ETH or sILV to request minting
     * @param portraitMintParams portrait layer mint params.
     * @param accessorySemiRandomMintParams accessory layer semi random mint params.
     * @param accessoryFullRandomMintParams accessory layer full random mint params.
     */
    function freeMint(
        PortraitMintParams[] calldata portraitMintParams,
        AccessorySemiRandomMintParams[] calldata accessorySemiRandomMintParams,
        AccessoryFullRandomMintParams[] calldata accessoryFullRandomMintParams
    ) public {
        MintRequest storage mintRequest = freeRequests[freeRequestCount];
        mintRequest.requester = msg.sender;

        _storePortraitRequest(mintRequest, portraitMintParams, true);
        _storeAccessoryRequest(mintRequest, accessorySemiRandomMintParams, accessoryFullRandomMintParams, true);

        emit FreeMintRequested(msg.sender, freeRequestCount);
        freeRequestCount += 1;

        mintRequest.randomNumber = uint256(keccak256(abi.encode(freeRequestCount, block.timestamp)));
    }

    /**
     * @dev Get mintable portrait and accessory infos with chainlink random number
     * @param requestId Request id of mint request.
     * @return requester Requester address
     * @return seed Seed random number from chainlink
     * @return portraits Mintable portrait on-chain metadata
     * @return accessories Mintable accessory on-chain metadata
     */
    function getPaidMintResult(bytes32 requestId)
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
        if (mintRequest.portraitAmount != 0) {
            (portraits, rand) = _getPortraitsInfo(
                rand,
                mintRequest.portraitMintParams,
                mintRequest.portraitAmount,
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

    function getFreeMintResult(uint256 idx)
        external
        view
        returns (
            address requester,
            uint256 seed,
            PortraitInfo[] memory portraits,
            AccessoryInfo[] memory accessories
        )
    {
        MintRequest memory mintRequest = freeRequests[idx];
        requester = mintRequest.requester;
        require(requester != address(0), "No request");
        seed = mintRequest.randomNumber;

        uint256 rand = seed;
        if (mintRequest.portraitAmount > 0) {
            (portraits, rand) = _getPortraitsInfo(
                rand,
                mintRequest.portraitMintParams,
                mintRequest.portraitAmount,
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
        uint256 portraitAmount,
        uint256 startTokenId
    ) internal view returns (PortraitInfo[] memory portraits, uint256 nextRand) {
        uint256 length = portraitMintParams.length;

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
        uint256 _rand;

        portrait.tokenId = tokenId;
        portrait.boxType = mintParam.boxType;
        uint8 tier;
        if (mintParam.boxType == BoxType.Virtual) {
            _rand = rand;
        } else {
            uint16 chance;
            (_rand, chance) = _getQuotientAndRemainder16(rand, MAX_CHANCE);
            tier = _getTier(portraitMintInfo[mintParam.boxType].tierChances, chance);
            portrait.tier = tier;
            (_rand, portrait.backgroundTier) = _getBackgroundTier(tier, mintParam.boxType, _rand);
        }

        (_rand, portrait.illuvial) = _getQuotientAndRemainder8(_rand, illuvialCounts[tier]);

        uint8 backgroundIdx;
        (_rand, backgroundIdx) = _getQuotientAndRemainder8(
            _rand,
            uint8(backgroundLines[portrait.backgroundTier].length)
        );
        portrait.backgroundLine = backgroundLines[portrait.backgroundTier][backgroundIdx];

        (_rand, backgroundIdx) = _getQuotientAndRemainder8(
            _rand,
            uint8(backgroundStages[portrait.backgroundTier][portrait.backgroundLine].length)
        );
        portrait.backgroundStage = backgroundStages[portrait.backgroundTier][portrait.backgroundLine][backgroundIdx];

        (_rand, portrait.backgroundVariation) = _getQuotientAndRemainder8(
            _rand,
            backgroundVariations[portrait.backgroundTier][portrait.backgroundLine][portrait.backgroundStage]
        );

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
        uint256 _rand;

        accessory.tokenId = tokenId;
        accessory.boxType = mintParam.boxType;
        accessory.accessoryType = mintParam.accessoryType;
        uint8 tier;
        if (mintParam.boxType == BoxType.Virtual) {
            _rand = rand;
        } else {
            uint16 chance;
            (_rand, chance) = _getQuotientAndRemainder16(rand, MAX_CHANCE);
            tier = _getTier(accessoryMintInfo[mintParam.boxType].tierChances, chance);
            accessory.tier = tier;
        }

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
        uint256 _rand;

        accessory.tokenId = tokenId;
        accessory.boxType = mintParam.boxType;
        uint8 tier;
        if (mintParam.boxType == BoxType.Virtual) {
            _rand = rand;
        } else {
            uint16 chance;
            (_rand, chance) = _getQuotientAndRemainder16(rand, MAX_CHANCE);
            tier = _getTier(accessoryMintInfo[mintParam.boxType].tierChances, chance);
            accessory.tier = tier;
        }

        accessory.accessoryType = AccessoryType(uint8(_rand % 5));

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

    function setPortraitMintInfo(BoxType boxType, PortraitMintInfo memory mintInfo) external onlyOwner {
        require(boxType != BoxType.Virtual, "Cannot set virtual info");
        _validateTierChances(mintInfo.tierChances);

        portraitMintInfo[boxType] = mintInfo;
    }

    function setAccessoryMintInfo(BoxType boxType, AccessoryMintInfo memory mintInfo) external onlyOwner {
        require(boxType != BoxType.Virtual, "Cannot set virtual info");
        _validateTierChances(mintInfo.tierChances);

        accessoryMintInfo[boxType] = mintInfo;
    }

    function _validateTierChances(uint16[TIER_CHANCE_LEN] memory tierChances) internal pure {
        for (uint256 i = 0; i < TIER_CHANCE_LEN - 1; i += 1) {
            require(tierChances[i] <= tierChances[i + 1], "Invalid tier chance");
        }
        require(tierChances[TIER_CHANCE_LEN - 1] <= MAX_CHANCE, "Invalid tier chance");
    }

    /**
     * @dev Initialize portrait mint information
     * @notice Price and tier chances are constant
     */
    function _initializePortraitMintInfo() internal {
        expressionProbability = [5000, 8000, 10000];
        illuvialCounts = [3, 6, 5, 4, 4, 3];
    }

    /**
     * @dev Initialize accessory mint information
     * @notice Price and tier chances are constant
     */
    function _initializeAccessoryMintInfo() internal {
        stageProbability = [4500, 8000, 10000];
    }

    /**
     * @dev Initialize background tier chances
     */
    function _initializeBackgroundGenerationInfo() internal {
        // tier 1
        backgroundTierChances[1][BoxType.Bronze] = [6457, 9201, 9758, 9919];
        backgroundTierChances[1][BoxType.Silver] = [3948, 7443, 9191, 9838];
        backgroundTierChances[1][BoxType.Gold] = [1067, 4800, 7733, 9333];
        backgroundTierChances[1][BoxType.Platinum] = [143, 1000, 2929, 7500];
        backgroundTierChances[1][BoxType.Diamond] = [48, 435, 1525, 3946];

        // tier 2
        backgroundTierChances[2][BoxType.Bronze] = [8700, 9624, 9874, 9956];
        backgroundTierChances[2][BoxType.Silver] = [6912, 8442, 9462, 9887];
        backgroundTierChances[2][BoxType.Gold] = [2775, 5203, 7746, 9307];
        backgroundTierChances[2][BoxType.Platinum] = [385, 962, 2693, 7308];
        backgroundTierChances[2][BoxType.Diamond] = [126, 378, 1324, 3690];

        // tier 3
        backgroundTierChances[3][BoxType.Bronze] = [8636, 9859, 9942, 9978];
        backgroundTierChances[3][BoxType.Silver] = [7248, 9387, 9743, 9941];
        backgroundTierChances[3][BoxType.Gold] = [3512, 7610, 8683, 9561];
        backgroundTierChances[3][BoxType.Platinum] = [750, 2250, 3375, 7375];
        backgroundTierChances[3][BoxType.Diamond] = [253, 928, 1561, 3671];

        // tier 4
        backgroundTierChances[4][BoxType.Bronze] = [8499, 9854, 9976, 9989];
        backgroundTierChances[4][BoxType.Silver] = [7042, 9380, 9899, 9971];
        backgroundTierChances[4][BoxType.Gold] = [3416, 7900, 9466, 9786];
        backgroundTierChances[4][BoxType.Platinum] = [1081, 3513, 5945, 8107];
        backgroundTierChances[4][BoxType.Diamond] = [428, 1711, 3315, 4652];

        // tier 5
        backgroundTierChances[5][BoxType.Bronze] = [8402, 9830, 9975, 9996];
        backgroundTierChances[5][BoxType.Silver] = [6846, 9270, 9876, 9988];
        backgroundTierChances[5][BoxType.Gold] = [3200, 7680, 9440, 9920];
        backgroundTierChances[5][BoxType.Platinum] = [1000, 3400, 6100, 9300];
        backgroundTierChances[5][BoxType.Diamond] = [535, 2246, 4652, 7326];

        // background line, stage, variation info
        backgroundLines[0] = [BackgroundLine.Dots];
        backgroundStages[0][BackgroundLine.Dots] = [1];
        backgroundVariations[0][BackgroundLine.Dots][1] = 10;

        backgroundLines[1] = [BackgroundLine.Flash];
        backgroundStages[1][BackgroundLine.Flash] = [1];
        backgroundVariations[1][BackgroundLine.Flash][1] = 10;

        backgroundLines[2] = [BackgroundLine.Hex, BackgroundLine.Rain];
        backgroundStages[2][BackgroundLine.Hex] = [2];
        backgroundStages[2][BackgroundLine.Rain] = [3];
        backgroundVariations[2][BackgroundLine.Hex][2] = 8;
        backgroundVariations[2][BackgroundLine.Rain][3] = 8;

        backgroundLines[3] = [BackgroundLine.Spotlight, BackgroundLine.Mozart];
        backgroundStages[3][BackgroundLine.Spotlight] = [3];
        backgroundStages[3][BackgroundLine.Mozart] = [2];
        backgroundVariations[3][BackgroundLine.Spotlight][3] = 5;
        backgroundVariations[3][BackgroundLine.Mozart][2] = 8;

        backgroundLines[4] = [BackgroundLine.Affinity, BackgroundLine.Arena];
        backgroundStages[4][BackgroundLine.Affinity] = [1];
        backgroundStages[4][BackgroundLine.Arena] = [1];
        backgroundVariations[4][BackgroundLine.Affinity][1] = 5;
        backgroundVariations[4][BackgroundLine.Arena][1] = 2;

        backgroundLines[5] = [BackgroundLine.Token, BackgroundLine.Encounter];
        backgroundStages[5][BackgroundLine.Token] = [1, 2];
        backgroundStages[5][BackgroundLine.Encounter] = [3];
        backgroundVariations[5][BackgroundLine.Token][1] = 1;
        backgroundVariations[5][BackgroundLine.Token][2] = 1;
        backgroundVariations[5][BackgroundLine.Encounter][3] = 2;
    }

    function _getTier(uint16[TIER_CHANCE_LEN] memory tierChances, uint16 chance) internal pure returns (uint8) {
        for (uint8 k = 0; k < TIER_CHANCE_LEN; k += 1) {
            if (tierChances[k] > chance) {
                return k + 1;
            }
        }
        return TIER_CHANCE_LEN + 1;
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
        (newRand, chance) = _getQuotientAndRemainder16(rand, MAX_CHANCE);

        uint16[TIER_CHANCE_LEN] memory chances = backgroundTierChances[tier][boxType];

        for (uint8 k = 0; k < TIER_CHANCE_LEN; k += 1) {
            if (chances[k] > chance) {
                backgroundTier = k + 1;
                break;
            }
        }
        backgroundTier = TIER_CHANCE_LEN + 1;
    }

    function _getExpression(uint256 rand) internal view returns (uint256 newRand, ExpressionType expression) {
        uint16 value;
        (newRand, value) = _getQuotientAndRemainder16(rand, MAX_CHANCE);

        for (uint8 i = 0; i < EXPRESSION_COUNT; i += 1) {
            if (value < expressionProbability[i]) {
                expression = ExpressionType(i);
                break;
            }
        }
    }

    function _getFinish(uint256 rand, BoxType boxType) internal view returns (uint256 newRand, FinishType finish) {
        uint16 holoProbability = boxType == BoxType.Virtual ? 200 : portraitMintInfo[boxType].holoProbability;
        uint16 value;
        (newRand, value) = _getQuotientAndRemainder16(rand, MAX_CHANCE);

        if (value <= holoProbability) {
            finish = FinishType.Holo;
        } else {
            finish = FinishType.Normal;
        }
    }

    function _getAccessoryStage(uint256 rand) internal view returns (uint256 newRand, uint8 stage) {
        uint16 value;
        (newRand, value) = _getQuotientAndRemainder16(rand, MAX_CHANCE);

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
