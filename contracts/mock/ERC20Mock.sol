// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ERC20 Mock
 *
 * @notice Zeppelin-based ERC20 Mock simulates an ERC20 token, used for testing purposes;
 *      it has unrestricted access to the mint() function
 *
 * @author Basil Gorin, Yuri Fernandes
 */
contract ERC20Mock is ERC20 {
    /// @dev Defines if balanceOf() return value should be overridden
    bool private _balanceOfOverride;

    /// @dev Overrides balanceOf() return value if `_balanceOfOverride` is true
    uint256 private _balanceOfValue;

    /// @dev Defines if transfer() and transferFrom() return value should be overridden
    bool private _transferSuccessOverride;

    /// @dev Overrides transfer() and transferFrom() return value if `_transferSuccessOverride` is true
    bool private _transferSuccessValue;

    /// @dev Defines if transferFrom() return value should be overridden
    bool private _transferFromSuccessOverride;

    /// @dev Overrides transferFrom() return value if `_transferSuccessOverride` is true
    bool private _transferFromSuccessValue;

    /**
     * @dev Creates/deploys an ERC20 Mock instance
     *
     * @param _name token name (ERC20Metadata)
     * @param _symbol toke symbol (ERC20Metadata)
     */
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    /// @dev Sets balanceOf() override
    function setBalanceOfOverride(uint256 _value) public {
        _balanceOfOverride = true;
        _balanceOfValue = _value;
    }

    /// @dev Removes balanceOf() override
    function removeBalanceOfOverride() public {
        _balanceOfOverride = false;
    }

    /// @dev Sets transfer() and transferFrom() override
    function setTransferSuccessOverride(bool _value) public {
        _transferSuccessOverride = true;
        _transferSuccessValue = _value;
    }

    /// @dev Removes transfer() and transferFrom() override
    function removeTransferSuccessOverride() public {
        _transferSuccessOverride = false;
    }

    /// @dev Sets transferFrom() override
    function setTransferFromSuccessOverride(bool _value) public {
        _transferFromSuccessOverride = true;
        _transferFromSuccessValue = _value;
    }

    /// @dev Removes transferFrom() override
    function removeTransferFromSuccessOverride() public {
        _transferFromSuccessOverride = false;
    }

    /// @inheritdoc ERC20
    function balanceOf(address account) public view override returns (uint256) {
        return _balanceOfOverride ? _balanceOfValue : super.balanceOf(account);
    }

    /// @inheritdoc ERC20
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        bool retVal = super.transfer(recipient, amount);
        return _transferSuccessOverride ? _transferSuccessValue : retVal;
    }

    /// @inheritdoc ERC20
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        bool retVal = super.transferFrom(sender, recipient, amount);
        if (_transferFromSuccessOverride) {
            return _transferFromSuccessValue;
        }
        if (_transferSuccessOverride) {
            return _transferSuccessValue;
        }
        return retVal;
    }

    function transferInternal(
        address from,
        address to,
        uint256 value
    ) public {
        _transfer(from, to, value);
    }

    function approveInternal(
        address owner,
        address spender,
        uint256 value
    ) public {
        _approve(owner, spender, value);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
