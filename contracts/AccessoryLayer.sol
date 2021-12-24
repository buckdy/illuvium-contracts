// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BaseIlluvitar.sol";
import "./interfaces/IAccessoryLayer.sol";

/**
    @title AccessoryLayer, this contract is inherited from BaseIlluvitar contract,
    this will be deployed four times for different accessories(EYE, BODY, MOUTH, HEAD).
    @author Dmitry Yakovlevich
 */

contract AccessoryLayer is BaseIlluvitar, IAccessoryLayer {
    AccessoryType public override layerType;

    /**
     * @notice Initialize Accessory NFT.
     * @param name_ NFT Name.
     * @param symbol_ NFT Symbol.
     * @param _minter NFT Minter Address.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address _minter,
        AccessoryType type_
    ) external initializer {
        __BaseIlluvitar_init(name_, symbol_, _minter);
        layerType = type_;
    }
}
