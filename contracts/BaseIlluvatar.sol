// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

abstract contract BaseIlluvatar is ERC721Upgradeable, OwnableUpgradeable {
    event MinterUpdated(address indexed minter);

    address public minter;
    uint256 public lastTokenId;

    function __BaseIlluvatar_init(
        string memory name_,
        string memory symbol_,
        address _minter
    ) internal initializer {
        __ERC721_init(name_, symbol_);
        __Ownable_init();

        minter = _minter;
    }

    function mintMultiple(address to, uint256 amount) external {
        require(msg.sender == minter, "Not minter");

        for (uint256 i = 0; i < amount; i += 1) {
            _mint(to);
        }
    }

    function setMinter(address minter_) external onlyOwner {
        require(minter_ != address(0), "Minter cannot zero");
        minter = minter_;

        emit MinterUpdated(minter_);
    }

    function _mint(address to) internal {
        lastTokenId += 1;
        _safeMint(to, lastTokenId);
    }
}
