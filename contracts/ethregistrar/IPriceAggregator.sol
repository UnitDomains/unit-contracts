// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

interface IPriceAggregator {
    function latestAnswer() external view returns (int256);
}
