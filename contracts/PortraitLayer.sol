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
            ) = abi.decode(blueprint, (BoxType, uint8, uint256, uint256, uint256, uint256, uint256));
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
}
