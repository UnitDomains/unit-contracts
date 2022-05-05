// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import "../registry/IENS.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./IBaseRegistrar.sol";

contract BaseRegistrarImplementation is ERC721, IBaseRegistrar, Ownable {
    using Strings for uint256;

    // A map of expiry times
    mapping(uint256 => uint256) expiries;

    // The ENS registry
    IENS public immutable ens;

    // The namehashs of the TLD this registrar owns (eg, .eth)
    bytes32[] public baseNodes;

    // A map of addresses that are authorised to register and renew names.
    mapping(address => bool) public controllers;

    uint256 public constant GRACE_PERIOD = 90 days; //宽限期为90天

    bytes4 private constant INTERFACE_META_ID =
        bytes4(keccak256("supportsInterface(bytes4)"));

    bytes4 private constant ERC721_ID =
        bytes4(
            keccak256("balanceOf(address)") ^
                keccak256("ownerOf(uint256)") ^
                keccak256("approve(address,uint256)") ^
                keccak256("getApproved(uint256)") ^
                keccak256("setApprovalForAll(address,bool)") ^
                keccak256("isApprovedForAll(address,address)") ^
                keccak256("transferFrom(address,address,uint256)") ^
                keccak256("safeTransferFrom(address,address,uint256)") ^
                keccak256("safeTransferFrom(address,address,uint256,bytes)")
        );
    bytes4 private constant RECLAIM_ID =
        bytes4(keccak256("reclaim(uint256,address)"));

    // Base URI
    string private _baseURIValue;

    /**
     * v2.1.3 version of _isApprovedOrOwner which calls ownerOf(tokenId) and takes grace period into consideration instead of ERC721.ownerOf(tokenId);
     * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.1.3/contracts/token/ERC721/ERC721.sol#L187
     * @dev Returns whether the given spender can transfer a given token ID
     * @param spender address of the spender to query
     * @param tokenId uint256 ID of the token to be transferred
     * @return bool whether the msg.sender is approved for the given token ID,
     *    is an operator of the owner, or is the owner of the token
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId)
        internal
        view
        override
        returns (bool)
    {
        address _owner = ownerOf(tokenId);
        return (spender == _owner ||
            getApproved(tokenId) == spender ||
            isApprovedForAll(_owner, spender));
    }

    constructor(IENS _ens, bytes32[] memory _baseNodes) ERC721("", "") {
        ens = _ens;
        baseNodes = _baseNodes;
    }

    modifier live(uint16 baseNodeIndex) {
        require(
            baseNodeIndex < baseNodes.length,
            "Index of baseNodes is out of range"
        );

        require(ens.owner(baseNodes[baseNodeIndex]) == address(this));
        _;
    }

    modifier onlyController() {
        require(controllers[msg.sender]);
        _;
    }

    function addBaseNode(bytes32 baseNode) external override onlyOwner {
        baseNodes.push(baseNode);
        emit NewBaseNode(baseNode);
    }

    function getBaseNodesLength() public view override returns (uint256) {
        return baseNodes.length;
    }

    /**
     * @dev Gets the owner of the specified token ID. Names become unowned
     *      when their registration expires.
     * @param tokenId uint256 ID of the token to query the owner of
     * @return address currently marked as the owner of the given token ID
     */
    function ownerOf(uint256 tokenId)
        public
        view
        override(IERC721, ERC721)
        returns (address)
    {
        require(expiries[tokenId] > block.timestamp);
        return super.ownerOf(tokenId);
    }

    // Authorises a controller, who can register and renew domains.
    function addController(address controller) external override onlyOwner {
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }

    // Revoke controller permission for an address.
    function removeController(address controller) external override onlyOwner {
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }

    // Set the resolver for the TLD this registrar manages.
    function setResolver(address resolver, uint16 baseNodeIndex)
        external
        override
        onlyOwner
    {
        require(
            baseNodeIndex < baseNodes.length,
            "Index of baseNodes is out of range"
        );
        ens.setResolver(baseNodes[baseNodeIndex], resolver);
    }

    // Returns the expiration timestamp of the specified id.
    function nameExpires(uint256 id) external view override returns (uint256) {
        return expiries[id];
    }

    // Returns true iff the specified name is available for registration.
    function available(uint256 id) public view override returns (bool) {
        // Not available if it's registered here or in its grace period.
        return expiries[id] + GRACE_PERIOD < block.timestamp;
    }

    /**
     * @dev Register a name.
     * @param id The token ID (keccak256 of the label).
     * @param _owner The address that should own the registration.
     * @param duration Duration in seconds for the registration.
     */
    function register(
        uint256 id,
        address _owner,
        uint256 duration,
        uint16 baseNodeIndex
    ) external override returns (uint256) {
        return _register(id, _owner, duration, true, baseNodeIndex);
    }

    /**
     * @dev Register a name, without modifying the registry.
     * @param id The token ID (keccak256 of the label).
     * @param _owner The address that should own the registration.
     * @param duration Duration in seconds for the registration.
     */
    function registerOnly(
        uint256 id,
        address _owner,
        uint256 duration,
        uint16 baseNodeIndex
    ) external returns (uint256) {
        return _register(id, _owner, duration, false, baseNodeIndex);
    }

    function _register(
        uint256 id,
        address _owner,
        uint256 duration,
        bool updateRegistry,
        uint16 baseNodeIndex
    ) internal live(baseNodeIndex) onlyController returns (uint256) {
        require(
            baseNodeIndex < baseNodes.length,
            "Index of baseNodes is out of range"
        );

        require(available(id));

        require(
            block.timestamp + duration + GRACE_PERIOD >
                block.timestamp + GRACE_PERIOD
        ); // Prevent future overflow

        expiries[id] = block.timestamp + duration;

        if (_exists(id)) {
            // Name was previously owned, and expired

            _burn(id);
        }

        _mint(_owner, id);

        if (updateRegistry) {
            ens.setTLDSubnodeOwner(
                baseNodes[baseNodeIndex],
                bytes32(id),
                _owner
            );
        }

        emit NameRegistered(id, _owner, block.timestamp + duration);

        return block.timestamp + duration;
    }

    function renew(
        uint256 id,
        uint256 duration,
        uint16 baseNodeIndex
    ) external override live(baseNodeIndex) onlyController returns (uint256) {
        require(expiries[id] + GRACE_PERIOD >= block.timestamp); // Name must be registered here or in grace period

        require(
            expiries[id] + duration + GRACE_PERIOD > duration + GRACE_PERIOD
        ); // Prevent future overflow

        expiries[id] += duration;
        emit NameRenewed(id, expiries[id]);
        return expiries[id];
    }

    /**
     * @dev Reclaim ownership of a name in ENS, if you own it in the registrar.
     */
    function reclaim(
        uint256 id,
        address _owner,
        uint16 baseNodeIndex
    ) external override live(baseNodeIndex) {
        require(_isApprovedOrOwner(msg.sender, id));

        require(baseNodeIndex < baseNodes.length);

        ens.setTLDSubnodeOwner(baseNodes[baseNodeIndex], bytes32(id), _owner);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        //require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        require(
            !available(tokenId),
            "BaseRegistrarImplementation: URI query for nonexistent token"
        );

        string memory baseURI = _baseURI();
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenId.toHexString(32)))
                : "";
    }

    function setBaseURI(string memory name_) public onlyOwner {
        _baseURIValue = name_;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIValue;
    }

    function supportsInterface(bytes4 interfaceID)
        public
        pure
        override(ERC721, IERC165)
        returns (bool)
    {
        return
            interfaceID == INTERFACE_META_ID ||
            interfaceID == ERC721_ID ||
            interfaceID == RECLAIM_ID;
    }
}
