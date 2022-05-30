// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./BaseIlluvitar.sol";
import "./DataTypes.sol";

/**
    @title AccessoryLayer, this contract is inherited from BaseIlluvitar contract,
    this will be deployed four times for different accessories(EYE, BODY, MOUTH, HEAD).
    @author Dmitry Yakovlevich
 */

contract AccessoryLayer is BaseIlluvitar {
    struct Metadata {
        bool initialized;
        BoxType boxType;
        uint8 tier;
        AccessoryType accessoryType;
    }

    mapping(uint256 => Metadata) public metadata;

    /**
     * @notice Initialize Accessory NFT.
     * @param name_ NFT Name.
     * @param symbol_ NFT Symbol.
     * @param imxMinter_ NFT Minter Address.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address imxMinter_
    ) external initializer {
        __BaseIlluvitar_init(name_, symbol_, imxMinter_);
    }

    function _mint(
        address to,
        uint256 tokenId,
        bytes memory blueprint
    ) internal override {
        _safeMint(to, tokenId);
        if (!metadata[tokenId].initialized) {
            (BoxType boxType, uint8 tier, AccessoryType accessoryType) = _parseBlueprint(blueprint);
            metadata[tokenId] = Metadata({
                initialized: true,
                boxType: boxType,
                tier: tier,
                accessoryType: accessoryType
            });
        }
    }

    function _parseBlueprint(bytes memory blueprint)
        private
        pure
        returns (
            BoxType boxType,
            uint8 tier,
            AccessoryType accessoryType
        )
    {
        uint8 j = 0;
        uint8[] memory parsedData = new uint8[](3);

        uint256 len = blueprint.length;
        for (uint256 i = 0; i < len; i += 1) {
            if (_isDecimal(blueprint[i])) {
                parsedData[j] = uint8(blueprint[i]) - 0x30;
                j += 1;
            }
        }
        boxType = BoxType(parsedData[0]);
        tier = parsedData[1];
        accessoryType = AccessoryType(parsedData[2]);
    }
}
