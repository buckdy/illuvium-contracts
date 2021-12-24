// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "./interfaces/IAccessoryLayer.sol";
import "./interfaces/IBaseIlluvitar.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/IOracleRegistry.sol";

/**
    @title Minter, this contract is inherited from chainlink VRFConsumerBase,
    this contract contains purchase function which users interact to mint several base or accessory illuvitars.
    @author Dmitry Yakovlevich
 */

contract Minter is VRFConsumerBase, Ownable {
    using SafeERC20 for IERC20;

    /**
     * @notice event emitted random accessory requested.
     * @dev emitted in {purchase} or {requestRandomAgain} function.
     * @param requester requester address.
     * @param requestId requestId number.
     */
    event RandomAccessoryRequested(address indexed requester, bytes32 requestId);

    //Purchase Body struct
    struct BaseLayerMintParams {
        uint8 tier;
        uint64 amount;
    }

    //Purchase Accessory struct
    struct AccessoryMintParams {
        IAccessoryLayer.AccessoryType accessoryType;
        uint64 amount;
    }

    //Purchase RandomAccessory struct
    struct RandomAccessoryMintParams {
        address requester;
        uint64 amount;
    }

    address private constant ETHER_ADDRESS = address(0x0000000000000000000000000000000000000000);
    mapping(uint8 => uint256) public baseLayerPricePerTier;
    mapping(IAccessoryLayer.AccessoryType => uint256) public accessoryPrice;
    mapping(bytes32 => RandomAccessoryMintParams) public randomAccessoryRequester;
    uint256 public accessoryRandomPrice;

    mapping(IAccessoryLayer.AccessoryType => IBaseIlluvitar) public accessoryIlluvitars;
    IBaseIlluvitar public immutable baseLayerIlluvitar;

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
     * @param _baseLayerAddr Body accessory item.
     * @param _accessories List of accessory items.
     * @param _treasury Treasury Address.
     * @param _weth WETH Address.
     * @param _oracleRegistry IlluviumOracleRegistry Address.
     */
    constructor(
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _vrfKeyhash,
        uint256 _vrfFee,
        IBaseIlluvitar _baseLayerAddr,
        address[] memory _accessories,
        address _treasury,
        address _weth,
        address _oracleRegistry
    ) VRFConsumerBase(_vrfCoordinator, _linkToken) {
        require(address(_baseLayerAddr) != address(0), "cannot zero address");
        require(_treasury != address(0), "cannot zero address");
        uint256 accessoryTypeCounts = 5;
        require(_accessories.length == accessoryTypeCounts, "invalid length");

        vrfKeyHash = _vrfKeyhash;
        vrfFee = _vrfFee;
        baseLayerIlluvitar = _baseLayerAddr;

        for (uint256 i = 0; i < accessoryTypeCounts; i += 1) {
            IAccessoryLayer.AccessoryType type_ = IAccessoryLayer(_accessories[i]).layerType();
            require(address(accessoryIlluvitars[type_]) == address(0), "already set");
            accessoryIlluvitars[type_] = IBaseIlluvitar(_accessories[i]);
        }

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
    }

    /**
     * @notice setFunction for Body Accessory Price.
     * @dev only owner can call this function.
     * @param tier_ 6 tiers item.
     * @param tierPrice_ 6 tiers price.
     */
    function setBaseLayerPricePerTier(uint8 tier_, uint256 tierPrice_) external onlyOwner {
        require(tier_ < 6, "only exist 6 tiers");
        baseLayerPricePerTier[tier_] = tierPrice_;
    }

    /**
     * @notice setFunction for 4 Accessories (Eye, Head, Mouth, Body) Price.
     * @dev only owner can call this function.
     * @param accessory_ 4 accessories item.
     * @param accessoryPrice_ 4 accessories price.
     */
    function setAccessoryPrice(IAccessoryLayer.AccessoryType accessory_, uint256 accessoryPrice_) external onlyOwner {
        accessoryPrice[accessory_] = accessoryPrice_;
    }

    /**
     * @notice setFunction for Random Accessory Price.
     * @dev only owner can call this function.
     * @param accessoryRandomPrice_ Random accessory price.
     */
    function setAccessoryRandomPrice(uint256 accessoryRandomPrice_) external onlyOwner {
        accessoryRandomPrice = accessoryRandomPrice_;
    }

    /**
     * @notice setFunction for OracleRegistry Address.
     * @dev only owner can call this function.
     * @param oracleRegistry_ OracleRegistry Address.
     */
    function setOracleRegistry(address oracleRegistry_) external onlyOwner {
        oracleRegistry = oracleRegistry_;
    }

    /**
     * @notice Mint for random accessory, callback for VRFConsumerBase
     * @dev inaccessible from outside
     * @param requestId requested random accesory Id.
     * @param randomNumber Random Number.
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomNumber) internal override {
        RandomAccessoryMintParams memory mintParams = randomAccessoryRequester[requestId];

        //need to change some code
        for (uint256 i = 0; i < mintParams.amount; i += 1) {
            uint8 typeId = uint8(randomNumber % 4);
            randomNumber /= 4;
            accessoryIlluvitars[IAccessoryLayer.AccessoryType(typeId)].mintMultiple(mintParams.requester, 1);
        }

        delete randomAccessoryRequester[requestId];
    }

    /**
     * @notice Mint for Base and Accesory items. Users will send ETH or sILV to mint itmes
     * @param baseLayerMintParams requested baselayer items.
     * @param accessoryMintParams requested accessorylayer items.
     * @param accessoryRandomAmount requested amount for random accessories.
     * @param paymentToken payment token address.
     */
    function purchase(
        BaseLayerMintParams[] calldata baseLayerMintParams,
        AccessoryMintParams[] calldata accessoryMintParams,
        uint64 accessoryRandomAmount,
        address paymentToken
    ) external payable {
        uint256 etherPrice = 0;

        uint256 baseLayerParamLength = baseLayerMintParams.length;
        for (uint256 i = 0; i < baseLayerParamLength; i += 1) {
            etherPrice += uint256(baseLayerMintParams[i].amount) * baseLayerPricePerTier[baseLayerMintParams[i].tier];
            baseLayerIlluvitar.mintMultiple(msg.sender, uint256(baseLayerMintParams[i].amount));
        }

        uint256 accessoryParamLength = accessoryMintParams.length;
        for (uint256 i = 0; i < accessoryParamLength; i += 1) {
            etherPrice += uint256(accessoryMintParams[i].amount) * accessoryPrice[accessoryMintParams[i].accessoryType];
            accessoryIlluvitars[accessoryMintParams[i].accessoryType].mintMultiple(
                msg.sender,
                uint256(accessoryMintParams[i].amount)
            );
        }

        if (accessoryRandomAmount > 0) {
            bytes32 requestId = requestRandomness(vrfKeyHash, vrfFee);

            RandomAccessoryMintParams storage mintParams = randomAccessoryRequester[requestId];
            mintParams.requester = msg.sender;
            mintParams.amount = accessoryRandomAmount;

            etherPrice += accessoryRandomAmount * accessoryRandomPrice;
            emit RandomAccessoryRequested(msg.sender, requestId);
        }

        if (paymentToken == ETHER_ADDRESS) {
            require(msg.value == etherPrice, "Invalid price");
            payable(treasury).transfer(etherPrice);
        } else {
            IOracle oracle = IOracle(IOracleRegistry(oracleRegistry).getOracle(weth, paymentToken));
            oracle.update();
            uint256 tokenAmount = oracle.consult(weth, etherPrice);
            require(tokenAmount > 0, "Invalid price");
            IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, tokenAmount);
        }
    }

    /**
     * @notice Request random number again if failed.
     * @dev only owner can call this function.
     * @param requestId request id number.
     */
    function requestRandomAgain(bytes32 requestId) external onlyOwner {
        RandomAccessoryMintParams memory oldMintParams = randomAccessoryRequester[requestId];
        require(oldMintParams.amount > 0 && oldMintParams.requester != address(0), "Invalid requestId");

        bytes32 newRequestId = requestRandomness(vrfKeyHash, vrfFee);

        RandomAccessoryMintParams storage newMintParams = randomAccessoryRequester[newRequestId];
        newMintParams.requester = oldMintParams.requester;
        newMintParams.amount = oldMintParams.amount;

        emit RandomAccessoryRequested(newMintParams.requester, newRequestId);

        delete randomAccessoryRequester[requestId];
    }
}
