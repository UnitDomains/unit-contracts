// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./IPriceOracle.sol";
import "./IPriceAggregator.sol";
import "./SafeMath.sol";
import "./StringUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// StablePriceOracle sets a price in USD, based on an oracle.
contract StablePriceOracle is Ownable, IPriceOracle {
    using SafeMath for *;
    using StringUtils for *;

    //type of payment,0:ETH,1:USD
    PaymentTypes public paymentType;

    // Rent in base price units by length. Element 0 is for 1-length names, and so on.
    uint256[] public rentPrices;

    // Register in base price units by length. Element 0 is for 1-length names, and so on.
    uint256[] public registerPrices;

    // Oracle address
    IPriceAggregator public usdOracle;

    event OracleChanged(address oracle);

    event PaymentTypeChanged(PaymentTypes _paymentType);

    event RentPriceChanged(uint256[] prices);

    event RegisterPriceChanged(uint256[] prices);

    bytes4 private constant INTERFACE_META_ID =
        bytes4(keccak256("supportsInterface(bytes4)"));
    bytes4 private constant ORACLE_ID =
        bytes4(
            keccak256("price(string,uint256,uint256)") ^
                keccak256("premium(string,uint256,uint256)")
        );

    constructor(
        IPriceAggregator _usdOracle,
        PaymentTypes _paymentType,
        uint256[] memory _registerPrices,
        uint256[] memory _rentPrices
    ) {
        usdOracle = _usdOracle;
        paymentType = _paymentType;
        setRegisterPrices(_registerPrices);
        setRentPrices(_rentPrices);
    }

    function rentPrice(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view override returns (uint256) {
        uint256 len = name.strlen();
        if (len > rentPrices.length) {
            len = rentPrices.length;
        }
        require(len > 0);

        uint256 basePrice = rentPrices[len - 1].mul(duration);
        basePrice = basePrice.add(_premium(name, expires, duration));

        if (paymentType == PaymentTypes.PaymentInEth) return basePrice;

        return attoUSDToWei(basePrice);
    }

    function registerPrice(
        string calldata name,
        uint256, /*expires*/
        uint256 /*duration*/
    ) external view override returns (uint256) {
        uint256 len = name.strlen();
        require(len > 0, "len must be greater than 0");
        if (len > registerPrices.length) {
            len = registerPrices.length;
        }

        uint256 basePrice = registerPrices[len - 1];

        if (paymentType == PaymentTypes.PaymentInEth) return basePrice;

        //Others
        return attoUSDToWei(basePrice);
    }

    function setPaymentType(PaymentTypes _paymentType) public onlyOwner {
        paymentType = _paymentType;
        emit PaymentTypeChanged(_paymentType);
    }

    /**
     * @dev Sets rent prices.
     * @param _rentPrices The price array. Each element corresponds to a specific
     *                    name length; names longer than the length of the array
     *                    default to the price of the last element. Values are
     *                    in base price units, equal to one attodollar (1e-18
     *                    dollar) each.
     */
    function setRentPrices(uint256[] memory _rentPrices) public onlyOwner {
        rentPrices = _rentPrices;
        emit RentPriceChanged(_rentPrices);
    }

    function setRegisterPrices(uint256[] memory _registerPrices)
        public
        onlyOwner
    {
        registerPrices = _registerPrices;
        emit RegisterPriceChanged(_registerPrices);
    }

    /**
     * @dev Sets the price oracle address
     * @param _usdOracle The address of the price oracle to use.
     */
    function setOracle(IPriceAggregator _usdOracle) public onlyOwner {
        usdOracle = _usdOracle;
        emit OracleChanged(address(_usdOracle));
    }

    /**
     * @dev Returns the pricing premium in wei.
     */
    function premium(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view returns (uint256) {
        return attoUSDToWei(_premium(name, expires, duration));
    }

    /**
     * @dev Returns the pricing premium in internal base units.
     */
    function _premium(
        string memory, /*name*/
        uint256, /*expires*/
        uint256 /*duration*/
    ) internal view virtual returns (uint256) {
        return 0;
    }

    function attoUSDToWei(uint256 amount) internal view returns (uint256) {
        uint256 ethPrice = uint256(usdOracle.latestAnswer());
        return amount.mul(1e8).div(ethPrice);
    }

    function weiToAttoUSD(uint256 amount) internal view returns (uint256) {
        uint256 ethPrice = uint256(usdOracle.latestAnswer());
        return amount.mul(ethPrice).div(1e8);
    }

    function supportsInterface(bytes4 interfaceID)
        public
        view
        virtual
        returns (bool)
    {
        return interfaceID == INTERFACE_META_ID || interfaceID == ORACLE_ID;
    }
}
