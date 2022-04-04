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
    uint256 public constant MAX_TIER = 5;

    mapping(IBaseIlluvitar.BoxType => uint256) public portraitLayerPrices;
    mapping(IBaseIlluvitar.BoxType => uint256) public accessoryLayerSemiRandomPrices;
    mapping(IBaseIlluvitar.BoxType => uint256) public accessoryLayerFullRandomPrices;

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
        emit RequestFulfilled(requestId, randomNumber);

        // Mint will be done on Layer2
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

    function getMintRequest(bytes32 requestId) external view returns (MintRequest memory) {
        return mintRequests[requestId];
    }

    function fulfillMintRequest(bytes32 requestId) external onlyOwner {
        require(mintRequests[requestId].requester != address(0), "Request does not exist!");
        delete mintRequests[requestId];
    }
}
