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

    // NFT Minter Address.
    address public minter;
    // LastToken ID that already minted.
    uint256 public lastTokenId;
    mapping(uint256 => BoxType) public boxTypes;
    mapping(uint256 => uint8) public tiers;
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
    }

    /**
     * @notice Return _baseURI - this is used to make tokenURI
     */
    function _baseURI() internal view override returns (string memory) {
        return __baseUri;
    }

    /**
     * @notice Mint single NFT.
     * @param to NFT recipient address.
     */
    function mintSingle(
        address to,
        BoxType _boxType,
        uint8 _tier
    ) external override {
        require(msg.sender == minter, "This is not minter");

        _mint(to, _boxType, _tier);
    }

    /**
     * @notice Mint mulitple NFTs.
     * @dev set proper amount value to avoid gas overflow.
     * @param to NFT recipient address.
     * @param amount Amount of tokens.
     * @param _boxTypes boxTypes of Illuvitars to mint
     * @param _tiers Tiers of Illuvitars to mint
     */
    function mintMultiple(
        address to,
        uint256 amount,
        BoxType[] calldata _boxTypes,
        uint8[] calldata _tiers
    ) external override {
        require(msg.sender == minter, "This is not minter");
        require(amount > 0 && _boxTypes.length == amount && _tiers.length == amount, "Invalid length");

        for (uint256 i = 0; i < amount; i += 1) {
            _mint(to, _boxTypes[i], _tiers[i]);
        }
    }

    /**
     * @notice Safely mint.
     * @dev inaccessible from outside.
     * @param to NFT recipient address.
     * @param boxType boxType to mint
     * @param tier Tier to mint
     */
    function _mint(
        address to,
        BoxType boxType,
        uint8 tier
    ) private {
        lastTokenId += 1;
        _safeMint(to, lastTokenId);
        boxTypes[lastTokenId] = boxType;
        tiers[lastTokenId] = tier;
    }

    function mintFor(
        address to,
        uint256 quantity,
        bytes calldata mintingBlob
    ) external override {
        require(msg.sender == minter, "This is not minter");

        BoxType[] memory _boxTypes = new BoxType[](quantity);
        uint8[] memory _tiers = new uint8[](quantity);

        for (uint256 i = 0; i < quantity; i += 1) {
            _mint(to, _boxTypes[i], _tiers[i]);
        }
    }
}
