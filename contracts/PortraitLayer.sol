// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./BaseIlluvitar.sol";
import "./DataTypes.sol";

/**
    @title PortraitLayer, this contract is inherited BaseIlluvitar contract,
    this contract contains the function of combination and NFT metadata.
    @author Dmitry Yakovlevich
 */

contract PortraitLayer is BaseIlluvitar {
    struct Metadata {
        bool initialized;
        BoxType boxType;
        uint8 tier;
        // Bonded accessory token ids
        uint256 skinId;
        uint256 bodyId;
        uint256 eyeId;
        uint256 headId;
        uint256 propsId;
    }

    mapping(uint256 => Metadata) public metadata;

    /**
     * @notice Initialize Base Layer.
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

    function _mint(
        address to,
        uint256 tokenId,
        bytes memory blueprint
    ) internal override {
        _safeMint(to, tokenId);
        if (!metadata[tokenId].initialized) {
            (
                BoxType boxType,
                uint8 tier,
                uint256 skinTokenId,
                uint256 bodyTokenId,
                uint256 eyeTokenId,
                uint256 headTokenId,
                uint256 propsTokenId
            ) = _parseBlueprint(blueprint);
            metadata[tokenId] = Metadata({
                initialized: true,
                boxType: boxType,
                tier: tier,
                skinId: skinTokenId,
                bodyId: bodyTokenId,
                eyeId: eyeTokenId,
                headId: headTokenId,
                propsId: propsTokenId
            });
        }
    }

    function _parseBlueprint(bytes memory blueprint)
        private
        pure
        returns (
            BoxType boxType,
            uint8 tier,
            uint256 skinTokenId,
            uint256 bodyTokenId,
            uint256 eyeTokenId,
            uint256 headTokenId,
            uint256 propsTokenId
        )
    {
        uint8 j = 0;

        uint256 len = blueprint.length;
        uint8 p;
        for (; p < len; p += 1) {
            if (_isDecimal(blueprint[p])) {
                if (j == 0) {
                    boxType = BoxType(uint8(blueprint[p]) - 0x30);
                } else if (j == 1) {
                    tier = uint8(blueprint[p]) - 0x30;
                    p += 1;
                    break;
                }
                j += 1;
            }
        }

        (skinTokenId, p) = _atoi(blueprint, p);
        (bodyTokenId, p) = _atoi(blueprint, p);
        (eyeTokenId, p) = _atoi(blueprint, p);
        (headTokenId, p) = _atoi(blueprint, p);
        (propsTokenId, p) = _atoi(blueprint, p);
    }

    /**
     * @dev Simplified version of StringUtils.atoi to convert a bytes string
     *      to unsigned integer using ten as a base
     * @dev Stops on invalid input (wrong character for base ten) and returns
     *      the position within a string where the wrong character was encountered
     *
     * @dev Throws if input string contains a number bigger than uint256
     *
     * @param a numeric string to convert
     * @param offset an index to start parsing from, set to zero to parse from the beginning
     * @return i a number representing given string
     * @return p an index where the conversion stopped
     */
    function _atoi(bytes memory a, uint8 offset) internal pure returns (uint256 i, uint8 p) {
        // skip wrong characters in the beginning of the string if any
        for (p = offset; p < a.length; p++) {
            // check if digit is valid and meets the base 10
            if (_isDecimal(a[p])) {
                // we've found decimal character, skipping stops
                break;
            }
        }

        // if there weren't any digits found
        if (p == a.length) {
            // just return a zero result
            return (0, offset);
        }

        // iterate over the rest of the string (bytes buffer)
        for (; p < a.length; p++) {
            // check if digit is valid and meets the base 10
            if (!_isDecimal(a[p])) {
                // we've found bad character, parsing stops
                break;
            }

            // move to the next digit slot
            i *= 10;

            // extract the digit and add it to the result
            i += uint8(a[p]) - 0x30;
        }

        // return the result
        return (i, p);
    }
}
