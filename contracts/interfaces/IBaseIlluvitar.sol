// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IBaseIlluvitar {
    enum BoxType {
        Virtual,
        Bronze,
        Silver,
        Gold,
        Platinum,
        Diamond
    }

    /**
     * @notice call this function if required to mint multiple NFTs.
     * @dev set proper amount value to avoid gas overflow.
     * @param to NFT receipient address
     * @param amount amount of tokens
     */
    function mintMultiple(
        address to,
        uint256 amount,
        BoxType[] calldata boxTypes
    ) external;
}
