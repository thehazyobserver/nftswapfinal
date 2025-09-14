// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// ============================================================================
// Non-upgradeable OpenZeppelin Contracts (Embedded)
// ============================================================================

// Context
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

// Ownable
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// ReentrancyGuard
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
    }

    function _nonReentrantAfter() private {
        _status = _NOT_ENTERED;
    }
}

// ============================================================================
// Interfaces
// ============================================================================

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool _approved) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

// ============================================================================
// Multi-Pool Factory for Non-Proxy Deployment
// ============================================================================

/**
 * @title MultiPoolFactoryNonProxy
 * @dev Factory that creates SwapPool + StakeReceipt pairs for different NFT collections
 * @notice All created SwapPools send fees to the same central StonerFeePool
 */
contract MultiPoolFactoryNonProxy is Ownable, ReentrancyGuard {
    
    // ---------- State ----------
    address public immutable centralStonerFeePool;
    
    // Pool tracking
    mapping(address => PoolInfo) public collectionToPool;
    address[] public allCollections;
    PoolData[] public allPools;
    uint256 public poolCount;

    // Pool configuration
    uint256 public defaultSwapFeeInWei = 0.01 ether;
    uint256 public defaultStonerShare = 20; // 20%

    struct PoolInfo {
        address swapPool;
        address stakeReceipt;
        bool exists;
        uint256 createdAt;
        address creator;
    }

    struct PoolData {
        address nftCollection;
        address swapPool;
        address stakeReceipt;
        uint256 createdAt;
        address creator;
        bool active;
    }

    // ---------- Events ----------
    event FactoryDeployed(address indexed centralStonerFeePool, address indexed deployer);
    event PoolPairCreated(
        address indexed nftCollection,
        address indexed swapPool,
        address indexed stakeReceipt,
        address creator
    );
    event DefaultFeesUpdated(uint256 swapFeeInWei, uint256 stonerShare);
    event PoolDeactivated(address indexed nftCollection, address indexed swapPool);

    // ---------- Errors ----------
    error ZeroAddressNotAllowed();
    error PoolAlreadyExists();
    error InvalidShareRange();
    error InvalidERC721();
    error PoolDoesNotExist();

    // ---------- Constructor ----------
    constructor(address _centralStonerFeePool) {
        if (_centralStonerFeePool == address(0)) revert ZeroAddressNotAllowed();
        
        centralStonerFeePool = _centralStonerFeePool;
        emit FactoryDeployed(_centralStonerFeePool, msg.sender);
    }

    // ---------- Core Functions ----------

    /**
     * @dev Create a new SwapPool + StakeReceipt pair for an NFT collection
     * @param nftCollection The NFT collection address
     * @param customSwapFee Custom swap fee (0 = use default)
     * @param customStonerShare Custom stoner share (101 = use default)
     * @return swapPool The address of the created SwapPool
     * @return stakeReceipt The address of the created StakeReceipt
     */
    function createPoolPair(
        address nftCollection,
        uint256 customSwapFee,
        uint256 customStonerShare
    ) external onlyOwner returns (address swapPool, address stakeReceipt) {
        // Validation
        if (nftCollection == address(0)) revert ZeroAddressNotAllowed();
        if (collectionToPool[nftCollection].exists) revert PoolAlreadyExists();
        
        // Use custom fees or defaults
        uint256 swapFeeInWei = customSwapFee == 0 ? defaultSwapFeeInWei : customSwapFee;
        uint256 stonerShare = customStonerShare == 101 ? defaultStonerShare : customStonerShare;
        
        if (stonerShare > 100) revert InvalidShareRange();

        // Enhanced ERC721 validation
        if (!_isContract(nftCollection)) revert InvalidERC721();
        
        try IERC165(nftCollection).supportsInterface(0x80ac58cd) returns (bool supported) {
            if (!supported) revert InvalidERC721();
        } catch {
            revert InvalidERC721();
        }

        // DEPLOYMENT INSTRUCTION:
        // Deploy SwapPoolNonProxy and StakeReceipt contracts manually with these parameters:
        //
        // 1. Deploy StakeReceipt:
        //    constructor(string memory name, string memory symbol)
        //    Example: StakeReceipt("Collection A Receipt", "CAR")
        //
        // 2. Deploy SwapPoolNonProxy:
        //    constructor(
        //        address _nftCollection,      // The NFT collection
        //        address _receiptContract,    // StakeReceipt from step 1
        //        address _stonerPool,         // centralStonerFeePool
        //        uint256 _swapFeeInWei,       // swapFeeInWei
        //        uint256 _stonerShare         // stonerShare
        //    )
        //
        // 3. Call this factory's registerPoolPair() with the deployed addresses
        
        // Placeholder addresses (replace with actual deployment):
        swapPool = _predictPoolAddress(nftCollection, swapFeeInWei, stonerShare);
        stakeReceipt = _predictReceiptAddress(nftCollection, swapFeeInWei, stonerShare);

        // Update mappings
        collectionToPool[nftCollection] = PoolInfo({
            swapPool: swapPool,
            stakeReceipt: stakeReceipt,
            exists: true,
            createdAt: block.timestamp,
            creator: msg.sender
        });

        allCollections.push(nftCollection);
        
        allPools.push(PoolData({
            nftCollection: nftCollection,
            swapPool: swapPool,
            stakeReceipt: stakeReceipt,
            createdAt: block.timestamp,
            creator: msg.sender,
            active: true
        }));

        poolCount++;

        emit PoolPairCreated(nftCollection, swapPool, stakeReceipt, msg.sender);
        
        return (swapPool, stakeReceipt);
    }

    /**
     * @dev Register manually deployed pool pair
     * @param nftCollection The NFT collection address
     * @param swapPool The deployed SwapPoolNonProxy address
     * @param stakeReceipt The deployed StakeReceipt address
     */
    function registerPoolPair(
        address nftCollection,
        address swapPool,
        address stakeReceipt
    ) external onlyOwner {
        // Validation
        if (nftCollection == address(0) || swapPool == address(0) || stakeReceipt == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        if (collectionToPool[nftCollection].exists) revert PoolAlreadyExists();
        
        if (!_isContract(swapPool) || !_isContract(stakeReceipt)) {
            revert ZeroAddressNotAllowed(); // Reusing error for "not a contract"
        }

        // Update mappings
        collectionToPool[nftCollection] = PoolInfo({
            swapPool: swapPool,
            stakeReceipt: stakeReceipt,
            exists: true,
            createdAt: block.timestamp,
            creator: msg.sender
        });

        allCollections.push(nftCollection);
        
        allPools.push(PoolData({
            nftCollection: nftCollection,
            swapPool: swapPool,
            stakeReceipt: stakeReceipt,
            createdAt: block.timestamp,
            creator: msg.sender,
            active: true
        }));

        poolCount++;

        emit PoolPairCreated(nftCollection, swapPool, stakeReceipt, msg.sender);
    }

    // ---------- Admin Functions ----------

    /**
     * @dev Set default fees for new pools
     * @param newSwapFeeInWei New default swap fee in wei
     * @param newStonerShare New default stoner share percentage (0-100)
     */
    function setDefaultFees(uint256 newSwapFeeInWei, uint256 newStonerShare) external onlyOwner {
        if (newStonerShare > 100) revert InvalidShareRange();
        
        defaultSwapFeeInWei = newSwapFeeInWei;
        defaultStonerShare = newStonerShare;
        
        emit DefaultFeesUpdated(newSwapFeeInWei, newStonerShare);
    }

    /**
     * @dev Deactivate a pool pair (mark as inactive)
     * @param nftCollection The NFT collection address
     */
    function deactivatePool(address nftCollection) external onlyOwner {
        if (!collectionToPool[nftCollection].exists) revert PoolDoesNotExist();
        
        // Find and deactivate in allPools array
        for (uint256 i = 0; i < allPools.length; i++) {
            if (allPools[i].nftCollection == nftCollection) {
                allPools[i].active = false;
                break;
            }
        }
        
        emit PoolDeactivated(nftCollection, collectionToPool[nftCollection].swapPool);
    }

    // ---------- View Functions ----------

    /**
     * @dev Get pool info for a collection
     * @param nftCollection The NFT collection address
     * @return poolInfo The pool information
     */
    function getPoolInfo(address nftCollection) external view returns (PoolInfo memory poolInfo) {
        return collectionToPool[nftCollection];
    }

    /**
     * @dev Get all collections with pools
     * @return Array of NFT collection addresses
     */
    function getAllCollections() external view returns (address[] memory) {
        return allCollections;
    }

    /**
     * @dev Get all pool data
     * @return Array of pool data structs
     */
    function getAllPools() external view returns (PoolData[] memory) {
        return allPools;
    }

    /**
     * @dev Get active pools only
     * @return Array of active pool data structs
     */
    function getActivePools() external view returns (PoolData[] memory) {
        uint256 activeCount = 0;
        
        // Count active pools
        for (uint256 i = 0; i < allPools.length; i++) {
            if (allPools[i].active) {
                activeCount++;
            }
        }
        
        // Create result array
        PoolData[] memory activePools = new PoolData[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < allPools.length; i++) {
            if (allPools[i].active) {
                activePools[currentIndex] = allPools[i];
                currentIndex++;
            }
        }
        
        return activePools;
    }

    /**
     * @dev Check if a pool exists for a collection
     * @param nftCollection The NFT collection address
     * @return True if pool exists
     */
    function poolExists(address nftCollection) external view returns (bool) {
        return collectionToPool[nftCollection].exists;
    }

    /**
     * @dev Get factory statistics
     * @return totalPools Total pools created
     * @return centralPool Address of central StonerFeePool
     * @return defaultFee Default swap fee
     * @return defaultShare Default stoner share
     */
    function getFactoryStats() external view returns (
        uint256 totalPools,
        address centralPool,
        uint256 defaultFee,
        uint256 defaultShare
    ) {
        return (
            poolCount,
            centralStonerFeePool,
            defaultSwapFeeInWei,
            defaultStonerShare
        );
    }

    /**
     * @dev Get pools for multiple collections
     * @param collections Array of NFT collection addresses
     * @return poolInfos Array of corresponding pool infos
     */
    function getMultiplePoolInfos(address[] calldata collections) 
        external 
        view 
        returns (PoolInfo[] memory poolInfos) 
    {
        poolInfos = new PoolInfo[](collections.length);
        
        for (uint256 i = 0; i < collections.length; i++) {
            poolInfos[i] = collectionToPool[collections[i]];
        }
    }

    // ---------- Internal Functions ----------

    /**
     * @dev Predict pool address (placeholder for actual deployment)
     */
    function _predictPoolAddress(address nftCollection, uint256 swapFeeInWei, uint256 stonerShare) 
        internal 
        view 
        returns (address) 
    {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            block.timestamp,
            nftCollection,
            poolCount,
            swapFeeInWei,
            stonerShare,
            "SwapPool"
        )))));
    }

    /**
     * @dev Predict receipt address (placeholder for actual deployment)
     */
    function _predictReceiptAddress(address nftCollection, uint256 swapFeeInWei, uint256 stonerShare) 
        internal 
        view 
        returns (address) 
    {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            block.timestamp,
            nftCollection,
            poolCount,
            swapFeeInWei,
            stonerShare,
            "StakeReceipt"
        )))));
    }

    /**
     * @dev Check if an address is a contract
     * @param account The address to check
     * @return True if the address is a contract
     */
    function _isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
}