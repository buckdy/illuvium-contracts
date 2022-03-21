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

    function mint(address to, bytes calldata data) external;

    /**
     * @notice Used to mint L1 NFT by IMX
     */
    function mintFor(
        address to,
        uint256 quantity,
        bytes calldata mintingBlob
    ) external;
}
