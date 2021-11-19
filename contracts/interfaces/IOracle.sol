// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IOracle {
    /**
     * @notice Updates the oracle with the price values if required, for example
     *      the cumulative price at the start and end of a period, etc.
     *
     * @dev This function is part of the oracle maintenance flow
     */
    function update() external;

    /**
     * @notice For a pair of tokens A/B (sell/buy), consults on the amount of token B to be
     *      bought if the specified amount of token A to be sold
     *
     * @dev This function is part of the oracle usage flow
     *
     * @param token token A (token to sell) address
     * @param amountIn amount of token A to sell
     * @return amountOut amount of token B to be bought
     */
    function consult(address token, uint256 amountIn) external view returns (uint256);
}
