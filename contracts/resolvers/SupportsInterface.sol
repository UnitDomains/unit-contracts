// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./ISupportsInterface.sol";

abstract contract SupportsInterface is ISupportsInterface {
    function supportsInterface(bytes4 interfaceID)
        public
        pure
        virtual
        override
        returns (bool)
    {
        return interfaceID == type(ISupportsInterface).interfaceId;
    }
}
