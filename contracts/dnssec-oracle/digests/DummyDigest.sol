// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./Digest.sol";

/**
 * @dev Implements a dummy DNSSEC digest that approves all hashes, for testing.
 */
contract DummyDigest is Digest {
    function verify(bytes calldata, bytes calldata)
        external
        pure
        override
        returns (bool)
    {
        return true;
    }
}