// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IAccessoryLayer {
    /**
     * @notice Semi-Random Accessory Items (EYE, BODY, MOUTH, HEAD)
     *
     * @dev Indiciate accessory type to choose each items
     */
    enum AccessoryType {
        Skin,
        Body,
        EyeWear,
        HeadWear,
        Props
    }

    function layerType() external view returns (AccessoryType);
}
