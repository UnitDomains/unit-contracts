// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./../registry/IENS.sol";
import "./../registry/ENSRegistry.sol";
import "./../registry/IReverseRegistrar.sol";
import "./../registry/ReverseRegistrar.sol";

contract ReverseRegistrarFactory {
    function deploy(uint256 _salt, IENS _ens) public payable returns (address) {
        return address(new ReverseRegistrar{salt: bytes32(_salt)}(_ens));
    }

    function getBytecode() public pure returns (bytes memory) {
        bytes memory bytecode = type(ReverseRegistrar).creationCode;
        return bytecode;
    }

    function getAddress(uint256 _salt, IENS _ens)
        public
        view
        returns (address)
    {
        // Get a hash concatenating args passed to encodePacked
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff), // 0
                address(this), // address of factory contract
                _salt, // a random salt
                keccak256(
                    abi.encodePacked(type(ReverseRegistrar).creationCode, _ens)
                ) // the wallet contract bytecode
            )
        );
        // Cast last 20 bytes of hash to address
        return address(uint160(uint256(hash)));
    }
}
