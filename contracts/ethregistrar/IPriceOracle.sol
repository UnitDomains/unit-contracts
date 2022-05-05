// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

interface IPriceOracle {
    enum PaymentTypes {
        PaymentInEth,
        PaymentInUSD
    }

    /**
     * @dev Returns the price to renew a name.
     * @param name The name being renewed.
     * @param expires When the name presently expires (0 if this is a new registration).
     * @param duration How long the name is being registered or extended for, in seconds.
     * @return The price of this renewal or registration, in wei.
     */
    function rentPrice(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view returns (uint256);

    /**
     * @dev Returns the price to register a name.
     * @param name The name being registered .
     * @param expires When the name presently expires (0 if this is a new registration).
     * @param duration How long the name is being registered or extended for, in seconds.
     * @return The price of this renewal or registration, in wei.
     */
    function registerPrice(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view returns (uint256);
}
