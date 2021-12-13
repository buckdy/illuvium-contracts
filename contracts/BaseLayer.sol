// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "./BaseIlluvitar.sol";
import "./interfaces/IAccessoryLayer.sol";

/**
    @title BaseLayer, this contract is inherited BaseIlluvitar contract,
    this contract contains the function of combination and NFT metadata.
    @author Dmitry Yakovlevich
 */

contract BaseLayer is BaseIlluvitar, ERC721HolderUpgradeable {
    /**
     * @notice event emitted when list of accessory pairs (tokenId, type) are combined to the base layer.
     * @dev emitted in {combine} function.
     * @param tokenId base layer token id.
     * @param types list of accessory types.
     * @param accessoryIds list of tokenIds for each type of accessory.
     */
    event Combined(uint256 tokenId, IAccessoryLayer.Accessory[] types, uint256[] accessoryIds);

    // Metadata for each accessories
    struct Metadata {
        uint8 tier;
        mapping(IAccessoryLayer.Accessory => uint256) accessories;
    }

    // Metadata mapping
    mapping(uint256 => Metadata) private _metadatas;
    // illuvitar accessory address mapping
    mapping(IAccessoryLayer.Accessory => address) public accessoryIlluvitars;

    /**
     * @notice Initialize Base Layer.
     * @param name_ NFT Name.
     * @param symbol_ NFT Symbol.
     * @param _minter NFT Minter Address.
     * @param _eyeAddr Eye accessory address.
     * @param _bodyAddr Body accessory address.
     * @param _mouthAddr Mouth accessory address.
     * @param _headAddr Head accessory address.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address _minter,
        address _eyeAddr,
        address _bodyAddr,
        address _mouthAddr,
        address _headAddr
    ) external initializer {
        __BaseIlluvitar_init(name_, symbol_, _minter);
        __ERC721Holder_init();
        accessoryIlluvitars[IAccessoryLayer.Accessory.EYE] = _eyeAddr;
        accessoryIlluvitars[IAccessoryLayer.Accessory.BODY] = _bodyAddr;
        accessoryIlluvitars[IAccessoryLayer.Accessory.MOUTH] = _mouthAddr;
        accessoryIlluvitars[IAccessoryLayer.Accessory.HEAD] = _headAddr;
    }

    /**
     * @notice Combine list of accessory pairs (tokenId, type) onto tokenId of base layer.
     * @param tokenId Base Layer tokenId.
     * @param types List of accessory type.
     * @param accessoryIds Accessory tokenIds.
     */
    function combine(
        uint256 tokenId,
        IAccessoryLayer.Accessory[] calldata types,
        uint256[] calldata accessoryIds
    ) external {
        require(types.length > 0 && types.length == accessoryIds.length, "Invalid length");

        require(ownerOf(tokenId) == msg.sender, "This is not owner");
        Metadata storage metadata = _metadatas[tokenId];

        for (uint256 i = 0; i < types.length; i += 1) {
            require(metadata.accessories[types[i]] == 0, "Already combined");
            IERC721Upgradeable(accessoryIlluvitars[types[i]]).safeTransferFrom(
                msg.sender,
                address(this),
                accessoryIds[i]
            );
            metadata.accessories[types[i]] = accessoryIds[i];
        }
        emit Combined(tokenId, types, accessoryIds);
    }

    /**
     * @notice Get Metadata of combined item.
     * @param tokenId Base Layer tokenId.
     * @return tier and all the accessories (EYE, BODY, MOUTH, HEAD)
     */
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
            _metadatas[tokenId].accessories[IAccessoryLayer.Accessory.EYE],
            _metadatas[tokenId].accessories[IAccessoryLayer.Accessory.BODY],
            _metadatas[tokenId].accessories[IAccessoryLayer.Accessory.MOUTH],
            _metadatas[tokenId].accessories[IAccessoryLayer.Accessory.HEAD]
        );
    }
}
