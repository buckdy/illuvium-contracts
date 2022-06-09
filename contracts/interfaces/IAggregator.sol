// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

interface IAggregator {
    function latestAnswer() external view returns (int256 answer);
}
