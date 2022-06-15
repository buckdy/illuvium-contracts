// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@imtbl/imx-contracts/contracts/IMintable.sol";
import "@imtbl/imx-contracts/contracts/utils/Minting.sol";

/**
 * @title BaseIlluvitar, this contract is inherited from OZ ERC721 contract,
 * @dev Inherit OZ ERC721Enumerable contract
 * @dev Use IMX minting model
 * @dev Contains base functions which can be used in Portrait Layer and Accessory Layer.
 * @author Dmitry Yakovlevich
 */
abstract contract BaseIlluvitar is ERC721EnumerableUpgradeable, UUPSUpgradeable, OwnableUpgradeable, IMintable {
    /// @dev Emitted when base URI is set.
    event BaseUriUpdated(string baseUri);
    /// @dev Emitted when sale status updated.
    event OpenForSale(uint256 indexed tokenId, bool sale);

    /// @dev IMX minter contract
    address public imxMinter;
    /// @dev Open for sale status
    mapping(uint256 => bool) public openForSale;
    /// @dev Metadata initialized status
    mapping(uint256 => bool) public metadataInitialized;
    /// @dev base URI
    string internal __baseUri;

    /**
     * @dev Initialize Base Illuvitar.
     * @param name_ NFT Name
     * @param symbol_ NFT Symbol
     * @param imxMinter_ IMX Minter Address
     */
    function __BaseIlluvitar_init(
        string memory name_,
        string memory symbol_,
        address imxMinter_
    ) internal initializer {
        __ERC721_init(name_, symbol_);
        __ERC721Enumerable_init();
        __Ownable_init();

        require(imxMinter_ != address(0), "Minter cannot zero");
        imxMinter = imxMinter_;
    }

    /**
     * @dev Set base URI
     * @notice only owner can call this function.
     * @param _baseUri_ base URI.
     */
    function setBaseUri(string memory _baseUri_) external onlyOwner {
        __baseUri = _baseUri_;

        emit BaseUriUpdated(_baseUri_);
    }

    /**
     * @dev Mark for sale
     * @notice Illuvitars cannot be used in game if they are open for sale
     * @param tokenId tokenId
     * @param _sale true or false
     */
    function markForSale(uint256 tokenId, bool _sale) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        openForSale[tokenId] = _sale;
        emit OpenForSale(tokenId, _sale);
    }

    /// Return baseURI
    function _baseURI() internal view override returns (string memory) {
        return __baseUri;
    }

    /**
     * @dev Used to withdraw from IMX
     * @param to Recipient address
     * @param quantity quantity - must be 1
     * @param mintingBlob IMX minting blob string - {tokenId:blueprint}
     */
    function mintFor(
        address to,
        uint256 quantity,
        bytes calldata mintingBlob
    ) external override {
        require(quantity == 1, "Amount must be 1");
        require(msg.sender == imxMinter, "caller is not minter");
        (uint256 id, bytes memory blueprint) = Minting.split(mintingBlob);
        _mint(to, id, blueprint);
    }

    /// @dev Checks if the byte1 represented character is a decimal number or not (base 10)
    function _isDecimal(bytes1 char) internal pure returns (bool) {
        return uint8(char) >= 0x30 && uint8(char) < 0x3A;
    }

    /// @dev Mint interface with blueprint
    function _mint(
        address to,
        uint256 tokenId,
        bytes memory blueprint
    ) internal virtual;

    /// @inheritdoc UUPSUpgradeable
    function _authorizeUpgrade(address) internal virtual override onlyOwner {}

    /// @dev UUPSUpgradeable storage gap
    uint256[42] private __gap;
}
