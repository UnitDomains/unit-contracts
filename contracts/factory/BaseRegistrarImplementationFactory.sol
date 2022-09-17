// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./../registry/IENS.sol";
import "./../registry/ENSRegistry.sol";
import "./../root/Root.sol";
import "./../ethregistrar/IBaseRegistrar.sol";
import "./../ethregistrar/BaseRegistrarImplementation.sol";
import "./../ethregistrar/IETHRegistrarController.sol";
import "./../ethregistrar/ETHRegistrarController.sol";
import "./../ethregistrar/DummyOracle.sol";
import "./../ethregistrar/IPriceOracle.sol";
import "./../ethregistrar/LinearPremiumPriceOracle.sol";
import "./../resolvers/PublicResolver.sol";
import "./../resolvers/mocks/DummyNameWrapper.sol";
import "./../registry/IReverseRegistrar.sol";
import "./../subdomain/SubdomainRegistrar.sol";

contract BaseRegistrarImplementationFactory {
    function deploy(
        uint256 _salt,
        IENS _ens,
        bytes32[] memory baseNodes
    ) public payable returns (address) {
        return
            address(
                new BaseRegistrarImplementation{salt: bytes32(_salt)}(
                    _ens,
                    baseNodes
                )
            );
    }

    function getBytecode() public pure returns (bytes memory) {
        bytes memory bytecode = type(BaseRegistrarImplementation).creationCode;
        return bytecode;
    }

    function getBaseAddress(
        uint256 _salt,
        IENS _ens,
        bytes32[] memory _baseNodes
    ) public view returns (address) {
        // Get a hash concatenating args passed to encodePacked
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff), // 0
                address(this), // address of factory contract
                _salt, // a random salt
                keccak256(
                    abi.encodePacked(
                        type(BaseRegistrarImplementation).creationCode,
                        _ens,
                        _baseNodes
                    )
                ) // the wallet contract bytecode
            )
        );
        // Cast last 20 bytes of hash to address
        return address(uint160(uint256(hash)));
    }
}
