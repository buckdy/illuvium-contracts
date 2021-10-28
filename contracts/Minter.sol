// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IAccessoryLayer.sol";
import "./interfaces/IBaseIlluvatar.sol";
import "./interfaces/IOracle.sol";

contract Minter is Ownable {
    using SafeERC20 for IERC20;

    struct BaseLayerMintParams {
        uint8 tier;
        uint64 amount;
    }

    struct AccessoryMintParams {
        IAccessoryLayer.Accessory accessoryType;
        uint64 amount;
    }

    address constant ETHER_ADDRESS = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    mapping(uint8 => uint256) public baseLayerPricePerTier;
    mapping(IAccessoryLayer.Accessory => uint256) public accessoryPrice;
    uint256 public accessoryRandomPrice;

    mapping(IAccessoryLayer.Accessory => IBaseIlluvatar) public accessoryIlluvatars;
    IBaseIlluvatar public immutable baseLayerIlluvatar;
    mapping(address => address) public oracles;
    address public treasury;

    constructor(
        IBaseIlluvatar _baseLayerAddr,
        IBaseIlluvatar _eyeAddr,
        IBaseIlluvatar _bodyAddr,
        IBaseIlluvatar _mouthAddr,
        IBaseIlluvatar _headAddr,
        address _treasury
    ) {
        baseLayerIlluvatar = _baseLayerAddr;
        accessoryIlluvatars[IAccessoryLayer.Accessory.EYE] = _eyeAddr;
        accessoryIlluvatars[IAccessoryLayer.Accessory.BODY] = _bodyAddr;
        accessoryIlluvatars[IAccessoryLayer.Accessory.MOUTH] = _mouthAddr;
        accessoryIlluvatars[IAccessoryLayer.Accessory.HEAD] = _headAddr;

        treasury = _treasury;
    }

    function purchase(
        BaseLayerMintParams[] calldata baseLayerMintParams,
        AccessoryMintParams[] calldata accessoryMintParams,
        //        uint64 accessoryRandomAmount,
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

        if (paymentToken == ETHER_ADDRESS) {
            require(msg.value == etherPrice, "Invalid price");
            (bool success, ) = treasury.call{ value: etherPrice }("");
            require(success, "transfer ether failed");
        } else {
            require(oracles[paymentToken] != address(0), "Payment token not supported");

            uint256 tokenAmount = IOracle(oracles[paymentToken]).getTokenAmount(etherPrice);
            require(tokenAmount > 0, "Invalid price");
            IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, tokenAmount);
        }

        // Do random accessory later
    }
}
