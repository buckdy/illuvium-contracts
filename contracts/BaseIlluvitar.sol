// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IBaseIlluvitar.sol";

/**
    @title BaseIlluvitar, this contract is inherited from OZ ERC721 contract,
    this contains base functions which can be used in Base Layer and Accessory Contract.
    @dev abstract contract!
    @author Dmitry Yakovlevich
 */

abstract contract BaseIlluvitar is ERC721EnumerableUpgradeable, OwnableUpgradeable, IBaseIlluvitar {
    /**
     * @notice event emitted when new minter is set.
     * @dev emitted in {setMinter} function.
     * @param minter new minter address.
     */
    event MinterUpdated(address indexed minter);

    /**
     * @notice event emitted when base URI is set.
     * @dev emitted in {setBaseUri} function.
     * @param baseUri new base uri.
     */
    event BaseUriUpdated(string baseUri);

    struct IlluvitarMetadata {
        BoxType boxType;
        uint8 tier;
    }

    // NFT Minter Address.
    address public minter;
    // LastToken ID that already minted.
    uint256 public lastTokenId;
    mapping(uint256 => IlluvitarMetadata) public metadata;
    string internal __baseUri;

    /**
     * @notice Initialize Base Illuvitar.
     * @param name_ NFT Name.
     * @param symbol_ NFT Symbol.
     * @param _minter NFT Minter Address.
     */
    function __BaseIlluvitar_init(
        string memory name_,
        string memory symbol_,
        address _minter
    ) internal initializer {
        __ERC721_init(name_, symbol_);
        __ERC721Enumerable_init();
        __Ownable_init();

        require(_minter != address(0), "Minter cannot zero");
        minter = _minter;
    }

    /**
     * @notice Set minter address.
     * @dev only owner can call this function.
     * @param minter_ New minter address.
     */
    function setMinter(address minter_) external onlyOwner {
        require(minter_ != address(0), "Minter cannot zero");
        minter = minter_;

        emit MinterUpdated(minter_);
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
     * @param _data mint data
     */
    function _mint(address to, bytes calldata _data) internal virtual;

    function mintFor(
        address to,
        uint256 quantity,
        bytes calldata mintingBlob
    ) external override {
        require(quantity == 1, "Amount must be 1");
        require(msg.sender == minter, "caller is not minter");
        _mint(to, mintingBlob);
    }
}
