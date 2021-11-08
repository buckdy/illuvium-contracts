// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

interface IOracle {
    function getTokenAmount(uint256 etherAmount) external view returns (uint256);
}
