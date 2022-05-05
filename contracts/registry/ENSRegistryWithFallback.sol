// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./IENS.sol";
import "./ENSRegistry.sol";

/**
 * The ENS registry contract.
 */
contract ENSRegistryWithFallback is ENSRegistry {
    IENS public old; //集成老的ens合约，比如一代的ens合约

    /**
     * @dev Constructs a new ENS registrar.
     */
    constructor(IENS _old) ENSRegistry() {
        old = _old;
    }

    /**
     * 下面方法大多都是判断在新的ens中有没有对应记录，没有就是旧ens合约中的信息
     * @dev Returns the address of the resolver for the specified node.
     * @param node The specified node.
     * @return address of the resolver.
     */
    function resolver(bytes32 node) public view override returns (address) {
        if (!recordExists(node)) {
            return old.resolver(node);
        }

        return super.resolver(node);
    }

    /**
     * @dev Returns the address that owns the specified node.
     * @param node The specified node.
     * @return address of the owner.
     */
    function owner(bytes32 node) public view override returns (address) {
        if (!recordExists(node)) {
            return old.owner(node);
        }

        return super.owner(node);
    }

    /**
     * @dev Returns the TTL of a node, and any records associated with it.
     * @param node The specified node.
     * @return ttl of the node.
     */
    function ttl(bytes32 node) public view override returns (uint64) {
        if (!recordExists(node)) {
            return old.ttl(node);
        }

        return super.ttl(node);
    }

    function _setOwner(bytes32 node, address _owner) internal override {
        address addr = _owner;
        if (addr == address(0x0)) {
            addr = address(this);
        }

        super._setOwner(node, addr);
    }
}
