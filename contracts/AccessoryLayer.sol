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
    mapping(uint256 => AccessoryType) public override accessoryTypes;

    /**
     * @notice Initialize Accessory NFT.
     * @param name_ NFT Name.
     * @param symbol_ NFT Symbol.
     * @param _minter NFT Minter Address.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address _minter
    ) external initializer {
        __BaseIlluvitar_init(name_, symbol_, _minter);
    }

    function _mint(address to, bytes calldata _data) internal override {
        lastTokenId += 1;
        _safeMint(to, lastTokenId);
        (BoxType boxType, uint8 tier, AccessoryType accessoryType) = abi.decode(_data, (BoxType, uint8, AccessoryType));
        metadata[lastTokenId] = IlluvitarMetadata({ boxType: boxType, tier: tier });
        accessoryTypes[lastTokenId] = accessoryType;
    }
}
