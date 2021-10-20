// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./BaseIlluvatar.sol";

contract BaseLayer is BaseIlluvatar {
    enum Accessory {
        EYE,
        BODY,
        MOUTH,
        HEAD
    }

    struct Metadata {
        uint8 tier;
        mapping(Accessory => uint256) accessories;
    }

    mapping(uint256 => Metadata) private _metadatas;
    mapping(Accessory => address) public accessoryIlluvatars;

    function combine(
        uint256 tokenId,
        Accessory[] calldata types,
        uint256[] calldata accessoryIds
    ) external {
        require(types.length > 0 && types.length == accessoryIds.length, "Invalid length");

        require(ownerOf(tokenId) == msg.sender, "Not owner");
        Metadata storage metadata = _metadatas[tokenId];

        for (uint256 i = 0; i < types.length; i += 1) {
            require(metadata.accessories[types[i]] == 0, "Already combined");
            IERC721Upgradeable(accessoryIlluvatars[types[i]]).safeTransferFrom(
                msg.sender,
                address(this),
                accessoryIds[i]
            );
            metadata.accessories[types[i]] = accessoryIds[i];
        }
    }

    function getMetadata(uint256 tokenId)
        external
        view
        returns (
            uint8,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (
            _metadatas[tokenId].tier,
            _metadatas[tokenId].accessories[Accessory.EYE],
            _metadatas[tokenId].accessories[Accessory.BODY],
            _metadatas[tokenId].accessories[Accessory.MOUTH],
            _metadatas[tokenId].accessories[Accessory.HEAD]
        );
    }
}
