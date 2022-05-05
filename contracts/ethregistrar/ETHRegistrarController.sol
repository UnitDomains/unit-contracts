// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./IPriceOracle.sol";
import "./IETHRegistrarController.sol";
import "./BaseRegistrarImplementation.sol";
import "./StringUtils.sol";
import "./SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../resolvers/Resolver.sol";

/**
 * @dev A registrar controller for registering and renewing names at fixed cost.
 */
contract ETHRegistrarController is Ownable, IETHRegistrarController {
    using StringUtils for *;
    using SafeMath for *;

    uint256 public constant MIN_REGISTRATION_DURATION = 28 days;

    BaseRegistrarImplementation immutable base;
    IPriceOracle prices;

    uint256 public minCommitmentAge; //default value:60
    uint256 public maxCommitmentAge; //default value:86400

    //commitment >= time
    mapping(bytes32 => uint256) public commitments;

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 cost,
        uint256 expires,
        uint16 baseNodeIndex
    );
    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 cost,
        uint256 expires,
        uint16 baseNodeIndex
    );
    event NewPriceOracle(address indexed oracle);

    constructor(
        BaseRegistrarImplementation _base,
        IPriceOracle _prices,
        uint256 _minCommitmentAge,
        uint256 _maxCommitmentAge
    ) {
        require(_maxCommitmentAge > _minCommitmentAge);

        base = _base;
        prices = _prices;
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
    }

    function rentPrice(
        string memory name,
        uint256 duration,
        uint16 baseNodeIndex
    ) public view returns (uint256) {
        require(
            baseNodeIndex < base.getBaseNodesLength(),
            "Index of baseNodes is out of range"
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                base.baseNodes(baseNodeIndex),
                keccak256(bytes(name))
            )
        );
        return
            prices.rentPrice(name, base.nameExpires(uint256(hash)), duration);
    }

    function registerPrice(
        string memory name,
        uint256 duration,
        uint16 baseNodeIndex
    ) public view returns (uint256) {
        require(
            baseNodeIndex < base.getBaseNodesLength(),
            "Index of baseNodes is out of range"
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                base.baseNodes(baseNodeIndex),
                keccak256(bytes(name))
            )
        );

        if (available(name, baseNodeIndex))
            return
                prices.registerPrice(
                    name,
                    base.nameExpires(uint256(hash)),
                    duration
                );
        return 0;
    }

    function valid(string memory name) public pure returns (bool) {
        return name.strlen() >= 1;
    }

    function available(string memory name, uint16 baseNodeIndex)
        public
        view
        returns (bool)
    {
        require(
            baseNodeIndex < base.getBaseNodesLength(),
            "Index of baseNodes is out of range"
        );

        bytes32 label = keccak256(
            abi.encodePacked(
                base.baseNodes(baseNodeIndex),
                keccak256(bytes(name))
            )
        );
        return valid(name) && base.available(uint256(label));
    }

    function makeCommitment(
        string memory name,
        address _owner,
        bytes32 secret,
        uint16 baseNodeIndex
    ) public view returns (bytes32) {
        return
            makeCommitmentWithConfig(
                name,
                _owner,
                secret,
                address(0),
                address(0),
                baseNodeIndex
            );
    }

    function makeCommitmentWithConfig(
        string memory name,
        address _owner,
        bytes32 secret,
        address resolver,
        address addr,
        uint16 baseNodeIndex
    ) public view returns (bytes32) {
        require(
            baseNodeIndex < base.getBaseNodesLength(),
            "Index of baseNodes is out of range"
        );

        bytes32 nodehash = keccak256(
            abi.encodePacked(
                base.baseNodes(baseNodeIndex),
                keccak256(bytes(name))
            )
        );
        if (resolver == address(0) && addr == address(0)) {
            return keccak256(abi.encodePacked(nodehash, _owner, secret));
        }
        require(resolver != address(0), "resolver must not be 0");
        return
            keccak256(
                abi.encodePacked(nodehash, _owner, resolver, addr, secret)
            );
    }

    function commit(bytes32 commitment) public {
        require(commitments[commitment] + maxCommitmentAge < block.timestamp);
        commitments[commitment] = block.timestamp;
    }

    function register(
        string calldata name,
        address _owner,
        uint256 duration,
        bytes32 secret,
        uint16 baseNodeIndex
    ) external payable {
        registerWithConfig(
            name,
            _owner,
            duration,
            secret,
            address(0),
            address(0),
            baseNodeIndex
        );
    }

    function registerWithConfig(
        string memory name,
        address _owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        address addr,
        uint16 baseNodeIndex
    ) public payable {
        require(
            baseNodeIndex < base.getBaseNodesLength(),
            "Index of baseNodes is out of range"
        );

        bytes32 commitment = makeCommitmentWithConfig(
            name,
            _owner,
            secret,
            resolver,
            addr,
            baseNodeIndex
        );

        uint256 cost = _consumeCommitment(
            name,
            duration,
            commitment,
            baseNodeIndex
        );

        // The nodehash of this name
        bytes32 nodehash = keccak256(
            abi.encodePacked(
                base.baseNodes(baseNodeIndex),
                keccak256(bytes(name))
            )
        );

        uint256 tokenId = uint256(nodehash);

        uint256 expires;

        if (resolver != address(0)) {
            // Set this contract as the (temporary) owner, giving it
            // permission to set up the resolver.

            expires = base.register(
                tokenId,
                address(this),
                duration,
                baseNodeIndex
            );

            // Set the resolver
            base.ens().setResolver(nodehash, resolver);

            // Configure the resolver
            if (addr != address(0)) {
                Resolver(resolver).setAddr(nodehash, addr);
            }

            // Now transfer full ownership to the expeceted owner

            base.reclaim(tokenId, _owner, baseNodeIndex);
            base.transferFrom(address(this), _owner, tokenId);
        } else {
            require(addr == address(0));
            expires = base.register(tokenId, _owner, duration, baseNodeIndex);
        }

        emit NameRegistered(
            name,
            nodehash,
            _owner,
            cost,
            expires,
            baseNodeIndex
        );

        // Refund any extra payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    function renew(
        string calldata name,
        uint256 duration,
        uint16 baseNodeIndex
    ) external payable {
        uint256 cost = rentPrice(name, duration, baseNodeIndex);
        require(msg.value >= cost);

        bytes32 nodehash = keccak256(
            abi.encodePacked(
                base.baseNodes(baseNodeIndex),
                keccak256(bytes(name))
            )
        );
        uint256 expires = base.renew(
            uint256(nodehash),
            duration,
            baseNodeIndex
        );

        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit NameRenewed(name, nodehash, cost, expires, baseNodeIndex);
    }

    function setPriceOracle(IPriceOracle _prices) public onlyOwner {
        prices = _prices;
        emit NewPriceOracle(address(prices));
    }

    function setCommitmentAges(
        uint256 _minCommitmentAge,
        uint256 _maxCommitmentAge
    ) public onlyOwner {
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
    }

    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function supportsInterface(bytes4 interfaceID)
        external
        pure
        returns (bool)
    {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IETHRegistrarController).interfaceId;
    }

    function _consumeCommitment(
        string memory name,
        uint256 duration,
        bytes32 commitment,
        uint16 baseNodeIndex
    ) internal returns (uint256) {
        // Require a valid commitment
        require(
            commitments[commitment] + minCommitmentAge <= block.timestamp,
            "Require a valid commitment"
        );

        // If the commitment is too old, or the name is registered, stop
        require(
            commitments[commitment] + maxCommitmentAge > block.timestamp,
            "commitment is too old,or the name is registered"
        );

        require(available(name, baseNodeIndex), "name not available");

        delete (commitments[commitment]);

        uint256 cost = rentPrice(name, duration, baseNodeIndex);
        cost = cost.add(registerPrice(name, duration, baseNodeIndex));

        require(duration >= MIN_REGISTRATION_DURATION, "Duration too short");
        require(msg.value >= cost, "Insufficient value");

        return cost;
    }
}
