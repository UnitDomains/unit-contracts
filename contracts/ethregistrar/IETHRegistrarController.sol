// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./IPriceOracle.sol";

interface IETHRegistrarController {
    function rentPrice(
        string memory name,
        uint256 duration,
        uint16 baseNodeIndex
    ) external view returns (uint256);

    function registerPrice(
        string memory name,
        uint256 duration,
        uint16 baseNodeIndex
    ) external view returns (uint256);

    function available(string memory, uint16 baseNodeIndex)
        external
        returns (bool);

    function makeCommitment(
        string memory name,
        address _owner,
        bytes32 secret,
        uint16 baseNodeIndex
    ) external returns (bytes32);

    function commit(bytes32) external;

    function register(
        string calldata name,
        address _owner,
        uint256 duration,
        bytes32 secret,
        uint16 baseNodeIndex
    ) external payable;

    function renew(
        string calldata name,
        uint256 duration,
        uint16 baseNodeIndex
    ) external payable;
}
