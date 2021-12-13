// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IBaseIlluvitar {
    /**
     * @notice call this function if required to mint multiple NFTs.
     *
     * @param to NFT receipient address
     * @param amount amount of tokens
     *
     * @dev This function is part of the BaseIlluvitar flow
     */
    function mintMultiple(address to, uint256 amount) external;
}
