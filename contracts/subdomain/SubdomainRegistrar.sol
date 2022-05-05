// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "./ISubdomainRegistrar.sol";
import "../registry/IENS.sol";
import "../resolvers/Resolver.sol";
import "../ethregistrar/BaseRegistrarImplementation.sol";
import "../ethregistrar/IBaseRegistrar.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract SubdomainRegistrar is ISubdomainRegistrar, Ownable {
    struct SubDomain {
        bytes32 tokenId; //root TokenId
        bytes32 parentNode;
    }

    mapping(bytes32 => SubDomain) subdomains;

    // The ENS registry
    IENS public immutable ens;
    IBaseRegistrar public immutable baseRegistrar;

    constructor(IENS _ens, IBaseRegistrar _baseRegistrar) {
        ens = _ens;
        baseRegistrar = _baseRegistrar;
    }

    // Returns true if the specified name is available for registration.
    function available(bytes32 label, bytes32 subdomainLabel)
        public
        view
        override
        returns (bool)
    {
        uint256 tokenId = uint256(subdomains[label].tokenId);
        if (tokenId == 0) tokenId = uint256(label);

        //Domain name cannot expire
        if (tokenId != 0 && baseRegistrar.available(tokenId)) return false;

        bytes32 subnode = keccak256(abi.encodePacked(label, subdomainLabel));

        return ens.owner(subnode) == address(0);
    }

    /**
     */
    function doRegistration(
        bytes32 node,
        bytes32 label,
        address subdomainOwner,
        Resolver resolver
    ) internal {
        // Get the subdomain so we can configure it
        ens.setSubnodeOwner(node, label, address(this));

        bytes32 subnode = keccak256(abi.encodePacked(node, label));

        if (subdomains[node].tokenId == 0) {
            subdomains[subnode].tokenId = node;
        } else {
            subdomains[subnode].tokenId = subdomains[node].tokenId;
        }

        // Set the subdomain's resolver
        ens.setResolver(subnode, address(resolver));

        // Set the address record on the resolver
        resolver.setAddr(subnode, subdomainOwner);

        // Pass ownership of the new subdomain to the registrant
        ens.setOwner(subnode, subdomainOwner);
    }

    function register(
        bytes32 label,
        string calldata subdomain,
        address resolver
    ) external {
        address subdomainOwner = msg.sender;
        bytes32 subdomainLabel = keccak256(bytes(subdomain));
        bytes32 subnode = keccak256(abi.encodePacked(label, subdomainLabel));

        // Subdomain must not be registered already.
        require(
            available(label, subdomainLabel),
            "Subdomain must not be registered already"
        );

        require(
            ens.owner(label) == msg.sender,
            "Only controller can register subdomain"
        );

        doRegistration(
            label,
            subdomainLabel,
            subdomainOwner,
            Resolver(resolver)
        );

        emit NewSubdomainRegistration(
            label,
            subdomain,
            subnode,
            subdomainOwner
        );
    }

    function deleteSubdomain(bytes32 node, bytes32 label) external {
        ens.setSubnodeRecord(
            node,
            label,
            address(0x0),
            address(0x0),
            uint64(0)
        );
        emit DeleteSubdomain(node, label);
    }

    function supportsInterface(bytes4 interfaceID)
        external
        pure
        returns (bool)
    {
        return (interfaceID == type(IERC165).interfaceId || // supportsInterface(bytes4)
            (interfaceID == type(ISubdomainRegistrar).interfaceId)); // RegistrarInterface
    }
}
