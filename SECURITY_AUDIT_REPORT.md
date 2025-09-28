# Smart Contract Security Audit Report
**Project:** PASS THE JPEG (NFT Swap Protocol)  
**Date:** September 28, 2025  
**Auditor:** AI Security Analysis  

## Executive Summary

This audit covers the main smart contracts in the PASS THE JPEG protocol, focusing on critical security vulnerabilities, access control issues, and potential attack vectors. The protocol implements NFT swapping with staking rewards and fee distribution mechanisms.

## Contracts Audited

1. **SwapPool.sol** - Main swap pool contract handling NFT swaps and staking
2. **StakeReceipt.sol** - ERC721 receipt tokens for staked NFTs
3. **StonerFeePool.sol** - Fee collection and distribution for Stoner NFT holders
4. **swappooldashboard.sol** - Factory contract for creating pool pairs

## 🔴 CRITICAL FINDINGS

### 1. **Reentrancy Vulnerability in Fee Distribution** (HIGH RISK)
**File:** `SwapPool.sol`, lines 318-322, 383-387
```solidity
if (stonerAmount > 0) {
    (bool success, ) = payable(stonerPool).call{value: stonerAmount}("");
    require(success, "Stoner pool transfer failed");  // ⚠️ VULNERABLE
}
```
**Issue:** External call to `stonerPool` can trigger reentrancy attacks
**Impact:** Attacker could drain contract funds by re-entering during fee distribution
**Recommendation:** Use pull payment pattern or ensure nonReentrant modifier covers all paths

### 2. **Integer Overflow in Reward Calculations** (HIGH RISK)
**File:** `SwapPool.sol`, lines 325-328
```solidity
uint256 rewardWithCarry = (rewardsAmount * PRECISION) + rewardCarry;
uint256 rewardPerTokenIncrement = rewardWithCarry / totalStaked;  // ⚠️ OVERFLOW RISK
```
**Issue:** No SafeMath protection, potential overflow with large reward amounts
**Impact:** Incorrect reward calculations, potential loss of funds
**Recommendation:** Implement overflow checks or use Solidity 0.8+ built-in overflow protection

### 3. **Access Control Bypass in StakeReceipt** (HIGH RISK)
**File:** `StakeReceipt.sol`, lines 1782-1786
```solidity
modifier onlyPool() {
    if (msg.sender != pool) revert OnlyPool();
    _;
}
```
**Issue:** Pool address can be set only once, but no validation of caller authority
**Impact:** If pool is compromised, all receipt tokens are at risk
**Recommendation:** Add additional access controls and validation

## 🟡 MEDIUM RISK FINDINGS

### 4. **Weak Randomness in Token Selection** (MEDIUM RISK)
**File:** `SwapPool.sol` (referenced but not shown in audit scope)
**Issue:** `_getRandomAvailableToken()` likely uses predictable randomness
**Impact:** MEV attacks, frontrunning possibilities
**Recommendation:** Use Chainlink VRF or commit-reveal scheme

### 5. **Missing Zero Address Checks** (MEDIUM RISK)
**Files:** Multiple contracts
**Issue:** Constructor parameters and setter functions lack zero address validation
**Impact:** Contract could be bricked if initialized with zero addresses
**Recommendation:** Add `require(address != address(0))` checks

### 6. **Unbounded Loop in Batch Operations** (MEDIUM RISK)
**File:** `SwapPool.sol`, lines 348-365
```solidity
for (uint256 i = 0; i < swapCount; ++i) {
    // ... operations without gas limit checks
}
```
**Issue:** Batch operations could exceed block gas limit
**Impact:** DOS attacks, failed transactions
**Recommendation:** Implement strict batch size limits and gas estimation

### 7. **Centralization Risk - Owner Powers** (MEDIUM RISK)
**Files:** All contracts with `Ownable`
**Issue:** Owner has extensive control over critical parameters
**Impact:** Single point of failure, rug pull potential
**Recommendation:** Implement timelock, multi-sig, or decentralized governance

## 🟢 LOW RISK FINDINGS

### 8. **Missing Event Emissions** (LOW RISK)
**Issue:** Some state changes don't emit events for off-chain monitoring
**Recommendation:** Add events for all critical state changes

### 9. **Floating Pragma** (LOW RISK)
**Issue:** `pragma solidity ^0.8.19;` allows different compiler versions
**Recommendation:** Lock to specific version for deterministic builds

### 10. **Gas Optimization Opportunities** (LOW RISK)
**Issue:** Multiple SLOAD operations, string operations could be optimized
**Recommendation:** Cache storage variables, use bytes32 for fixed strings

## 🔴 ADDITIONAL CRITICAL CONCERNS

### 11. **Fee Manipulation Attack Vector** (HIGH RISK)
```solidity
uint256 stonerAmount = (msg.value * stonerShare) / 100;
uint256 rewardsAmount = msg.value - stonerAmount;
```
**Issue:** Fee calculation vulnerable to manipulation if `stonerShare` can be changed mid-transaction
**Impact:** Incorrect fee distribution
**Recommendation:** Add reentrancy protection around fee calculations

### 12. **NFT Loss Risk in Failed Swaps** (HIGH RISK)
**Issue:** NFT transfers occur before validation completion
**Impact:** Users could lose NFTs if swap fails after transfer
**Recommendation:** Implement two-phase commit or escrow mechanism

### 13. **Receipt Token Non-transferability Bypass** (MEDIUM RISK)
**File:** `StakeReceipt.sol`
**Issue:** While receipts are meant to be non-transferable, this isn't enforced at contract level
**Impact:** Could break staking reward assumptions
**Recommendation:** Override transfer functions to prevent transfers

## RECOMMENDATIONS

### Immediate Actions Required:
1. **Fix reentrancy vulnerabilities** with proper guards
2. **Add overflow protection** to all arithmetic operations  
3. **Implement proper access controls** with multi-sig
4. **Add comprehensive zero address checks**
5. **Limit batch operation sizes** to prevent DOS

### Enhanced Security Measures:
1. **Implement emergency pause mechanism** for all critical functions
2. **Add rate limiting** to prevent spam attacks
3. **Use pull payment pattern** for external transfers
4. **Implement proper randomness** for token selection
5. **Add comprehensive test suite** with edge cases

### Architecture Improvements:
1. **Consider proxy pattern** for upgradability
2. **Implement timelock** for admin functions
3. **Add circuit breakers** for unusual activity
4. **Use formal verification** for critical math operations

## RISK ASSESSMENT

**Overall Risk Level:** 🔴 **HIGH**

The protocol contains several critical vulnerabilities that could lead to fund loss or system compromise. The reentrancy issues and arithmetic overflow risks are particularly concerning and should be addressed immediately before any mainnet deployment.

## CONCLUSION

While the protocol implements interesting NFT swap mechanics, it requires significant security improvements before being production-ready. The current experimental warning is appropriate - users should indeed "use at their own risk" until these vulnerabilities are resolved.

**Recommended Actions:**
1. Address all HIGH risk findings immediately
2. Implement comprehensive testing suite
3. Consider professional security audit by established firm
4. Deploy on testnet with bug bounty program
5. Implement gradual rollout with deposit limits

---
*This audit is not exhaustive and should be supplemented with formal verification and additional security reviews.*