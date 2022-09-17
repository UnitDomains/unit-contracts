// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./IPriceAggregator.sol";

contract DummyOracle is IPriceAggregator {
    int256 value;

    constructor(int256 _value) {
        set(_value);
    }

    function set(int256 _value) public {
        value = _value;
    }

    function latestAnswer() public view override returns (int256) {
        return value;
    }
}
