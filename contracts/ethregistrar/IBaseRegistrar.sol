// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "../registry/IENS.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

abstract contract IBaseRegistrar is IERC721 {
    event NewBaseNode(bytes32 indexed baseNode);
    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);
    event NameMigrated(
        uint256 indexed id,
        address indexed owner,
        uint256 expires
    );
    event NameRegistered(
        uint256 indexed id,
        address indexed owner,
        uint256 expires
    );
    event NameRenewed(uint256 indexed id, uint256 expires);

    function addBaseNode(bytes32 baseNode) external virtual;

    function getBaseNodesLength() public view virtual returns (uint256);

    // Authorises a controller, who can register and renew domains.
    function addController(address controller) external virtual;

    // Revoke controller permission for an address.
    function removeController(address controller) external virtual;

    // Set the resolver for the TLD this registrar manages.
    function setResolver(address resolver, uint16 baseNodeIndex)
        external
        virtual;

    // Returns the expiration timestamp of the specified label hash.
    function nameExpires(uint256 id) external view virtual returns (uint256);

    // Returns true iff the specified name is available for registration.
    function available(uint256 id) public view virtual returns (bool);

    /**
     * @dev Register a name.
     */
    function register(
        uint256 id,
        address owner,
        uint256 duration,
        uint16 baseNodeIndex
    ) external virtual returns (uint256);

    function renew(
        uint256 id,
        uint256 duration,
        uint16 baseNodeIndex
    ) external virtual returns (uint256);

    /**
     * @dev Reclaim ownership of a name in ENS, if you own it in the registrar.
     */
    function reclaim(
        uint256 id,
        address owner,
        uint16 baseNodeIndex
    ) external virtual;
}
