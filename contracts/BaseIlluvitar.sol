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
     * @notice Mint mulitple NFTs.
     * @dev set proper amount value to avoid gas overflow.
     * @param to NFT receipient address.
     * @param amount Amount of tokens.
     */
    function mintMultiple(address to, uint256 amount) external override {
        require(msg.sender == minter, "This is not minter");

        for (uint256 i = 0; i < amount; i += 1) {
            _mint(to);
        }
    }

    /**
     * @notice Safely mint.
     * @dev inaccessible from outside.
     * @param to NFT receipient address.
     */
    function _mint(address to) private {
        lastTokenId += 1;
        _safeMint(to, lastTokenId);
    }
}
