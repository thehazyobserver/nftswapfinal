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

// Pausable
abstract contract Pausable is Context {
    event Paused(address account);
    event Unpaused(address account);

    bool private _paused;

    constructor() {
        _paused = false;
    }

    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    modifier whenPaused() {
        _requirePaused();
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function _requireNotPaused() internal view virtual {
        require(!paused(), "Pausable: paused");
    }

    function _requirePaused() internal view virtual {
        require(paused(), "Pausable: not paused");
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
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

// IERC165
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// IERC721
interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

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

// IERC721Receiver
interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

// ============================================================================
// Contract Interfaces
// ============================================================================

interface IReceiptContract {
    function mint(address to, uint256 originalTokenId) external returns (uint256 receiptTokenId);
    function burn(uint256 receiptTokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function getOriginalTokenId(uint256 receiptTokenId) external view returns (uint256);
    function validateReceipt(uint256 receiptTokenId, address expectedPool) external view returns (bool);
}

// ============================================================================
// Main Contract
// ============================================================================

contract SwapPoolNative is Ownable, Pausable, ReentrancyGuard, IERC721Receiver {

    // Core state variables
    address public nftCollection;
    address public receiptContract;
    address public stonerPool;
    uint256 public swapFeeInWei;
    uint256 public stonerShare; // Percentage (0–100)
    bool public initialized;

    // Liquidity / limits
    uint256 public minPoolSize = 5;
    uint256 public maxBatchSize = 10;
    uint256 public maxUnstakeAllLimit = 20;

    // Pool token tracking
    uint256[] public poolTokens;
    mapping(uint256 => uint256) public tokenIndexInPool;
    mapping(uint256 => bool) public tokenInPool;

    // Reward system
    struct StakeInfo {
        address staker;
        uint256 stakedAt;
        bool active;
    }
    
    mapping(uint256 => StakeInfo) public stakeInfos;           // receiptTokenId => info
    mapping(address => uint256[]) public userStakes;           // user => receiptTokenIds[]
    mapping(uint256 => uint256) public receiptToOriginalToken; // receiptId => originalTokenId
    mapping(uint256 => uint256) public originalToReceiptToken; // originalTokenId => receiptId

    uint256 public totalStaked;
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public totalRewardsDistributed;

    // Precision helpers
    uint256 private constant PRECISION = 1e18;
    uint256 private rewardCarry; // remainder in PRECISION units
    uint256 private totalPrecisionRewards;

    // User reward tracking
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public userRewardPerTokenPaid;

    // Batch operation flags
    bool private _inBatchOperation;
    uint256[] private _batchReceiptTokens;
    uint256[] private _batchReturnedTokens;

    // Events
    event SwapExecuted(address indexed user, uint256 tokenIdIn, uint256 tokenIdOut, uint256 feePaid);
    event BatchSwapExecuted(address indexed user, uint256 swapCount, uint256 totalFeePaid);
    event Staked(address indexed user, uint256 tokenId, uint256 receiptTokenId);
    event Unstaked(address indexed user, uint256 tokenId, uint256 receiptTokenId);
    event BatchUnstaked(address indexed user, uint256[] receiptTokenIds, uint256[] tokensReceived);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDistributed(uint256 amount);
    event SwapFeeUpdated(uint256 newFeeInWei);
    event StonerShareUpdated(uint256 newShare);
    event BatchLimitsUpdated(uint256 newMaxBatchSize, uint256 newMaxUnstakeAll);
    event FeeSplit(uint256 stonerAmount, uint256 rewardsAmount);

    // Errors
    error AlreadyInitialized();
    error NotInitialized();
    error InvalidStonerShare();
    error TokenUnavailable();
    error IncorrectFee();
    error NotReceiptOwner();
    error TokenNotStaked();
    error NoRewardsToClaim();
    error InvalidReceiptToken();
    error NoTokensAvailable();
    error SameTokenSwap();
    error InsufficientLiquidity(uint256 available, uint256 minimum);
    error NotTokenOwner();
    error TokenNotApproved();

    modifier onlyInitialized() {
        if (!initialized) revert NotInitialized();
        _;
    }
    
    modifier minimumLiquidity() {
        if (poolTokens.length < minPoolSize) revert InsufficientLiquidity(poolTokens.length, minPoolSize);
        _;
    }
    
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            pendingRewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(
        address _nftCollection,
        address _receiptContract,
        address _stonerPool,
        uint256 _swapFeeInWei,
        uint256 _stonerShare
    ) {
        if (_stonerShare > 100) revert InvalidStonerShare();

        nftCollection = _nftCollection;
        receiptContract = _receiptContract;
        stonerPool = _stonerPool;
        swapFeeInWei = _swapFeeInWei;
        stonerShare = _stonerShare;
        initialized = true;

        lastUpdateTime = block.timestamp;
    }

    // -------------------- SWAP --------------------
    function swapNFT(uint256 tokenIdIn)
        external
        payable
        whenNotPaused
        onlyInitialized
        minimumLiquidity
        nonReentrant
        updateReward(address(0))
    {
        if (msg.value != swapFeeInWei) revert IncorrectFee();

        // Get random token from pool
        uint256 tokenIdOut = _getRandomAvailableToken();
        if (tokenIdOut == tokenIdIn) revert SameTokenSwap();

        // Transfer user's NFT to pool
        IERC721(nftCollection).transferFrom(msg.sender, address(this), tokenIdIn);
        _addTokenToPool(tokenIdIn);

        // Remove selected token from pool and transfer to user
        _removeTokenFromPool(tokenIdOut);
        IERC721(nftCollection).safeTransferFrom(address(this), msg.sender, tokenIdOut);

        // Fee distribution
        uint256 stonerAmount = (msg.value * stonerShare) / 100;
        uint256 rewardsAmount = msg.value - stonerAmount;

        if (stonerAmount > 0) {
            (bool success, ) = payable(stonerPool).call{value: stonerAmount}("");
            require(success, "Stoner pool transfer failed");
        }

        // Distribute rewards if there are stakers
        if (rewardsAmount > 0 && totalStaked > 0) {
            uint256 rewardWithCarry = (rewardsAmount * PRECISION) + rewardCarry;
            uint256 rewardPerTokenIncrement = rewardWithCarry / totalStaked;
            rewardCarry = rewardWithCarry % totalStaked;

            rewardPerTokenStored += rewardPerTokenIncrement;
            totalRewardsDistributed += rewardsAmount;
            emit RewardsDistributed(rewardsAmount);
        }

        emit SwapExecuted(msg.sender, tokenIdIn, tokenIdOut, msg.value);
        emit FeeSplit(stonerAmount, rewardsAmount);
    }

    function swapNFTBatch(uint256[] calldata tokenIdsIn)
        external
        payable
        whenNotPaused
        onlyInitialized
        minimumLiquidity
        nonReentrant
        updateReward(address(0))
    {
        uint256 swapCount = tokenIdsIn.length;
        require(swapCount > 0 && swapCount <= maxBatchSize, "Invalid batch size");
        
        uint256 totalFeeRequired = swapCount * swapFeeInWei;
        if (msg.value != totalFeeRequired) revert IncorrectFee();

        _checkForDuplicates(tokenIdsIn);

        // Validate sufficient liquidity
        if (poolTokens.length < swapCount) revert InsufficientLiquidity(poolTokens.length, swapCount);

        _inBatchOperation = true;
        delete _batchReturnedTokens;

        // Execute swaps
        for (uint256 i = 0; i < swapCount; ++i) {
            uint256 tokenIdIn = tokenIdsIn[i];
            uint256 tokenIdOut = _getRandomAvailableToken();
            
            // Prevent self-swap
            while (tokenIdOut == tokenIdIn && poolTokens.length > 1) {
                tokenIdOut = _getRandomAvailableToken();
            }

            // Transfer user's NFT to pool
            IERC721(nftCollection).transferFrom(msg.sender, address(this), tokenIdIn);
            _addTokenToPool(tokenIdIn);

            // Remove selected token from pool and transfer to user
            _removeTokenFromPool(tokenIdOut);
            IERC721(nftCollection).safeTransferFrom(address(this), msg.sender, tokenIdOut);
            
            _batchReturnedTokens.push(tokenIdOut);
        }

        // Fee distribution
        uint256 stonerAmount = (msg.value * stonerShare) / 100;
        uint256 rewardsAmount = msg.value - stonerAmount;

        if (stonerAmount > 0) {
            (bool success, ) = payable(stonerPool).call{value: stonerAmount}("");
            require(success, "Stoner pool transfer failed");
        }

        // Distribute rewards
        if (rewardsAmount > 0 && totalStaked > 0) {
            uint256 rewardWithCarry = (rewardsAmount * PRECISION) + rewardCarry;
            uint256 rewardPerTokenIncrement = rewardWithCarry / totalStaked;
            rewardCarry = rewardWithCarry % totalStaked;

            rewardPerTokenStored += rewardPerTokenIncrement;
            totalRewardsDistributed += rewardsAmount;
            emit RewardsDistributed(rewardsAmount);
        }

        _inBatchOperation = false;

        emit BatchSwapExecuted(msg.sender, swapCount, msg.value);
        emit FeeSplit(stonerAmount, rewardsAmount);
    }

    // -------------------- STAKE --------------------
    function stakeNFT(uint256 tokenId)
        external
        whenNotPaused
        onlyInitialized
        updateReward(msg.sender)
    {
        IERC721(nftCollection).transferFrom(msg.sender, address(this), tokenId);
        uint256 receiptTokenId = IReceiptContract(receiptContract).mint(msg.sender, tokenId);

        stakeInfos[receiptTokenId] = StakeInfo(msg.sender, block.timestamp, true);
        userStakes[msg.sender].push(receiptTokenId);
        receiptToOriginalToken[receiptTokenId] = tokenId;
        originalToReceiptToken[tokenId] = receiptTokenId;

        totalStaked++;
        emit Staked(msg.sender, tokenId, receiptTokenId);
    }

    function unstakeNFT(uint256 receiptTokenId)
        external
        whenNotPaused
        onlyInitialized
        updateReward(msg.sender)
    {
        _unstakeNFTInternal(receiptTokenId);
    }

    function unstakeNFTBatch(uint256[] calldata receiptTokenIds)
        external
        whenNotPaused
        onlyInitialized
        updateReward(msg.sender)
    {
        uint256 batchSize = receiptTokenIds.length;
        require(batchSize > 0 && batchSize <= maxBatchSize, "Invalid batch size");

        delete _batchReceiptTokens;
        delete _batchReturnedTokens;

        for (uint256 i = 0; i < batchSize; ++i) {
            _unstakeNFTInternal(receiptTokenIds[i]);
            _batchReceiptTokens.push(receiptTokenIds[i]);
            _batchReturnedTokens.push(receiptToOriginalToken[receiptTokenIds[i]]);
        }

        emit BatchUnstaked(msg.sender, _batchReceiptTokens, _batchReturnedTokens);
    }

    function unstakeAllNFTs()
        external
        whenNotPaused
        onlyInitialized
        updateReward(msg.sender)
    {
        uint256[] memory userReceiptTokens = userStakes[msg.sender];
        uint256 stakeCount = userReceiptTokens.length;
        require(stakeCount > 0, "No staked NFTs");
        require(stakeCount <= maxUnstakeAllLimit, "Too many staked NFTs");

        delete _batchReceiptTokens;
        delete _batchReturnedTokens;

        // Process in reverse order to avoid array index issues
        for (uint256 i = stakeCount; i > 0; --i) {
            uint256 receiptTokenId = userReceiptTokens[i - 1];
            _unstakeNFTInternal(receiptTokenId);
            _batchReceiptTokens.push(receiptTokenId);
            _batchReturnedTokens.push(receiptToOriginalToken[receiptTokenId]);
        }

        emit BatchUnstaked(msg.sender, _batchReceiptTokens, _batchReturnedTokens);
    }

    function _unstakeNFTInternal(uint256 receiptTokenId) internal {
        if (IReceiptContract(receiptContract).ownerOf(receiptTokenId) != msg.sender) {
            revert NotReceiptOwner();
        }
        if (!stakeInfos[receiptTokenId].active) revert TokenNotStaked();

        uint256 originalTokenId = receiptToOriginalToken[receiptTokenId];
        
        // Update state
        stakeInfos[receiptTokenId].active = false;
        delete receiptToOriginalToken[receiptTokenId];
        delete originalToReceiptToken[originalTokenId];
        totalStaked--;

        // Remove from user's stake list
        _removeFromUserStakes(msg.sender, receiptTokenId);

        // Burn receipt and return original NFT
        IReceiptContract(receiptContract).burn(receiptTokenId);
        IERC721(nftCollection).safeTransferFrom(address(this), msg.sender, originalTokenId);

        emit Unstaked(msg.sender, originalTokenId, receiptTokenId);
    }

    // -------------------- REWARDS --------------------
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 reward = pendingRewards[msg.sender];
        if (reward == 0) revert NoRewardsToClaim();

        pendingRewards[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Reward transfer failed");

        emit RewardsClaimed(msg.sender, reward);
    }

    function claimRewardsOnly() external nonReentrant updateReward(msg.sender) {
        uint256 reward = pendingRewards[msg.sender];
        if (reward == 0) revert NoRewardsToClaim();

        pendingRewards[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Reward transfer failed");

        emit RewardsClaimed(msg.sender, reward);
    }

    function exit()
        external
        whenNotPaused
        onlyInitialized
        updateReward(msg.sender)
    {
        // Unstake all NFTs
        uint256[] memory userReceiptTokens = userStakes[msg.sender];
        uint256 stakeCount = userReceiptTokens.length;

        if (stakeCount > 0) {
            require(stakeCount <= maxUnstakeAllLimit, "Too many staked NFTs");
            
            for (uint256 i = stakeCount; i > 0; --i) {
                uint256 receiptTokenId = userReceiptTokens[i - 1];
                _unstakeNFTInternal(receiptTokenId);
            }
        }

        // Claim rewards
        uint256 reward = pendingRewards[msg.sender];
        if (reward > 0) {
            pendingRewards[msg.sender] = 0;
            (bool success, ) = payable(msg.sender).call{value: reward}("");
            require(success, "Reward transfer failed");
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    // -------------------- INTERNAL HELPERS --------------------
    function _addTokenToPool(uint256 tokenId) internal {
        tokenIndexInPool[tokenId] = poolTokens.length;
        poolTokens.push(tokenId);
        tokenInPool[tokenId] = true;
    }
    
    function _removeTokenFromPool(uint256 tokenId) internal {
        uint256 tokenIndex = tokenIndexInPool[tokenId];
        uint256 lastTokenId = poolTokens[poolTokens.length - 1];
        
        poolTokens[tokenIndex] = lastTokenId;
        tokenIndexInPool[lastTokenId] = tokenIndex;
        
        poolTokens.pop();
        delete tokenIndexInPool[tokenId];
        tokenInPool[tokenId] = false;
    }
    
    function _getRandomAvailableToken() internal view returns (uint256) {
        require(poolTokens.length > 0, "No tokens in pool");
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % poolTokens.length;
        return poolTokens[randomIndex];
    }
    
    function _checkForDuplicates(uint256[] calldata tokenIds) internal pure {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            for (uint256 j = i + 1; j < tokenIds.length; ++j) {
                require(tokenIds[i] != tokenIds[j], "Duplicate token IDs");
            }
        }
    }
    
    function _removeFromUserStakes(address user, uint256 receiptTokenId) internal {
        uint256[] storage stakes = userStakes[user];
        for (uint256 i = 0; i < stakes.length; ++i) {
            if (stakes[i] == receiptTokenId) {
                stakes[i] = stakes[stakes.length - 1];
                stakes.pop();
                break;
            }
        }
    }

    // -------------------- REWARD VIEW --------------------
    function rewardPerToken() public view returns (uint256) {
        return rewardPerTokenStored; // Simplified for this implementation
    }
    
    function earned(address account) public view returns (uint256) {
        uint256 userBalance = getUserActiveStakeCount(account);
        return pendingRewards[account] + 
               (userBalance * (rewardPerToken() - userRewardPerTokenPaid[account])) / PRECISION;
    }
    
    function getUserActiveStakeCount(address user) public view returns (uint256 count) {
        uint256[] memory stakes = userStakes[user];
        for (uint256 i = 0; i < stakes.length; ++i) {
            if (stakeInfos[stakes[i]].active) {
                count++;
            }
        }
    }

    // -------------------- ADMIN --------------------
    function setSwapFee(uint256 newFeeInWei) external onlyOwner {
        swapFeeInWei = newFeeInWei;
        emit SwapFeeUpdated(newFeeInWei);
    }
    
    function setStonerShare(uint256 newShare) external onlyOwner {
        if (newShare > 100) revert InvalidStonerShare();
        stonerShare = newShare;
        emit StonerShareUpdated(newShare);
    }
    
    function setBatchLimits(uint256 newMaxBatchSize, uint256 newMaxUnstakeAll) external onlyOwner {
        maxBatchSize = newMaxBatchSize;
        maxUnstakeAllLimit = newMaxUnstakeAll;
        emit BatchLimitsUpdated(newMaxBatchSize, newMaxUnstakeAll);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    function emergencyWithdraw(uint256 tokenId) external onlyOwner {
        IERC721(nftCollection).safeTransferFrom(address(this), owner(), tokenId);
    }
    
    function emergencyWithdrawETH() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }

    // -------------------- VIEWS --------------------
    function getPoolTokens() external view returns (uint256[] memory) {
        return poolTokens;
    }
    
    function getPoolSize() external view returns (uint256) {
        return poolTokens.length;
    }
    
    function getUserStakes(address user) external view returns (uint256[] memory) {
        return userStakes[user];
    }

    function getContractInfo() external view returns (
        address nft,
        address receipt,
        address stoner,
        uint256 fee,
        uint256 share,
        uint256 poolSize,
        uint256 stakedCount
    ) {
        return (nftCollection, receiptContract, stonerPool, swapFeeInWei, stonerShare, poolTokens.length, totalStaked);
    }

    // -------------------- ERC721 RECEIVER --------------------
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}