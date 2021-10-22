// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BaseIlluvatar.sol";

contract AccessoryLayer is BaseIlluvatar {
    function initialize(
        string memory name_,
        string memory symbol_,
        address _minter
    ) internal initializer {
        __BaseIlluvatar_init(name_, symbol_, _minter);
    }
}
