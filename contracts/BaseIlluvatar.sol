// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IBaseIlluvatar.sol";

abstract contract BaseIlluvatar is ERC721EnumerableUpgradeable, OwnableUpgradeable, IBaseIlluvatar {
    event MinterUpdated(address indexed minter);

    // NFT Minter Address.
    address public minter;
    // LastToken ID that already minted.
    uint256 public lastTokenId;

    /**
        @notice Initialize Base Illuvatar.
        @param name_ NFT Name.
        @param symbol_ NFT Symbol.
        @param _minter NFT Minter Address.
     */
    function __BaseIlluvatar_init(
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
        @notice Mint mulitple NFTs. 
        @param to NFT receipient address.
        @param amount Amount of tokens  
     */
    function mintMultiple(address to, uint256 amount) external override {
        require(msg.sender == minter, "Not minter");

        for (uint256 i = 0; i < amount; i += 1) {
            _mint(to);
        }
    }

    /**
        @notice Set minter address. 
        @param minter_ New minter address.
     */
    function setMinter(address minter_) external onlyOwner {
        require(minter_ != address(0), "Minter cannot zero");
        minter = minter_;

        emit MinterUpdated(minter_);
    }

    /**
        @notice Safely mint.
        @param to NFT receipient address.
     */
    function _mint(address to) internal {
        lastTokenId += 1;
        _safeMint(to, lastTokenId);
    }
}
