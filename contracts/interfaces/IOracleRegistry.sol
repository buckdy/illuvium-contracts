// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

/**
 * @title Oracle Registry interface
 *
 * @notice To make pair oracles more convenient to use, a more generic Oracle Registry
 *        interface is introduced: it stores the addresses of pair price oracles and allows
 *        searching/querying for them
 */

interface IOracleRegistry {
    /**
     * @notice Searches for the Pair Price Oracle for A/B (sell/buy) token pair
     *
     * @param tokenA token A (token to sell) address
     * @param tokenB token B (token to buy) address
     * @return pairOracle pair price oracle address for A/B token pair
     */
    function getOracle(address tokenA, address tokenB) external view returns (address pairOracle);
}
