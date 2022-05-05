// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

interface ISubdomainRegistrar {
    event NewSubdomainRegistration(
        bytes32 indexed label,
        string subdomain,
        bytes32 indexed subdomainLabel,
        address indexed owner
    );

    event DeleteSubdomain(bytes32 indexed node, bytes32 indexed label);

    function available(bytes32 label, bytes32 subdomainLabel)
        external
        view
        returns (bool);

    function register(
        bytes32 label,
        string calldata subdomain,
        address resolver
    ) external;

    function deleteSubdomain(bytes32 node, bytes32 label) external;
}
