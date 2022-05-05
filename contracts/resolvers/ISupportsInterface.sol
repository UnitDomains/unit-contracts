// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

interface ISupportsInterface {
    function supportsInterface(bytes4 interfaceID) external pure returns (bool);
}
