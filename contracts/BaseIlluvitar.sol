// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@imtbl/imx-contracts/contracts/IMintable.sol";
import "@imtbl/imx-contracts/contracts/utils/Minting.sol";

/**
    @title BaseIlluvitar, this contract is inherited from OZ ERC721 contract,
    this contains base functions which can be used in Base Layer and Accessory Contract.
    @dev abstract contract!
    @author Dmitry Yakovlevich
 */

abstract contract BaseIlluvitar is ERC721EnumerableUpgradeable, UUPSUpgradeable, OwnableUpgradeable, IMintable {
    /**
     * @notice event emitted when base URI is set.
     * @dev emitted in {setBaseUri} function.
     * @param baseUri new base uri.
     */
    event BaseUriUpdated(string baseUri);

    // NFT Minter Address.
    address public imxMinter;
    string internal __baseUri;

    /**
     * @notice Initialize Base Illuvitar.
     * @param name_ NFT Name.
     * @param symbol_ NFT Symbol.
     * @param imxMinter_ NFT Minter Address.
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
     * @notice Set base URI
     * @dev only owner can call this function.
     * @param _baseUri_ base URI.
     */
    function setBaseUri(string memory _baseUri_) external onlyOwner {
        __baseUri = _baseUri_;

        emit BaseUriUpdated(_baseUri_);
    }

    /**
     * @notice Return _baseURI - this is used to make tokenURI
     */
    function _baseURI() internal view override returns (string memory) {
        return __baseUri;
    }

    /**
     * @notice Safely mint.
     * @dev inaccessible from outside.
     * @param to NFT recipient address.
     * @param tokenId NFT tokenId.
     * @param blueprint mint data.
     */
    function _mint(
        address to,
        uint256 tokenId,
        bytes memory blueprint
    ) internal virtual;

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

    /**
     * @dev Checks if the byte1 represented character is a decimal number or not (base 10)
     *
     * @return true if the character represents a decimal number
     */
    function _isDecimal(bytes1 char) internal pure returns (bool) {
        return uint8(char) >= 0x30 && uint8(char) < 0x3A;
    }

    /// @inheritdoc UUPSUpgradeable
    function _authorizeUpgrade(address) internal virtual override onlyOwner {}

    /// @dev UUPSUpgradeable storage gap
    uint256[42] private __gap;
}
