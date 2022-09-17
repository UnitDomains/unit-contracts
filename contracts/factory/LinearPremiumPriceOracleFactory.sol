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

contract LinearPremiumPriceOracleFactory {
    function deploy(
        uint256 _salt,
        IPriceAggregator _usdOracle,
        IPriceOracle.PaymentTypes _paymentType,
        uint256[] memory _registerPrices,
        uint256[] memory _rentPrices,
        uint256 _initialPremium,
        uint256 _premiumDecreaseRate
    ) public payable returns (address) {
        return
            address(
                new LinearPremiumPriceOracle{salt: bytes32(_salt)}(
                    _usdOracle,
                    _paymentType,
                    _registerPrices,
                    _rentPrices,
                    _initialPremium,
                    _premiumDecreaseRate
                )
            );
    }

    function getBytecode() public pure returns (bytes memory) {
        bytes memory bytecode = type(LinearPremiumPriceOracle).creationCode;
        return bytecode;
    }

    function getAddress(
        uint256 _salt,
        IPriceAggregator _usdOracle,
        IPriceOracle.PaymentTypes _paymentType,
        uint256[] memory _registerPrices,
        uint256[] memory _rentPrices,
        uint256 _initialPremium,
        uint256 _premiumDecreaseRate
    ) public view returns (address) {
        // Get a hash concatenating args passed to encodePacked
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff), // 0
                address(this), // address of factory contract
                _salt, // a random salt
                keccak256(
                    abi.encodePacked(
                        type(LinearPremiumPriceOracle).creationCode,
                        _usdOracle,
                        _paymentType,
                        _registerPrices,
                        _rentPrices,
                        _initialPremium,
                        _premiumDecreaseRate
                    )
                ) // the wallet contract bytecode
            )
        );
        // Cast last 20 bytes of hash to address
        return address(uint160(uint256(hash)));
    }
}
