// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "./BaseIlluvitar.sol";
import "./interfaces/IAccessoryLayer.sol";
import "./interfaces/IPortraitLayer.sol";

/**
    @title PortraitLayer, this contract is inherited BaseIlluvitar contract,
    this contract contains the function of combination and NFT metadata.
    @author Dmitry Yakovlevich
 */

contract PortraitLayer is IPortraitLayer, BaseIlluvitar, ERC721HolderUpgradeable {
    /**
     * @notice event emitted when list of accessory pairs (tokenId, type) are combined to the base layer.
     * @dev emitted in {combine} function.
     * @param tokenId base layer token id.
     * @param accessoryType accessory type.
     * @param accessoryId accessory id to be combined.
     */
    event Combined(uint256 tokenId, IAccessoryLayer.AccessoryType accessoryType, uint256 accessoryId);

    // Combined accessories
    mapping(uint256 => mapping(IAccessoryLayer.AccessoryType => uint256)) public accessories;
    // Illuvitar accessory layer address
    address public override accessoryLayer;

    /**
     * @notice Initialize Base Layer.
     * @param name_ NFT Name.
     * @param symbol_ NFT Symbol.
     * @param _minter NFT Minter Address.
     * @param _accessoryLayer Accessory layer address
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        address _minter,
        address _accessoryLayer
    ) external initializer {
        __BaseIlluvitar_init(name_, symbol_, _minter);
        __ERC721Holder_init();

        accessoryLayer = _accessoryLayer;
    }

    /**
     * @notice Combine list of accessory pairs (tokenId, type) onto tokenId of base layer.
     * @param tokenId Base Layer tokenId.
     * @param accessoryIds Accessory tokenIds.
     */
    function combine(uint256 tokenId, uint256[] calldata accessoryIds) external {
        require(accessoryIds.length > 0, "Invalid length");

        require(ownerOf(tokenId) == msg.sender, "Not portrait layer owner");

        uint256 length = accessoryIds.length;
        for (uint256 i = 0; i < length; i += 1) {
            IAccessoryLayer.AccessoryType accessoryType = IAccessoryLayer(accessoryLayer).accessoryTypes(
                accessoryIds[i]
            );
            require(accessories[tokenId][accessoryType] == 0, "Already combined");
            IERC721Upgradeable(accessoryLayer).safeTransferFrom(msg.sender, address(this), accessoryIds[i]);
            accessories[tokenId][accessoryType] = accessoryIds[i];
            emit Combined(tokenId, accessoryType, accessoryIds[i]);
        }
    }

    /**
     * @notice Make sure to receive only accessory layer
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) public override returns (bytes4) {
        require(accessoryLayer == _msgSender(), "Not accessory");
        return this.onERC721Received.selector;
    }

    function _mint(address to, bytes calldata _data) internal override {
        lastTokenId += 1;
        _safeMint(to, lastTokenId);
        (BoxType boxType, uint8 tier) = abi.decode(_data, (BoxType, uint8));
        metadata[lastTokenId] = IlluvitarMetadata({ boxType: boxType, tier: tier });
    }
}
