// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IAccessoryLayer {
    /**
     * @notice Semi-Random Accessory Items (EYE, BODY, MOUTH, HEAD)
     *
     * @dev Indiciate accessory type to choose each items
     */
    enum Accessory {
        EYE,
        BODY,
        MOUTH,
        HEAD
    }
}
