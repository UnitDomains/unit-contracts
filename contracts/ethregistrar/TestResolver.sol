// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

/**
 * @dev A test resolver implementation
 */
contract TestResolver {
    mapping(bytes32 => address) addresses;

    constructor() {}

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return interfaceID == 0x01ffc9a7 || interfaceID == 0x3b3b57de;
    }

    function addr(bytes32 node) public view returns (address) {
        return addresses[node];
    }

    function setAddr(bytes32 node, address _addr) public {
        addresses[node] = _addr;
    }
}
