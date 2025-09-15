# Authorized Reward Senders - StonerFeePool

## Overview

The StonerFeePool contract now supports **Authorized Reward Senders** - a system that allows specific contracts to automatically whitelist ERC20 tokens when sending rewards, while maintaining security control.

## How It Works

### Before (Manual Whitelisting Required)
```solidity
// ❌ This would fail if token wasn't pre-whitelisted
contract.notifyERC20Reward(tokenAddress, amount); // Reverts with TokenNotWhitelisted
```

### After (Authorized Auto-Whitelisting)
```solidity
// ✅ Authorized contracts can auto-whitelist tokens
contract.notifyERC20Reward(tokenAddress, amount); // Works! Auto-whitelists token
```

## Security Model

- **Owner**: Can always auto-whitelist tokens
- **Authorized Senders**: Pre-approved contracts that can auto-whitelist tokens
- **Everyone Else**: Must use pre-whitelisted tokens only

## Setup Process

### 1. Authorize Your Contracts
```solidity
// As contract owner, authorize your SwapPool contracts
stonerFeePool.setAuthorizedRewardSender(swapPoolAddress, true);
stonerFeePool.setAuthorizedRewardSender(gameContractAddress, true);
stonerFeePool.setAuthorizedRewardSender(daoTreasuryAddress, true);
```

### 2. External Contracts Send Rewards
```solidity
contract YourGameContract {
    address constant STONER_FEE_POOL = 0xF589111A4Af712142E68ce917751a4BFB8966dEe;
    
    function distributeRewards(address token, uint256 amount) external {
        // Get tokens
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // Approve StonerFeePool
        IERC20(token).approve(STONER_FEE_POOL, amount);
        
        // Send rewards (auto-whitelists token if this contract is authorized)
        IStonerFeePool(STONER_FEE_POOL).notifyERC20Reward(token, amount);
    }
}
```

## New Functions Added

### Management Functions (Owner Only)

```solidity
function setAuthorizedRewardSender(address sender, bool authorized) external onlyOwner
```
- Authorize/deauthorize contracts to auto-whitelist tokens
- Emits `AuthorizedSenderUpdated(sender, authorized)` event

### View Functions

```solidity
function isAuthorizedRewardSender(address sender) external view returns (bool)
```
- Check if an address can auto-whitelist tokens
- Returns `true` for owner and authorized senders

## Example Usage

### Authorize Your SwapPool
```javascript
// Frontend/script to authorize your boat swap pool
const stonerFeePool = new ethers.Contract(STONER_FEE_POOL_ADDRESS, abi, signer);
await stonerFeePool.setAuthorizedRewardSender("0x2ce24bc81E4Baf1e49Fb61Ec4ED1e58395EC3119", true);
```

### Check Authorization Status
```javascript
const isAuthorized = await stonerFeePool.isAuthorizedRewardSender("0x2ce24bc81E4Baf1e49Fb61Ec4ED1e58395EC3119");
console.log("Boat SwapPool authorized:", isAuthorized);
```

## Benefits

✅ **Security**: Only pre-approved contracts can auto-whitelist tokens
✅ **Convenience**: No manual whitelisting needed for trusted contracts  
✅ **Flexibility**: Can add/remove authorized senders anytime
✅ **Backward Compatible**: Existing manual whitelisting still works
✅ **Prevents Boat Token Issue**: Authorized contracts automatically handle proper notification

## Migration Path

1. **Deploy Updated Contract**: With authorized sender functionality
2. **Authorize Existing Contracts**: Add your SwapPools, game contracts, etc.
3. **Update External Contracts**: They can now send any ERC20 as rewards
4. **Remove Manual Whitelisting**: No longer needed for authorized senders

## Events

```solidity
event AuthorizedSenderUpdated(address indexed sender, bool authorized);
event TokenWhitelisted(address indexed token); // Still emitted for auto-whitelisting
```

This system solves the boat token problem by ensuring authorized contracts like SwapPools can send any ERC20 token as rewards without requiring manual pre-whitelisting, while maintaining security against spam tokens.