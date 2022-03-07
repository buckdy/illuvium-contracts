// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "./interfaces/IAccessoryLayer.sol";
import "./interfaces/IBaseIlluvitar.sol";
import "./interfaces/IPortraitLayer.sol";
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
    event PortraitLayerPriceSet(IBaseIlluvitar.BoxType indexed type_, uint256 price);
    event AccessoryLayerFullRandomPriceSet(IBaseIlluvitar.BoxType indexed type_, uint256 price);
    event AccessoryLayerSemiRandomPriceSet(IBaseIlluvitar.BoxType indexed type_, uint256 price);
    event PortraitLayerTierChancesSet(IBaseIlluvitar.BoxType indexed type_, uint16[] tierChances);
    event AccessoryLayerTierChancesSet(IBaseIlluvitar.BoxType indexed type_, uint16[] tierChances);
    event OracleRegistrySet(address indexed oracleRegistry);

    /**
     * @notice event emitted random accessory requested.
     * @dev emitted in {purchase} or {requestRandomAgain} function.
     * @param requester requester address.
     * @param requestId requestId number.
     */
    event MintRequested(address indexed requester, bytes32 requestId, MintRequest mintRequest);

    //Purchase Body struct
    struct PortraitLayerMintParams {
        IBaseIlluvitar.BoxType boxType;
        uint64 amount;
    }

    //Purchase Accessory struct
    struct AccessoryLayerSemiRandomMintParams {
        IAccessoryLayer.AccessoryType accessoryType;
        IBaseIlluvitar.BoxType boxType;
        uint64 amount;
    }

    struct AccessoryLayerFullRandomMintParams {
        IBaseIlluvitar.BoxType boxType;
        uint64 amount;
    }

    //Purchase RandomAccessory struct
    struct MintRequest {
        address requester;
        PortraitLayerMintParams[] portraitLayerMintParams;
        AccessoryLayerSemiRandomMintParams[] accessorySemiRandomMintParams;
        AccessoryLayerFullRandomMintParams[] accessoryFullRandomMintParams;
    }

    address private constant ETHER_ADDRESS = address(0x0000000000000000000000000000000000000000);
    uint8 public constant ACCESSORY_TYPE_COUNT = 5;
    uint256 public constant MAX_TIER = 5;

    mapping(IBaseIlluvitar.BoxType => uint256) public portraitLayerPrices;
    mapping(IBaseIlluvitar.BoxType => uint256) public accessoryLayerSemiRandomPrices;
    mapping(IBaseIlluvitar.BoxType => uint256) public accessoryLayerFullRandomPrices;
    mapping(IBaseIlluvitar.BoxType => uint16[]) public portraitLayerTierChances;
    mapping(IBaseIlluvitar.BoxType => uint16[]) public accessoryLayerTierChances;

    mapping(bytes32 => MintRequest) public mintRequests;

    mapping(IAccessoryLayer.AccessoryType => IBaseIlluvitar) public accessoryIlluvitars;
    IBaseIlluvitar public immutable portraitLayerIlluvitar;

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
     * @param _portraitLayerAddr Body accessory item.
     * @param _treasury Treasury Address.
     * @param _weth WETH Address.
     * @param _oracleRegistry IlluviumOracleRegistry Address.
     */
    constructor(
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _vrfKeyhash,
        uint256 _vrfFee,
        address _portraitLayerAddr,
        address _treasury,
        address _weth,
        address _oracleRegistry
    ) VRFConsumerBase(_vrfCoordinator, _linkToken) {
        require(address(_portraitLayerAddr) != address(0), "cannot zero address");
        require(_treasury != address(0), "cannot zero address");

        vrfKeyHash = _vrfKeyhash;
        vrfFee = _vrfFee;
        portraitLayerIlluvitar = IBaseIlluvitar(_portraitLayerAddr);

        for (uint8 i = 0; i < ACCESSORY_TYPE_COUNT; i += 1) {
            IAccessoryLayer.AccessoryType type_ = IAccessoryLayer.AccessoryType(i);
            accessoryIlluvitars[type_] = IBaseIlluvitar(IPortraitLayer(_portraitLayerAddr).accessoryIlluvitars(type_));
        }

        emit TreasurySet(_treasury);
        treasury = _treasury;
        weth = _weth;
        oracleRegistry = _oracleRegistry;
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
     * @notice Set portraitLayer prices for each box type.
     * @dev only owner can call this function.
     * @param boxTypes list of box types
     * @param prices list of prices
     */
    function setPortraitLayerPrice(IBaseIlluvitar.BoxType[] calldata boxTypes, uint256[] calldata prices)
        external
        onlyOwner
    {
        require(boxTypes.length > 0 && boxTypes.length == prices.length, "Invalid length");

        for (uint256 i = 0; i < boxTypes.length; i += 1) {
            portraitLayerPrices[boxTypes[i]] = prices[i];
            emit PortraitLayerPriceSet(boxTypes[i], prices[i]);
        }
    }

    /**
     * @notice Set accessoryLayer full random prices for each box type.
     * @dev only owner can call this function.
     * @param boxTypes list of box types
     * @param prices list of prices
     */
    function setAccessoryLayerFullRandomPrice(IBaseIlluvitar.BoxType[] calldata boxTypes, uint256[] calldata prices)
        external
        onlyOwner
    {
        require(boxTypes.length > 0 && boxTypes.length == prices.length, "Invalid length");

        for (uint256 i = 0; i < boxTypes.length; i += 1) {
            accessoryLayerFullRandomPrices[boxTypes[i]] = prices[i];
            emit AccessoryLayerFullRandomPriceSet(boxTypes[i], prices[i]);
        }
    }

    /**
     * @notice Set accessoryLayer semi random prices for each box type.
     * @dev only owner can call this function.
     * @param boxTypes list of box types
     * @param prices list of prices
     */
    function setAccessoryLayerSemiRandomPrices(IBaseIlluvitar.BoxType[] calldata boxTypes, uint256[] calldata prices)
        external
        onlyOwner
    {
        require(boxTypes.length > 0 && boxTypes.length == prices.length, "Invalid length");

        for (uint256 i = 0; i < boxTypes.length; i += 1) {
            accessoryLayerSemiRandomPrices[boxTypes[i]] = prices[i];
            emit AccessoryLayerSemiRandomPriceSet(boxTypes[i], prices[i]);
        }
    }

    /**
     * @notice Set portrait layer tier chances for each box type
     * @dev only owner can call this function.
     * @param boxTypes list of box types
     * @param tierChances list of tier chances
     */
    function setPortraitLayerTierChances(IBaseIlluvitar.BoxType[] calldata boxTypes, uint16[][] calldata tierChances)
        external
        onlyOwner
    {
        require(boxTypes.length > 0 && boxTypes.length == tierChances.length, "Invalid length");

        for (uint256 i = 0; i < boxTypes.length; i += 1) {
            require(tierChances[i].length == MAX_TIER + 1, "Invalid tier chance length");

            uint16[] storage currentTierChances = portraitLayerTierChances[boxTypes[i]];

            if (currentTierChances.length == 0) {
                for (uint256 j = 0; j <= MAX_TIER; j += 1) {
                    currentTierChances.push(tierChances[i][j]);
                }
            } else {
                for (uint256 j = 0; j <= MAX_TIER; j += 1) {
                    currentTierChances[j] = tierChances[i][j];
                }
            }

            emit PortraitLayerTierChancesSet(boxTypes[i], tierChances[i]);
        }
    }

    /**
     * @notice Set accessory layer tier chances for each box type
     * @dev only owner can call this function.
     * @param boxTypes list of box types
     * @param tierChances list of tier chances
     */
    function setAccessoryLayerTierChances(IBaseIlluvitar.BoxType[] calldata boxTypes, uint16[][] calldata tierChances)
        external
        onlyOwner
    {
        require(boxTypes.length > 0 && boxTypes.length == tierChances.length, "Invalid length");

        for (uint256 i = 0; i < boxTypes.length; i += 1) {
            require(tierChances[i].length == MAX_TIER + 1, "Invalid tier chance length");

            uint16[] storage currentTierChances = accessoryLayerTierChances[boxTypes[i]];

            if (currentTierChances.length == 0) {
                for (uint256 j = 0; j <= MAX_TIER; j += 1) {
                    currentTierChances.push(tierChances[i][j]);
                }
            } else {
                for (uint256 j = 0; j <= MAX_TIER; j += 1) {
                    currentTierChances[j] = tierChances[i][j];
                }
            }

            emit AccessoryLayerTierChancesSet(boxTypes[i], tierChances[i]);
        }
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
        MintRequest storage mintRequest = mintRequests[requestId];

        address requestor = mintRequest.requester;

        uint256 seed = randomNumber;
        uint16 chance;

        uint256 portraitLayerMintLength = mintRequest.portraitLayerMintParams.length;

        for (uint256 i = 0; i < portraitLayerMintLength; i += 1) {
            IBaseIlluvitar.BoxType boxType = mintRequest.portraitLayerMintParams[i].boxType;

            uint16[] memory tierChances = portraitLayerTierChances[boxType];
            uint256 tierLength = tierChances.length;

            uint256 amount = mintRequest.portraitLayerMintParams[i].amount;
            for (uint256 j = 0; j < amount; j += 1) {
                (chance, seed) = _getRandChance(seed);
                uint8 selectedTier;

                for (uint8 tier = 0; tier < tierLength; tier += 1) {
                    if (tierChances[tier] >= chance) {
                        selectedTier = tier;
                        break;
                    }
                }

                portraitLayerIlluvitar.mintSingle(requestor, boxType, selectedTier);
            }
        }

        uint256 accessorySemiRandomMintLength = mintRequest.accessorySemiRandomMintParams.length;

        for (uint256 i = 0; i < accessorySemiRandomMintLength; i += 1) {
            IBaseIlluvitar.BoxType boxType = mintRequest.accessorySemiRandomMintParams[i].boxType;
            IBaseIlluvitar accessoryLayer = accessoryIlluvitars[
                mintRequest.accessorySemiRandomMintParams[i].accessoryType
            ];

            uint16[] memory tierChances = accessoryLayerTierChances[boxType];
            uint256 tierLength = tierChances.length;

            uint256 amount = mintRequest.accessorySemiRandomMintParams[i].amount;
            for (uint256 j = 0; j < amount; j += 1) {
                (chance, seed) = _getRandChance(seed);
                uint8 selectedTier;

                for (uint8 tier = 0; tier < tierLength; tier += 1) {
                    if (tierChances[tier] >= chance) {
                        selectedTier = tier;
                        break;
                    }
                }

                accessoryLayer.mintSingle(requestor, boxType, selectedTier);
            }
        }

        uint256 accessoryFullRandomMintLength = mintRequest.accessoryFullRandomMintParams.length;

        for (uint256 i = 0; i < accessoryFullRandomMintLength; i += 1) {
            IBaseIlluvitar.BoxType boxType = mintRequest.accessoryFullRandomMintParams[i].boxType;

            uint16[] memory tierChances = accessoryLayerTierChances[boxType];
            uint256 tierLength = tierChances.length;

            uint256 amount = mintRequest.accessoryFullRandomMintParams[i].amount;
            for (uint256 j = 0; j < amount; j += 1) {
                (chance, seed) = _getRandChance(seed);
                IAccessoryLayer.AccessoryType accessoryType = IAccessoryLayer.AccessoryType(
                    uint8(seed % ACCESSORY_TYPE_COUNT)
                );
                uint8 selectedTier;

                for (uint8 tier = 0; tier < tierLength; tier += 1) {
                    if (tierChances[tier] >= chance) {
                        selectedTier = tier;
                        break;
                    }
                }

                accessoryIlluvitars[accessoryType].mintSingle(requestor, boxType, selectedTier);
            }
        }

        delete mintRequests[requestId];
    }

    function _getRandChance(uint256 seed) private pure returns (uint16, uint256) {
        uint256 rand = uint256(keccak256(abi.encodePacked(seed, seed)));
        uint16 chance = uint16(rand % 10000);
        return (chance, rand / 10000);
    }

    /**
     * @notice Mint for Base and Accesory items. Users will send ETH or sILV to mint itmes
     * @param portraitLayerMintParams portrait layer mint params.
     * @param accessorySemiRandomMintParams accessory layer semi random mint params.
     * @param accessoryFullRandomMintParams accessory layer full random mint params.
     * @param paymentToken payment token address.
     */
    function purchase(
        PortraitLayerMintParams[] calldata portraitLayerMintParams,
        AccessoryLayerSemiRandomMintParams[] calldata accessorySemiRandomMintParams,
        AccessoryLayerFullRandomMintParams[] calldata accessoryFullRandomMintParams,
        address paymentToken
    ) external payable {
        uint256 etherPrice;

        bytes32 requestId = requestRandomness(vrfKeyHash, vrfFee);

        MintRequest storage mintRequest = mintRequests[requestId];
        mintRequest.requester = _msgSender();

        uint256 length = portraitLayerMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            etherPrice +=
                uint256(portraitLayerMintParams[i].amount) *
                portraitLayerPrices[portraitLayerMintParams[i].boxType];
            mintRequest.portraitLayerMintParams.push(portraitLayerMintParams[i]);
        }

        length = accessorySemiRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            etherPrice +=
                uint256(accessorySemiRandomMintParams[i].amount) *
                accessoryLayerSemiRandomPrices[accessorySemiRandomMintParams[i].boxType];
            mintRequest.accessorySemiRandomMintParams.push(accessorySemiRandomMintParams[i]);
        }

        length = accessoryFullRandomMintParams.length;
        for (uint256 i = 0; i < length; i += 1) {
            etherPrice +=
                uint256(accessoryFullRandomMintParams[i].amount) *
                accessoryLayerFullRandomPrices[accessoryFullRandomMintParams[i].boxType];
            mintRequest.accessoryFullRandomMintParams.push(accessoryFullRandomMintParams[i]);
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
}
