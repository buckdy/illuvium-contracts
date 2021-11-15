// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "./interfaces/IAccessoryLayer.sol";
import "./interfaces/IBaseIlluvatar.sol";

/**
    @title Contract which user interact to mint several base or accessory illuvatar
    @author Dmitry Yakovlevich
 */

contract Minter is VRFConsumerBase, Ownable {
    using SafeERC20 for IERC20;

    //Event for RandomAccessory request
    event RandomAccessoryRequested(address indexed requester, bytes32 requestId);

    //Purchase Body struct
    struct BaseLayerMintParams {
        uint8 tier;
        uint64 amount;
    }

    //Purchase Accessory struct
    struct AccessoryMintParams {
        IAccessoryLayer.Accessory accessoryType;
        uint64 amount;
    }

    //Purchase RandomAccessory struct
    struct RandomAccessoryMintParams {
        address requester;
        uint64 amount;
    }

    address private constant ETHER_ADDRESS = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    mapping(uint8 => uint256) public baseLayerPricePerTier;
    mapping(IAccessoryLayer.Accessory => uint256) public accessoryPrice;
    mapping(bytes32 => RandomAccessoryMintParams) public randomAccessoryRequester;
    uint256 public accessoryRandomPrice;

    mapping(IAccessoryLayer.Accessory => IBaseIlluvatar) public accessoryIlluvatars;
    IBaseIlluvatar public immutable baseLayerIlluvatar;
    mapping(address => address) public oracles;
    address public treasury;

    bytes32 public vrfKeyHash;
    uint256 public vrfFee;

    /**
        @notice Constructor.
        @param _vrfCoordinator Chainlink VRF Coordinator address.
        @param _linkToken LINK token address.
        @param _vrfKeyhash Key Hash.
        @param _vrfFee Fee.
        @param _baseLayerAddr Body accessory item.
        @param _eyeAddr Mouth accessory item.
        @param _bodyAddr Body accessory item.
        @param _mouthAddr Mouth accessory item.
        @param _headAddr Head accessory item.
        @param _treasury Treasury Address.
        @param _accessoryRandomPrice RandomAccesory Price.
     */
    constructor(
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _vrfKeyhash,
        uint256 _vrfFee,
        IBaseIlluvatar _baseLayerAddr,
        IBaseIlluvatar _eyeAddr,
        IBaseIlluvatar _bodyAddr,
        IBaseIlluvatar _mouthAddr,
        IBaseIlluvatar _headAddr,
        address _treasury,
        uint256 _accessoryRandomPrice
    ) VRFConsumerBase(_vrfCoordinator, _linkToken) {
        require(address(_baseLayerAddr) != address(0), "cannot zero address");
        require(address(_eyeAddr) != address(0), "cannot zero address");
        require(address(_bodyAddr) != address(0), "cannot zero address");
        require(address(_mouthAddr) != address(0), "cannot zero address");
        require(address(_headAddr) != address(0), "cannot zero address");
        require(_treasury != address(0), "cannot zero address");

        vrfKeyHash = _vrfKeyhash;
        vrfFee = _vrfFee;
        baseLayerIlluvatar = _baseLayerAddr;
        accessoryIlluvatars[IAccessoryLayer.Accessory.EYE] = _eyeAddr;
        accessoryIlluvatars[IAccessoryLayer.Accessory.BODY] = _bodyAddr;
        accessoryIlluvatars[IAccessoryLayer.Accessory.MOUTH] = _mouthAddr;
        accessoryIlluvatars[IAccessoryLayer.Accessory.HEAD] = _headAddr;

        treasury = _treasury;
        accessoryRandomPrice = _accessoryRandomPrice;
    }

    /**
        @notice setFunction for Treasury Address.
        @param treasury_ Treasury Address.
     */
    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "Treasury address cannot zero");
        treasury = treasury_;
    }

    /**
        @notice setFunction for Body Accessory Price.
        @param tier_ 6 tiers item.
        @param tierPrice_ 6 tiers price.
     */
    function setBaseLayerPricePerTier(uint8 tier_, uint256 tierPrice_) external onlyOwner {
        require(tier_ < 6, "only exist 6 tiers");
        baseLayerPricePerTier[tier_] = tierPrice_;
    }

    /**
        @notice setFunction for 4 Accessories (Eye, Head, Mouth, Body) Price.
        @param accessory_ 4 accessories item.
        @param accessoryPrice_ 4 accessories price.
     */
    function setAccessoryPrice(IAccessoryLayer.Accessory accessory_, uint256 accessoryPrice_) external onlyOwner {
        accessoryPrice[accessory_] = accessoryPrice_;
    }

    /**
        @notice setFunction for Random Accessory Price.
        @param accessoryRandomPrice_ Random accessory price.
     */
    function setAccessoryRandomPrice(uint256 accessoryRandomPrice_) external onlyOwner {
        accessoryRandomPrice = accessoryRandomPrice_;
    }

    /**
        @notice Mint for random accessory.
        @param requestId requested random accesory Id.
        @param randomNumber Random Number.
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomNumber) internal override {
        RandomAccessoryMintParams memory mintParams = randomAccessoryRequester[requestId];

        //need to change some code
        for (uint256 i = 0; i < mintParams.amount; i += 1) {
            uint8 typeId = uint8(randomNumber % 4);
            randomNumber /= 4;
            accessoryIlluvatars[IAccessoryLayer.Accessory(typeId)].mintMultiple(mintParams.requester, 1);
        }

        delete randomAccessoryRequester[requestId];
    }

    /**
        @notice Mint for Base and Accesory items. Users will send ETH or sILV to mint itmes
        @param baseLayerMintParams requested baselayer items.
        @param accessoryMintParams requested accessorylayer items.
        @param accessoryRandomAmount requested amount for random accessories.
        @param paymentToken payment token address.
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
            baseLayerIlluvatar.mintMultiple(msg.sender, uint256(baseLayerMintParams[i].amount));
        }

        uint256 accessoryParamLength = accessoryMintParams.length;
        for (uint256 i = 0; i < accessoryParamLength; i += 1) {
            etherPrice += uint256(accessoryMintParams[i].amount) * accessoryPrice[accessoryMintParams[i].accessoryType];
            accessoryIlluvatars[accessoryMintParams[i].accessoryType].mintMultiple(
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
            (bool success, ) = treasury.call{ value: etherPrice }("");
            require(success, "transfer ether failed");
        } else {
            require(oracles[paymentToken] != address(0), "Payment token not supported");

            /*            uint256 tokenAmount = IOracle(oracles[paymentToken]).getTokenAmount(etherPrice);
            require(tokenAmount > 0, "Invalid price");
            IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, tokenAmount);*/
        }
    }
}
