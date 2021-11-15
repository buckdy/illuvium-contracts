// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BaseIlluvatar.sol";

/**
    @title Inherit BaseIlluvatar contract. This will be deployed four times for different accessories.
    @author Dmitry Yakovlevich
 */

contract AccessoryLayer is BaseIlluvatar {
    /**
        @notice Initialize Accessory NFT.
        @param name_ NFT Name.
        @param symbol_ NFT Symbol.
        @param _minter NFT Minter Address.
     */

    function initialize(
        string memory name_,
        string memory symbol_,
        address _minter
    ) external initializer {
        __BaseIlluvatar_init(name_, symbol_, _minter);
    }
}
