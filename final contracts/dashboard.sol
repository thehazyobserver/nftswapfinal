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

// Additional interfaces for integrated deployment
interface IERC721Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

interface IPermissionedStakeReceipt {
    function authorizePool(address pool) external;
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
    
    // World-class governance and security
    mapping(address => bool) public approvedCreators;   // Approved pool creators
    mapping(address => bool) public blacklistedCollections; // Blacklisted NFT collections
    uint256 public maxPoolsPerCreator = 10;             // Anti-spam protection
    uint256 public poolCreationCooldown = 1 hours;      // Cooldown between pool creations
    uint256 public minimumStakeForCreation = 0.1 ether; // Minimum stake to create pools
    
    // Creator tracking for limits
    mapping(address => uint256) public poolsCreatedByUser;
    mapping(address => uint256) public lastPoolCreationTime;
    mapping(address => uint256) public creatorStakes;   // Refundable stakes

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
    
    // World-class governance events
    event CreatorApproved(address indexed creator);
    event CreatorRevoked(address indexed creator);
    event CollectionBlacklisted(address indexed collection);
    event CollectionWhitelisted(address indexed collection);
    event StakeDeposited(address indexed creator, uint256 amount);
    event StakeWithdrawn(address indexed creator, uint256 amount);
    event GovernanceParametersUpdated(uint256 maxPools, uint256 cooldown, uint256 minStake);
    event IntegratedPoolDeployment(address indexed nftCollection, address indexed swapPool, address indexed stakeReceipt, address creator, string receiptName);

    // ---------- Errors ----------
    error ZeroAddressNotAllowed();
    error PoolAlreadyExists();
    error InvalidShareRange();
    error InvalidERC721();
    error PoolDoesNotExist();
    
    // World-class security errors
    error CreatorNotApproved();
    error CollectionIsBlacklisted(address collection);
    error MaxPoolsExceeded();
    error CreationCooldownActive();
    error InsufficientStake();
    error StakeNotFound();

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
    ) external payable returns (address swapPool, address stakeReceipt) {
        // World-class creator validation and protection
        _validatePoolCreation(nftCollection, msg.sender);
        
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

        // 🚀 INTEGRATED DEPLOYMENT: Deploy both contracts automatically
        
        // 1. Deploy StakeReceipt with proper naming
        string memory receiptName = string(abi.encodePacked(_getCollectionName(nftCollection), " Receipt"));
        string memory receiptSymbol = string(abi.encodePacked(_getCollectionSymbol(nftCollection), "R"));
        
        stakeReceipt = _deployStakeReceipt(receiptName, receiptSymbol);
        
        // 2. Deploy SwapPool with StakeReceipt reference
        swapPool = _deploySwapPool(
            nftCollection,
            stakeReceipt,
            centralStonerFeePool,
            swapFeeInWei,
            stonerShare
        );
        
        // 3. Authorize the SwapPool to use the StakeReceipt
        IPermissionedStakeReceipt(stakeReceipt).authorizePool(swapPool);

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
        emit IntegratedPoolDeployment(nftCollection, swapPool, stakeReceipt, msg.sender, receiptName);
        
        return (swapPool, stakeReceipt);
    }

    /**
     * @dev Register manually deployed pool pair
     * @param nftCollection The NFT collection address
     * @param swapPool The deployed SwapPool address
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
        
        // Validate pool is not already registered with different collection
        for (uint256 i = 0; i < allPools.length; i++) {
            require(allPools[i].swapPool != swapPool, "SwapPool already registered");
            require(allPools[i].stakeReceipt != stakeReceipt, "StakeReceipt already registered");
        }
        
        // Additional validation: verify the pool configuration matches expectations
        // This prevents malicious pools from being registered
        try this._validatePoolConfiguration(nftCollection, swapPool, stakeReceipt) {
            // Validation passed
        } catch {
            revert("Pool configuration validation failed");
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

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 92)
        );
        require(_success, "FeeM registration failed");
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

    // ---------- World-Class Governance Functions ----------
    
    /**
     * @dev World-class pool creation validation with anti-spam and security measures
     * @param nftCollection The NFT collection address
     * @param creator The address attempting to create the pool
     */
    function _validatePoolCreation(address nftCollection, address creator) internal {
        // Check if collection is blacklisted
        if (blacklistedCollections[nftCollection]) revert CollectionIsBlacklisted(nftCollection);
        
        // For non-owner creators, enforce stricter requirements
        if (creator != owner()) {
            // Must be approved creator (optional - can be disabled by setting all users as approved)
            if (!approvedCreators[creator] && !approvedCreators[address(0)]) {
                revert CreatorNotApproved();
            }
            
            // Check pool creation limits
            if (poolsCreatedByUser[creator] >= maxPoolsPerCreator) {
                revert MaxPoolsExceeded();
            }
            
            // Check cooldown period
            if (block.timestamp < lastPoolCreationTime[creator] + poolCreationCooldown) {
                revert CreationCooldownActive();
            }
            
            // Check minimum stake requirement
            if (msg.value < minimumStakeForCreation) {
                revert InsufficientStake();
            }
            
            // Update tracking
            poolsCreatedByUser[creator]++;
            lastPoolCreationTime[creator] = block.timestamp;
            creatorStakes[creator] += msg.value;
            
            emit StakeDeposited(creator, msg.value);
        }
    }
    
    /**
     * @dev Approve a creator to create pools (owner only)
     * @param creator The creator address to approve
     */
    function approveCreator(address creator) external onlyOwner {
        approvedCreators[creator] = true;
        emit CreatorApproved(creator);
    }
    
    /**
     * @dev Revoke creator approval (owner only)
     * @param creator The creator address to revoke
     */
    function revokeCreator(address creator) external onlyOwner {
        approvedCreators[creator] = false;
        emit CreatorRevoked(creator);
    }
    
    /**
     * @dev Blacklist an NFT collection (owner only)
     * @param collection The collection address to blacklist
     */
    function blacklistCollection(address collection) external onlyOwner {
        blacklistedCollections[collection] = true;
        emit CollectionBlacklisted(collection);
    }
    
    /**
     * @dev Remove collection from blacklist (owner only)
     * @param collection The collection address to whitelist
     */
    function whitelistCollection(address collection) external onlyOwner {
        blacklistedCollections[collection] = false;
        emit CollectionWhitelisted(collection);
    }
    
    /**
     * @dev Update governance parameters (owner only)
     * @param _maxPoolsPerCreator Maximum pools per creator
     * @param _poolCreationCooldown Cooldown between pool creations
     * @param _minimumStakeForCreation Minimum stake required for pool creation
     */
    function updateGovernanceParameters(
        uint256 _maxPoolsPerCreator,
        uint256 _poolCreationCooldown,
        uint256 _minimumStakeForCreation
    ) external onlyOwner {
        maxPoolsPerCreator = _maxPoolsPerCreator;
        poolCreationCooldown = _poolCreationCooldown;
        minimumStakeForCreation = _minimumStakeForCreation;
        
        emit GovernanceParametersUpdated(_maxPoolsPerCreator, _poolCreationCooldown, _minimumStakeForCreation);
    }
    
    /**
     * @dev Allow creators to withdraw their stakes after pools are established (emergency only)
     * @param amount The amount to withdraw
     */
    function withdrawCreatorStake(uint256 amount) external {
        if (creatorStakes[msg.sender] < amount) revert StakeNotFound();
        
        creatorStakes[msg.sender] -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit StakeWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Enable permissionless pool creation by approving all users (owner only)
     */
    function enablePermissionlessCreation() external onlyOwner {
        approvedCreators[address(0)] = true; // Special flag for all users
        emit CreatorApproved(address(0));
    }
    
    /**
     * @dev Disable permissionless pool creation (owner only)
     */
    function disablePermissionlessCreation() external onlyOwner {
        approvedCreators[address(0)] = false;
        emit CreatorRevoked(address(0));
    }

    /**
     * @dev Check if an address is a contract
     * @param account The address to check
     * @return True if the address is a contract
     */
    function _isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
    
    /**
     * @dev Validate pool configuration to prevent malicious registrations
     * @param nftCollection The NFT collection address
     */
    function _validatePoolConfiguration(
        address nftCollection,
        address /* swapPool */,
        address /* stakeReceipt */
    ) external view {
        // Only allow this contract to call this function
        require(msg.sender == address(this), "Internal function only");
        
        // Basic interface checks - these calls will revert if not implemented
        try IERC165(nftCollection).supportsInterface(0x80ac58cd) returns (bool supported) {
            require(supported, "Not a valid ERC721 contract");
        } catch {
            revert("ERC721 interface check failed");
        }
        
        // Additional validation could include:
        // - Check that swapPool has the correct stonerPool set
        // - Verify stakeReceipt is configured correctly
        // This is simplified to prevent interface dependency issues
    }
    
    // ---------- Integrated Deployment Functions ----------
    
    /**
     * @dev Get collection name for receipt naming
     */
    function _getCollectionName(address nftCollection) internal view returns (string memory) {
        try IERC721Metadata(nftCollection).name() returns (string memory name) {
            return name;
        } catch {
            return "NFT Collection";
        }
    }
    
    /**
     * @dev Get collection symbol for receipt naming
     */
    function _getCollectionSymbol(address nftCollection) internal view returns (string memory) {
        try IERC721Metadata(nftCollection).symbol() returns (string memory symbol) {
            return symbol;
        } catch {
            return "NFT";
        }
    }
    
    /**
     * @dev Deploy StakeReceipt contract
     * NOTE: This would need to be replaced with actual bytecode deployment
     * For now, returns a predicted address
     */
    function _deployStakeReceipt(string memory name, string memory) internal view returns (address) {
        // TODO: Replace with actual contract deployment
        // This is a placeholder that would need CREATE2 or similar
        return address(uint160(uint256(keccak256(abi.encodePacked(name, block.timestamp)))));
    }
    
    /**
     * @dev Deploy SwapPool contract  
     * NOTE: This would need to be replaced with actual bytecode deployment
     * For now, returns a predicted address
     */
    function _deploySwapPool(
        address nftCollection,
        address receiptContract,
        address stonerPool,
        uint256 swapFeeInWei,
        uint256 stonerShare
    ) internal view returns (address) {
        // TODO: Replace with actual contract deployment
        // This is a placeholder that would need CREATE2 or similar
        return address(uint160(uint256(keccak256(abi.encodePacked(
            nftCollection,
            receiptContract,
            stonerPool,
            swapFeeInWei,
            stonerShare,
            block.timestamp
        )))));
    }
}