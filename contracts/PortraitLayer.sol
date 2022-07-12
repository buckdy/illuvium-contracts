// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./BaseIlluvitar.sol";
import "./DataTypes.sol";

/**
 * @title Portrait Layer
 * @dev inherit BaseIlluvitar
 * @author Dmitry Yakovlevich
 */
contract PortraitLayer is BaseIlluvitar {
    /// @dev Portrait Metadata struct
    struct Metadata {
        uint8 tier; // tier
        // Bonded accessory token ids
        uint256 skinId; // bonded skin id
        uint256 bodyId; // bonded body id
        uint256 eyeId; // bonded eye wear id
        uint256 headId; // bonded head wear id
        uint256 propsId; // bonded props id
    }

    /// @dev Portrait metadata
    mapping(uint256 => Metadata) public metadata;

    /**
     * @dev Initialize Portrait Layer.
     * @param name_ NFT Name
     * @param symbol_ NFT Symbol
     * @param imxMinter_ IMX Minter Address
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address imxMinter_
    ) external initializer {
        __BaseIlluvitar_init(name_, symbol_, imxMinter_);
    }

    /**
     * @dev Mint Portrait with blueprint.
     * @dev blueprint has format of `a,b,c,d,e,f`
     *      a : tier
            b : bonded skin id
            c : bonded body id
            d : bonded eye wear id
            e : bonded head wear id
            f : bonded props id
     * @param to Recipient address
     * @param tokenId Token id
     * @param blueprint Portrait blueprint
     */
    function _mint(
        address to,
        uint256 tokenId,
        bytes memory blueprint
    ) internal override {
        _safeMint(to, tokenId);
        (
            uint8 tier,
            uint256 skinTokenId,
            uint256 bodyTokenId,
            uint256 eyeTokenId,
            uint256 headTokenId,
            uint256 propsTokenId
        ) = _parseBlueprint(blueprint);
        metadata[tokenId] = Metadata({
            tier: tier,
            skinId: skinTokenId,
            bodyId: bodyTokenId,
            eyeId: eyeTokenId,
            headId: headTokenId,
            propsId: propsTokenId
        });
        metadataInitialized[tokenId] = true;
    }

    /// @dev Parse blueprint
    function _parseBlueprint(bytes memory blueprint)
        private
        pure
        returns (
            uint8 tier,
            uint256 skinTokenId,
            uint256 bodyTokenId,
            uint256 eyeTokenId,
            uint256 headTokenId,
            uint256 propsTokenId
        )
    {
        uint256 len = blueprint.length;
        uint8 p;

        p = _skipNonDecimal(blueprint, p);
        require(_isDecimal(blueprint[p + 1]), "Wrong blueprint format");
        tier = uint8(blueprint[p++]) - 0x30;
        (skinTokenId, p) = _atoi(blueprint, p);
        (bodyTokenId, p) = _atoi(blueprint, p);
        (eyeTokenId, p) = _atoi(blueprint, p);
        (headTokenId, p) = _atoi(blueprint, p);
        (propsTokenId, p) = _atoi(blueprint, p);
        p = _skipNonDecimal(blueprint, p);
        require(p == len, "Wrong blueprint format");
    }

    /**
     * @dev Skip non-decimal characters and return the index of the first decimal
     *
     * @dev If no decimal character is present, it will return the length of `a`
     *
     * @param a numeric string to convert
     * @param offset an index to start parsing from, set to zero to parse from the beginning
     * @return p an index where the conversion stopped
     */
    function _skipNonDecimal(bytes memory a, uint8 offset) internal pure returns (uint8 p) {
        // skip wrong characters in the beginning of the string if any
        for (p = offset; p < a.length; p++) {
            // check if digit is valid and meets the base 10
            if (_isDecimal(a[p])) {
                // we've found decimal character, skipping stops
                return p;
            }
        }
        return p;
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
        p = _skipNonDecimal(a, offset);

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
