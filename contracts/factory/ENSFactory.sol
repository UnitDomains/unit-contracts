// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./../registry/IENS.sol";
import "./../registry/ENSRegistry.sol";
import "./../root/Root.sol";

bytes32 constant ZERO_HASH = 0x0000000000000000000000000000000000000000000000000000000000000000;

contract ENSFactory {
    // The ENS registry
    IENS public ens;

    // Returns the address of the newly deployed contract
    function deployENSRegistry(uint256 _salt) public payable returns (address) {
        ens = new ENSRegistry{salt: bytes32(_salt)}();
        return address(ens);
    }

    function getENSRegistryBytecode() public pure returns (bytes memory) {
        bytes memory bytecode = type(ENSRegistry).creationCode;
        return bytecode;
    }

    function getENSRegistryAddress(uint256 _salt)
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
                keccak256(getENSRegistryBytecode()) // the wallet contract bytecode
            )
        );
        // Cast last 20 bytes of hash to address
        return address(uint160(uint256(hash)));
    }

    function deployRoot(uint256 _salt) public payable returns (address) {
        Root root = new Root{salt: bytes32(_salt)}(ens);
        root.setController(msg.sender, true);
        ens.setOwner(ZERO_HASH, address(root));
        return address(root);
    }

    function getRootBytecode() public pure returns (bytes memory) {
        bytes memory bytecode = type(Root).creationCode;
        return bytecode;
    }

    function getRootAddress(uint256 _salt) public view returns (address) {
        // Get a hash concatenating args passed to encodePacked
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff), // 0
                address(this), // address of factory contract
                _salt, // a random salt
                keccak256(getRootBytecode()) // the wallet contract bytecode
            )
        );
        // Cast last 20 bytes of hash to address
        return address(uint160(uint256(hash)));
    }
}
