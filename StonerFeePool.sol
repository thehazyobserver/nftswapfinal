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

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IStakeReceipt {
    function mint(address to, uint256 originalTokenId) external returns (uint256);
    function burn(uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

// ============================================================================
// Main Contract
// ============================================================================

contract StonerFeePool is Ownable, Pausable, ReentrancyGuard, IERC721Receiver {
    // ---------- State ----------
    IERC721 public stonerNFT;
    IStakeReceipt public receiptToken;

    uint256 public totalStaked;
    uint256 public rewardPerTokenStored; // scaled as per original project
    uint256 public rewardCarry;          // remainder kept at PRECISION granularity
    uint256 public totalRewardsClaimed;

    // High precision accumulator base used to carry remainder during distribution
    uint256 private constant PRECISION = 1e18;

    struct StakeInfo {
        address staker;
        uint256 stakedAt;
        bool active;
    }

    // tokenId => info
    mapping(uint256 => StakeInfo) public stakeInfos;
    // user => tokenIds
    mapping(address => uint256[]) public stakedTokens;
    // tokenId => is staked
    mapping(uint256 => bool) public isStaked;
    // tokenId => staker (legacy/simple lookup)
    mapping(uint256 => address) public stakerOf;
    // originalId => receiptId (CRITICAL: for proper burn)
    mapping(uint256 => uint256) public receiptIdByOriginal;

    // rewards ledger (survives stake=0)
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public userRewardPerTokenPaid;

    // ---------- ERC20 Rewards System ----------
    // Track whitelisted ERC20 tokens
    mapping(address => bool) public whitelistedTokens;
    address[] public whitelistedTokensList;
    
    // ERC20 rewards tracking: token => rewardPerTokenStored (scaled by PRECISION)
    mapping(address => uint256) public erc20RewardPerTokenStored;
    // ERC20 rewards tracking: token => rewardCarry (remainder from distribution)
    mapping(address => uint256) public erc20RewardCarry;
    // ERC20 rewards tracking: token => totalRewardsClaimed
    mapping(address => uint256) public erc20TotalRewardsClaimed;
    
    // user => token => rewards
    mapping(address => mapping(address => uint256)) public erc20Rewards;
    // user => token => userRewardPerTokenPaid
    mapping(address => mapping(address => uint256)) public erc20UserRewardPerTokenPaid;

    // ---------- Events ----------
    event Staked(address indexed user, uint256 indexed tokenId);
    event Unstaked(address indexed user, uint256 indexed tokenId);
    event RewardReceived(address indexed sender, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event EmergencyUnstake(uint256 indexed tokenId, address indexed to);
    
    // ERC20 Events
    event TokenWhitelisted(address indexed token);
    event TokenRemovedFromWhitelist(address indexed token);
    event ERC20RewardReceived(address indexed token, address indexed sender, uint256 amount);
    event ERC20RewardClaimed(address indexed user, address indexed token, uint256 amount);
    
    // Emergency Withdrawal Events
    event EmergencyERC20Withdrawal(address indexed token, address indexed to, uint256 amount);
    event EmergencyETHWithdrawal(address indexed to, uint256 amount);

    // ---------- Errors (gas efficient) ----------
    error NotStaked();
    error AlreadyStaked();
    error NotYourToken();
    error NoStakers();
    error ZeroETH();
    error ZeroAddress();
    error EmptyArray();
    error TooManyTokens();
    error TransferFailed();
    error NoRewards();
    error DuplicateTokenId();
    
    // ERC20 Errors
    error TokenNotWhitelisted();
    error TokenAlreadyWhitelisted();
    error ZeroTokenAmount();
    error NoERC20Rewards();

    constructor(address _stonerNFT, address _receiptToken) {
        if (_stonerNFT == address(0) || _receiptToken == address(0)) revert ZeroAddress();

        stonerNFT = IERC721(_stonerNFT);
        receiptToken = IStakeReceipt(_receiptToken);
    }

    // ---------- Core: Stake / Unstake ----------

    function stake(uint256 tokenId) external whenNotPaused {
        if (isStaked[tokenId]) revert AlreadyStaked();

        // Settle BEFORE balance changes to avoid overpaying on the same block
        _updateReward(msg.sender);

        // Pull NFT
        stonerNFT.safeTransferFrom(msg.sender, address(this), tokenId);

        // Mark stake
        isStaked[tokenId] = true;
        stakerOf[tokenId] = msg.sender;
        stakedTokens[msg.sender].push(tokenId);

        // Timestamp analytics (lightweight)
        stakeInfos[tokenId] = StakeInfo({ staker: msg.sender, stakedAt: block.timestamp, active: true });

        // Mint receipt token (SBT recommended) - STORE RECEIPT ID
        uint256 receiptId = receiptToken.mint(msg.sender, tokenId);
        receiptIdByOriginal[tokenId] = receiptId;

        // Supply & event
        unchecked { totalStaked += 1; }
        emit Staked(msg.sender, tokenId);
    }

    function stakeMultiple(uint256[] calldata tokenIds) external whenNotPaused {
        uint256 n = tokenIds.length;
        if (n == 0) revert EmptyArray();
        if (n > 10) revert TooManyTokens();
        _checkForDuplicates(tokenIds);

        // Pre-validate ownership and status
        for (uint256 i = 0; i < n; ++i) {
            uint256 tokenId = tokenIds[i];
            if (isStaked[tokenId]) revert AlreadyStaked();
            if (stonerNFT.ownerOf(tokenId) != msg.sender) revert NotYourToken();
        }

        // Settle ONCE before balance changes
        _updateReward(msg.sender);

        for (uint256 i = 0; i < n; ++i) {
            uint256 tokenId = tokenIds[i];

            stonerNFT.safeTransferFrom(msg.sender, address(this), tokenId);

            isStaked[tokenId] = true;
            stakerOf[tokenId] = msg.sender;
            stakedTokens[msg.sender].push(tokenId);

            stakeInfos[tokenId] = StakeInfo({ staker: msg.sender, stakedAt: block.timestamp, active: true });

            // STORE RECEIPT ID FOR PROPER BURN
            uint256 receiptId = receiptToken.mint(msg.sender, tokenId);
            receiptIdByOriginal[tokenId] = receiptId;

            unchecked { totalStaked += 1; }
            emit Staked(msg.sender, tokenId);
        }
    }

    function unstake(uint256 tokenId) external whenNotPaused nonReentrant {
        if (stakerOf[tokenId] != msg.sender) revert NotYourToken();

        // Settle BEFORE balance changes
        _updateReward(msg.sender);

        // Burn receipt & clear stake - USE CORRECT RECEIPT ID
        uint256 receiptId = receiptIdByOriginal[tokenId];
        if (receiptId == 0) revert("Missing receipt");
        receiptToken.burn(receiptId);
        delete receiptIdByOriginal[tokenId];
        delete stakerOf[tokenId];
        isStaked[tokenId] = false;
        stakeInfos[tokenId].active = false;

        _removeFromArray(stakedTokens[msg.sender], tokenId);
        unchecked { totalStaked -= 1; }

        // Return NFT
        stonerNFT.safeTransferFrom(address(this), msg.sender, tokenId);
        emit Unstaked(msg.sender, tokenId);
    }

    function unstakeMultiple(uint256[] calldata tokenIds) external whenNotPaused nonReentrant {
        uint256 n = tokenIds.length;
        if (n == 0) revert EmptyArray();
        if (n > 10) revert TooManyTokens();
        _checkForDuplicates(tokenIds);

        for (uint256 i = 0; i < n; ++i) {
            if (stakerOf[tokenIds[i]] != msg.sender) revert NotYourToken();
        }

        // Settle BEFORE balance changes
        _updateReward(msg.sender);

        for (uint256 i = 0; i < n; ++i) {
            uint256 tokenId = tokenIds[i];

            // USE CORRECT RECEIPT ID FOR BURN
            uint256 receiptId = receiptIdByOriginal[tokenId];
            if (receiptId == 0) revert("Missing receipt");
            receiptToken.burn(receiptId);
            delete receiptIdByOriginal[tokenId];
            delete stakerOf[tokenId];
            isStaked[tokenId] = false;
            stakeInfos[tokenId].active = false;

            _removeFromArray(stakedTokens[msg.sender], tokenId);
            unchecked { totalStaked -= 1; }

            stonerNFT.safeTransferFrom(address(this), msg.sender, tokenId);
            emit Unstaked(msg.sender, tokenId);
        }
    }

    // ---------- Rewards ----------

    function notifyNativeReward() public payable {
        if (msg.value == 0) revert ZeroETH();
        if (totalStaked == 0) revert NoStakers();

        uint256 rewardWithCarry = (msg.value * PRECISION) + rewardCarry;
        uint256 rptIncrement = rewardWithCarry / totalStaked; // 1e18 per-NFT
        rewardCarry = rewardWithCarry % totalStaked;

        rewardPerTokenStored += rptIncrement;

        emit RewardReceived(msg.sender, msg.value);
    }

    function claimRewardsOnly() external nonReentrant {
        _updateReward(msg.sender);
        uint256 payout = rewards[msg.sender];
        if (payout == 0) revert NoRewards();

        rewards[msg.sender] = 0;
        unchecked { totalRewardsClaimed += payout; }

        (bool ok, ) = payable(msg.sender).call{value: payout}("");
        if (!ok) revert TransferFailed();

        emit RewardClaimed(msg.sender, payout);
    }

    function exit() external whenNotPaused nonReentrant {
        uint256[] memory userTokens = stakedTokens[msg.sender];
        uint256 n = userTokens.length;

        if (n > 0) {
            if (n > 10) revert TooManyTokens();
            _updateReward(msg.sender);

            for (uint256 i = n; i > 0; --i) {
                uint256 tokenId = userTokens[i - 1];

                // USE CORRECT RECEIPT ID FOR BURN
                uint256 receiptId = receiptIdByOriginal[tokenId];
                if (receiptId == 0) revert("Missing receipt");
                receiptToken.burn(receiptId);
                delete receiptIdByOriginal[tokenId];
                delete stakerOf[tokenId];
                isStaked[tokenId] = false;
                stakeInfos[tokenId].active = false;

                unchecked { totalStaked -= 1; }

                stonerNFT.safeTransferFrom(address(this), msg.sender, tokenId);
                emit Unstaked(msg.sender, tokenId);
            }

            delete stakedTokens[msg.sender];
        }

        uint256 payout = rewards[msg.sender];
        if (payout > 0) {
            rewards[msg.sender] = 0;
            unchecked { totalRewardsClaimed += payout; }
            (bool ok, ) = payable(msg.sender).call{value: payout}("");
            if (!ok) revert TransferFailed();
            emit RewardClaimed(msg.sender, payout);
        }
    }

    // ---------- ERC20 Rewards ----------

    function notifyERC20Reward(address token, uint256 amount) external {
        if (!whitelistedTokens[token]) revert TokenNotWhitelisted();
        if (amount == 0) revert ZeroTokenAmount();
        if (totalStaked == 0) revert NoStakers();

        // Transfer tokens from sender to this contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        // Calculate reward distribution with precision
        uint256 rewardWithCarry = (amount * PRECISION) + erc20RewardCarry[token];
        uint256 rptIncrement = rewardWithCarry / totalStaked;
        erc20RewardCarry[token] = rewardWithCarry % totalStaked;

        erc20RewardPerTokenStored[token] += rptIncrement;

        emit ERC20RewardReceived(token, msg.sender, amount);
    }

    function claimERC20Rewards(address token) external nonReentrant {
        if (!whitelistedTokens[token]) revert TokenNotWhitelisted();
        
        _updateReward(msg.sender);
        uint256 payout = erc20Rewards[msg.sender][token];
        if (payout == 0) revert NoERC20Rewards();

        erc20Rewards[msg.sender][token] = 0;
        unchecked { erc20TotalRewardsClaimed[token] += payout; }

        IERC20(token).transfer(msg.sender, payout);

        emit ERC20RewardClaimed(msg.sender, token, payout);
    }

    function claimAllERC20Rewards() external nonReentrant {
        _updateReward(msg.sender);
        
        uint256 tokenCount = whitelistedTokensList.length;
        bool hasClaimed = false;
        
        for (uint256 i = 0; i < tokenCount; ++i) {
            address token = whitelistedTokensList[i];
            uint256 payout = erc20Rewards[msg.sender][token];
            
            if (payout > 0) {
                erc20Rewards[msg.sender][token] = 0;
                unchecked { erc20TotalRewardsClaimed[token] += payout; }
                
                IERC20(token).transfer(msg.sender, payout);
                emit ERC20RewardClaimed(msg.sender, token, payout);
                hasClaimed = true;
            }
        }
        
        if (!hasClaimed) revert NoERC20Rewards();
    }

    function claimAllRewards() external nonReentrant {
        _updateReward(msg.sender);
        
        // Claim native rewards
        uint256 nativePayout = rewards[msg.sender];
        if (nativePayout > 0) {
            rewards[msg.sender] = 0;
            unchecked { totalRewardsClaimed += nativePayout; }
            (bool ok, ) = payable(msg.sender).call{value: nativePayout}("");
            if (!ok) revert TransferFailed();
            emit RewardClaimed(msg.sender, nativePayout);
        }
        
        // Claim ERC20 rewards
        uint256 tokenCount = whitelistedTokensList.length;
        for (uint256 i = 0; i < tokenCount; ++i) {
            address token = whitelistedTokensList[i];
            uint256 payout = erc20Rewards[msg.sender][token];
            
            if (payout > 0) {
                erc20Rewards[msg.sender][token] = 0;
                unchecked { erc20TotalRewardsClaimed[token] += payout; }
                
                IERC20(token).transfer(msg.sender, payout);
                emit ERC20RewardClaimed(msg.sender, token, payout);
            }
        }
    }

    // ---------- Internal accounting ----------

    function _updateReward(address user) internal {
        uint256 userBalance = stakedTokens[user].length;
        
        // Update native token rewards
        uint256 delta = rewardPerTokenStored - userRewardPerTokenPaid[user];
        uint256 owed = (userBalance * delta) / 1e18;
        rewards[user] += owed;
        userRewardPerTokenPaid[user] = rewardPerTokenStored;
        
        // Update ERC20 rewards for all whitelisted tokens
        _updateERC20Rewards(user, userBalance);
    }
    
    function _updateERC20Rewards(address user, uint256 userBalance) internal {
        uint256 tokenCount = whitelistedTokensList.length;
        for (uint256 i = 0; i < tokenCount; ++i) {
            address token = whitelistedTokensList[i];
            uint256 delta = erc20RewardPerTokenStored[token] - erc20UserRewardPerTokenPaid[user][token];
            uint256 owed = (userBalance * delta) / 1e18;
            erc20Rewards[user][token] += owed;
            erc20UserRewardPerTokenPaid[user][token] = erc20RewardPerTokenStored[token];
        }
    }

    function _removeFromArray(uint256[] storage array, uint256 tokenId) internal {
        uint256 len = array.length;
        for (uint256 i = 0; i < len; ++i) {
            if (array[i] == tokenId) {
                array[i] = array[len - 1];
                array.pop();
                return;
            }
        }
    }

    function _checkForDuplicates(uint256[] calldata tokenIds) internal pure {
        uint256 n = tokenIds.length;
        for (uint256 i = 0; i < n; ++i) {
            uint256 idI = tokenIds[i];
            for (uint256 j = i + 1; j < n; ++j) {
                if (idI == tokenIds[j]) revert DuplicateTokenId();
            }
        }
    }

    // ---------- Admin ----------

    function addWhitelistedToken(address token) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (whitelistedTokens[token]) revert TokenAlreadyWhitelisted();
        
        whitelistedTokens[token] = true;
        whitelistedTokensList.push(token);
        
        emit TokenWhitelisted(token);
    }

    function removeWhitelistedToken(address token) external onlyOwner {
        if (!whitelistedTokens[token]) revert TokenNotWhitelisted();
        
        whitelistedTokens[token] = false;
        
        // Remove from array
        uint256 length = whitelistedTokensList.length;
        for (uint256 i = 0; i < length; ++i) {
            if (whitelistedTokensList[i] == token) {
                whitelistedTokensList[i] = whitelistedTokensList[length - 1];
                whitelistedTokensList.pop();
                break;
            }
        }
        
        emit TokenRemovedFromWhitelist(token);
    }

    function emergencyWithdrawERC20(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        if (contractBalance == 0) revert ZeroTokenAmount();
        
        uint256 withdrawAmount = amount == 0 ? contractBalance : amount;
        if (withdrawAmount > contractBalance) revert ZeroTokenAmount();
        
        IERC20(token).transfer(to, withdrawAmount);
        
        emit EmergencyERC20Withdrawal(token, to, withdrawAmount);
    }

    function emergencyWithdrawETH(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        
        uint256 contractBalance = address(this).balance;
        if (contractBalance == 0) revert ZeroETH();
        
        uint256 withdrawAmount = amount == 0 ? contractBalance : amount;
        if (withdrawAmount > contractBalance) revert ZeroETH();
        
        (bool success, ) = payable(to).call{value: withdrawAmount}("");
        if (!success) revert TransferFailed();
        
        emit EmergencyETHWithdrawal(to, withdrawAmount);
    }

    function emergencyUnstake(uint256 tokenId, address to) external onlyOwner nonReentrant {
        if (!isStaked[tokenId]) revert NotStaked();

        address staker = stakerOf[tokenId];
        if (staker != address(0)) {
            _removeFromArray(stakedTokens[staker], tokenId);
            delete stakerOf[tokenId];
            isStaked[tokenId] = false;
            unchecked { totalStaked -= 1; }
        }

        stonerNFT.safeTransferFrom(address(this), to, tokenId);
        emit EmergencyUnstake(tokenId, to);
    }

    function emergencyUnstakeWithClaim(uint256 tokenId) external onlyOwner nonReentrant {
        if (!isStaked[tokenId]) revert NotStaked();

        address staker = stakerOf[tokenId];
        if (staker != address(0)) {
            _updateReward(staker);
            uint256 payout = rewards[staker];
            if (payout > 0) {
                rewards[staker] = 0;
                unchecked { totalRewardsClaimed += payout; }
                (bool ok, ) = payable(staker).call{value: payout}("");
                if (ok) emit RewardClaimed(staker, payout);
            }

            _removeFromArray(stakedTokens[staker], tokenId);
            delete stakerOf[tokenId];
            isStaked[tokenId] = false;
            unchecked { totalStaked -= 1; }
        }

        stonerNFT.safeTransferFrom(address(this), owner(), tokenId);
        emit EmergencyUnstake(tokenId, owner());
    }

    function registerMe() external onlyOwner {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 92)
        );
        require(_success, "FeeM registration failed");
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ---------- Views ----------

    function getStakedTokens(address user) external view returns (uint256[] memory) {
        return stakedTokens[user];
    }

    function calculatePendingRewards(address user) external view returns (uint256) {
        uint256 userBalance = stakedTokens[user].length;
        uint256 delta = rewardPerTokenStored - userRewardPerTokenPaid[user];
        return rewards[user] + ((userBalance * delta) / 1e18);
    }

    function calculatePendingERC20Rewards(address user, address token) external view returns (uint256) {
        if (!whitelistedTokens[token]) return 0;
        
        uint256 userBalance = stakedTokens[user].length;
        uint256 delta = erc20RewardPerTokenStored[token] - erc20UserRewardPerTokenPaid[user][token];
        return erc20Rewards[user][token] + ((userBalance * delta) / 1e18);
    }

    function getWhitelistedTokens() external view returns (address[] memory) {
        return whitelistedTokensList;
    }

    function getAllPendingERC20Rewards(address user) external view returns (address[] memory tokens, uint256[] memory rewardAmounts) {
        uint256 tokenCount = whitelistedTokensList.length;
        tokens = new address[](tokenCount);
        rewardAmounts = new uint256[](tokenCount);
        
        uint256 userBalance = stakedTokens[user].length;
        
        for (uint256 i = 0; i < tokenCount; ++i) {
            address token = whitelistedTokensList[i];
            tokens[i] = token;
            
            uint256 delta = erc20RewardPerTokenStored[token] - erc20UserRewardPerTokenPaid[user][token];
            rewardAmounts[i] = erc20Rewards[user][token] + ((userBalance * delta) / 1e18);
        }
    }

    function getPoolInfo() external view returns (
        address nftAddress,
        uint256 totalStakedTokens,
        uint256 totalRewards,
        uint256 contractBalance
    ) {
        return (address(stonerNFT), totalStaked, totalRewardsClaimed, address(this).balance);
    }

    function getERC20PoolInfo(address token) external view returns (
        address tokenAddress,
        uint256 totalClaimedAmount,
        uint256 contractBalance,
        bool isWhitelisted
    ) {
        return (
            token,
            erc20TotalRewardsClaimed[token],
            IERC20(token).balanceOf(address(this)),
            whitelistedTokens[token]
        );
    }

    function earned(address user) external view returns (uint256) {
        uint256 userBalance = stakedTokens[user].length;
        uint256 delta = rewardPerTokenStored - userRewardPerTokenPaid[user];
        return rewards[user] + ((userBalance * delta) / 1e18);
    }

    function earnedERC20(address user, address token) external view returns (uint256) {
        if (!whitelistedTokens[token]) return 0;
        
        uint256 userBalance = stakedTokens[user].length;
        uint256 delta = erc20RewardPerTokenStored[token] - erc20UserRewardPerTokenPaid[user][token];
        return erc20Rewards[user][token] + ((userBalance * delta) / 1e18);
    }

    function getStakeInfo(uint256 tokenId) external view returns (
        address staker,
        uint256 stakedAt,
        uint256 stakingDuration,
        bool active
    ) {
        StakeInfo memory info = stakeInfos[tokenId];
        return (info.staker, info.stakedAt, info.active ? block.timestamp - info.stakedAt : 0, info.active);
    }

    // ---------- ERC721 Receiver ----------
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable { notifyNativeReward(); }
}