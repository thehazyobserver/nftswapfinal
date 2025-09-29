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

// IERC165
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// ERC165
abstract contract ERC165 is IERC165 {
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
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

// IERC721Metadata
interface IERC721Metadata is IERC721 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

// IERC721Enumerable
interface IERC721Enumerable is IERC721 {
    function totalSupply() external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function tokenByIndex(uint256 index) external view returns (uint256);
}

// ERC721
contract ERC721 is Context, ERC165, IERC721, IERC721Metadata {
    using Strings for uint256;

    string private _name;
    string private _symbol;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function balanceOf(address owner) public view virtual override returns (uint256) {
        require(owner != address(0), "ERC721: address zero is not a valid owner");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    function _baseURI() internal view virtual returns (string memory) {
        return "";
    }

    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ERC721.ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");

        require(
            _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "ERC721: approve caller is not token owner or approved for all"
        );

        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        _requireMinted(tokenId);

        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public virtual override {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public virtual override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner or approved");

        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner or approved");
        _safeTransfer(from, to, tokenId, data);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal virtual {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function _ownerOf(uint256 tokenId) internal view virtual returns (address) {
        return _owners[tokenId];
    }

    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        address owner = ERC721.ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }

    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId, 1);

        // Check that tokenId was not minted by `_beforeTokenTransfer` hook
        require(!_exists(tokenId), "ERC721: token already minted");

        unchecked {
            _balances[to] += 1;
        }

        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);

        _afterTokenTransfer(address(0), to, tokenId, 1);
    }

    function _burn(uint256 tokenId) internal virtual {
        address owner = ERC721.ownerOf(tokenId);

        _beforeTokenTransfer(owner, address(0), tokenId, 1);

        owner = ERC721.ownerOf(tokenId);

        delete _tokenApprovals[tokenId];

        unchecked {
            _balances[owner] -= 1;
        }
        delete _owners[tokenId];

        emit Transfer(owner, address(0), tokenId);

        _afterTokenTransfer(owner, address(0), tokenId, 1);
    }

    function _transfer(address from, address to, uint256 tokenId) internal virtual {
        require(ERC721.ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to the zero address");

        _beforeTokenTransfer(from, to, tokenId, 1);

        require(ERC721.ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");

        delete _tokenApprovals[tokenId];

        unchecked {
            _balances[from] -= 1;
            _balances[to] += 1;
        }
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);

        _afterTokenTransfer(from, to, tokenId, 1);
    }

    function _approve(address to, uint256 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;
        emit Approval(ERC721.ownerOf(tokenId), to, tokenId);
    }

    function _setApprovalForAll(address owner, address operator, bool approved) internal virtual {
        require(owner != operator, "ERC721: approve to caller");
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    function _requireMinted(uint256 tokenId) internal view virtual {
        require(_exists(tokenId), "ERC721: invalid token ID");
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize) internal virtual {}

    function _afterTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize) internal virtual {}
}

// ERC721Enumerable
abstract contract ERC721Enumerable is ERC721, IERC721Enumerable {
    mapping(address => mapping(uint256 => uint256)) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokensIndex;
    uint256[] private _allTokens;
    mapping(uint256 => uint256) private _allTokensIndex;

    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC721) returns (bool) {
        return interfaceId == type(IERC721Enumerable).interfaceId || super.supportsInterface(interfaceId);
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) public view virtual override returns (uint256) {
        require(index < ERC721.balanceOf(owner), "ERC721Enumerable: owner index out of bounds");
        return _ownedTokens[owner][index];
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _allTokens.length;
    }

    function tokenByIndex(uint256 index) public view virtual override returns (uint256) {
        require(index < ERC721Enumerable.totalSupply(), "ERC721Enumerable: global index out of bounds");
        return _allTokens[index];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);

        if (batchSize > 1) {
            revert("ERC721Enumerable: consecutive transfers not supported");
        }

        uint256 tokenId = firstTokenId;

        if (from == address(0)) {
            _addTokenToAllTokensEnumeration(tokenId);
        } else if (from != to) {
            _removeTokenFromOwnerEnumeration(from, tokenId);
        }
        if (to == address(0)) {
            _removeTokenFromAllTokensEnumeration(tokenId);
        } else if (to != from) {
            _addTokenToOwnerEnumeration(to, tokenId);
        }
    }

    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        uint256 length = ERC721.balanceOf(to);
        _ownedTokens[to][length] = tokenId;
        _ownedTokensIndex[tokenId] = length;
    }

    function _addTokenToAllTokensEnumeration(uint256 tokenId) private {
        _allTokensIndex[tokenId] = _allTokens.length;
        _allTokens.push(tokenId);
    }

    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
        uint256 lastTokenIndex = ERC721.balanceOf(from) - 1;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];

        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];

            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }

        delete _ownedTokensIndex[tokenId];
        delete _ownedTokens[from][lastTokenIndex];
    }

    function _removeTokenFromAllTokensEnumeration(uint256 tokenId) private {
        uint256 lastTokenIndex = _allTokens.length - 1;
        uint256 tokenIndex = _allTokensIndex[tokenId];

        uint256 lastTokenId = _allTokens[lastTokenIndex];

        _allTokens[tokenIndex] = lastTokenId;
        _allTokensIndex[lastTokenId] = tokenIndex;

        delete _allTokensIndex[tokenId];
        _allTokens.pop();
    }
}

// Strings library
library Strings {
    bytes16 private constant _SYMBOLS = "0123456789abcdef";
    uint8 private constant _ADDRESS_LENGTH = 20;

    function toString(uint256 value) internal pure returns (string memory) {
        unchecked {
            uint256 length = Math.log10(value) + 1;
            string memory buffer = new string(length);
            uint256 ptr;
            /// @solidity memory-safe-assembly
            assembly {
                ptr := add(buffer, add(32, length))
            }
            while (true) {
                ptr--;
                /// @solidity memory-safe-assembly
                assembly {
                    mstore8(ptr, byte(mod(value, 10), _SYMBOLS))
                }
                value /= 10;
                if (value == 0) break;
            }
            return buffer;
        }
    }

    function toHexString(uint256 value) internal pure returns (string memory) {
        unchecked {
            return toHexString(value, Math.log256(value) + 1);
        }
    }

    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = _SYMBOLS[value & 0xf];
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }

    function toHexString(address addr) internal pure returns (string memory) {
        return toHexString(uint256(uint160(addr)), _ADDRESS_LENGTH);
    }
}

// Math library
library Math {
    enum Rounding {
        Down, // Toward negative infinity
        Up, // Toward infinity
        Zero // Toward zero
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a & b) + (a ^ b) / 2;
    }

    function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return a == 0 ? 0 : (a - 1) / b + 1;
    }

    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            uint256 prod0;
            uint256 prod1;
            assembly {
                let mm := mulmod(a, b, not(0))
                prod0 := mul(a, b)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }

            if (prod1 == 0) {
                return prod0 / denominator;
            }

            require(denominator > prod1);

            uint256 remainder;
            assembly {
                remainder := mulmod(a, b, denominator)
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }

            uint256 twos = denominator & (~denominator + 1);
            assembly {
                denominator := div(denominator, twos)
                prod0 := div(prod0, twos)
                twos := add(div(sub(0, twos), twos), 1)
            }

            prod0 |= prod1 * twos;

            uint256 inverse = (3 * denominator) ^ 2;

            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;

            result = prod0 * inverse;
            return result;
        }
    }

    function mulDiv(uint256 a, uint256 b, uint256 denominator, Rounding rounding) internal pure returns (uint256) {
        uint256 result = mulDiv(a, b, denominator);
        if (rounding == Rounding.Up && mulmod(a, b, denominator) > 0) {
            result += 1;
        }
        return result;
    }

    function sqrt(uint256 a) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }

        uint256 result = 1 << (log2(a) >> 1);

        unchecked {
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            return min(result, a / result);
        }
    }

    function cbrt(uint256 a) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            uint256 x = a;
            for (uint256 y = 1 << 255; y > 0; y >>= 3) {
                x = result + y;
                if (a / x >= x) {
                    result += y;
                    a -= x * x;
                }
            }
        }
        return result;
    }

    function log2(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >> 128 > 0) {
                value >>= 128;
                result += 128;
            }
            if (value >> 64 > 0) {
                value >>= 64;
                result += 64;
            }
            if (value >> 32 > 0) {
                value >>= 32;
                result += 32;
            }
            if (value >> 16 > 0) {
                value >>= 16;
                result += 16;
            }
            if (value >> 8 > 0) {
                value >>= 8;
                result += 8;
            }
            if (value >> 4 > 0) {
                value >>= 4;
                result += 4;
            }
            if (value >> 2 > 0) {
                value >>= 2;
                result += 2;
            }
            if (value >> 1 > 0) {
                result += 1;
            }
        }
        return result;
    }

    function log10(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >= 10 ** 64) {
                value /= 10 ** 64;
                result += 64;
            }
            if (value >= 10 ** 32) {
                value /= 10 ** 32;
                result += 32;
            }
            if (value >= 10 ** 16) {
                value /= 10 ** 16;
                result += 16;
            }
            if (value >= 10 ** 8) {
                value /= 10 ** 8;
                result += 8;
            }
            if (value >= 10 ** 4) {
                value /= 10 ** 4;
                result += 4;
            }
            if (value >= 10 ** 2) {
                value /= 10 ** 2;
                result += 2;
            }
            if (value >= 10 ** 1) {
                result += 1;
            }
        }
        return result;
    }

    function log256(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >> 128 > 0) {
                value >>= 128;
                result += 16;
            }
            if (value >> 64 > 0) {
                value >>= 64;
                result += 8;
            }
            if (value >> 32 > 0) {
                value >>= 32;
                result += 4;
            }
            if (value >> 16 > 0) {
                value >>= 16;
                result += 2;
            }
            if (value >> 8 > 0) {
                result += 1;
            }
        }
        return result;
    }
}

// ============================================================================
//  STAKE RECEIPT CONTRACT (Compatible with SwapPool)
// ============================================================================

/**
 * @title StakeReceipt
 * @dev Non-transferable receipt tokens for SwapPool contract
 * @notice This receipt contract uses poolSlotId instead of originalTokenId
 * Key change: Tracks pool slots instead of original token IDs since SwapPool uses a slot-based system
 */
contract StakeReceipt is ERC721Enumerable, Ownable {
    address public pool;
    string private baseURI;
    
    // 🔄 CHANGED: Track pool slot IDs instead of original token IDs
    mapping(uint256 => uint256) public receiptToPoolSlot;
    
    // 🕒 TIMESTAMP TRACKING FOR ANALYTICS
    mapping(uint256 => uint256) public receiptMintTime;      // receiptId => mint timestamp
    mapping(uint256 => address) public receiptMinter;        // receiptId => original minter
    
    uint256 private _currentReceiptId;

    event BaseURIUpdated(string newBaseURI);
    event PoolSet(address pool);
    event ReceiptBurned(address indexed user, uint256 indexed receiptTokenId, uint256 indexed poolSlotId);

    error OnlyPool();
    error NonTransferable();
    error InvalidURI();
    error PoolAlreadySet();

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {
        _currentReceiptId = 1; // Start from 1 to avoid confusion with tokenId 0
    }

    modifier onlyPool() {
        if (msg.sender != pool) revert OnlyPool();
        _;
    }
    
    function setPool(address _pool) external onlyOwner {
        if (pool != address(0)) revert PoolAlreadySet();
        require(_pool != address(0), "Zero pool address");
        pool = _pool;
        emit PoolSet(_pool);
    }

    // 🔄 CHANGED: mint() now takes poolSlotId instead of originalTokenId
    function mint(address to, uint256 poolSlotId) external onlyPool returns (uint256) {
            require(to != address(0), "Cannot mint to zero address");
            require(poolSlotId > 0, "Invalid pool slot ID");
        
        uint256 receiptTokenId = _currentReceiptId;
        _currentReceiptId++;
        
        receiptToPoolSlot[receiptTokenId] = poolSlotId;
        
        // 🕒 RECORD TIMESTAMP AND MINTER FOR ANALYTICS
        receiptMintTime[receiptTokenId] = block.timestamp;
        receiptMinter[receiptTokenId] = to;
        
        _mint(to, receiptTokenId);
        
        return receiptTokenId;
    }

    function burn(uint256 receiptTokenId) external onlyPool {
        address owner = ownerOf(receiptTokenId);
        uint256 poolSlotId = receiptToPoolSlot[receiptTokenId];
        
        delete receiptToPoolSlot[receiptTokenId];
        // Keep timestamp data for historical analytics
        // delete receiptMintTime[receiptTokenId];
        // delete receiptMinter[receiptTokenId];
        
        _burn(receiptTokenId);
        
        emit ReceiptBurned(owner, receiptTokenId, poolSlotId);
    }

    function batchMint(address to, uint256[] calldata poolSlotIds) external onlyPool returns (uint256[] memory) {
        require(poolSlotIds.length > 0, "Empty array");
        require(poolSlotIds.length <= 10, "Too many tokens"); // Gas protection
        
        uint256 poolSlotIdsLength = poolSlotIds.length; // Gas optimization: cache array length
        uint256[] memory receiptTokenIds = new uint256[](poolSlotIdsLength);
        
        for (uint256 i = 0; i < poolSlotIdsLength; i++) {
            uint256 receiptTokenId = _currentReceiptId;
            _currentReceiptId++;
            
            receiptToPoolSlot[receiptTokenId] = poolSlotIds[i];
            receiptMintTime[receiptTokenId] = block.timestamp;
            receiptMinter[receiptTokenId] = to;
            
            _mint(to, receiptTokenId);
            receiptTokenIds[i] = receiptTokenId;
        }
        
        return receiptTokenIds;
    }

    function batchBurn(uint256[] calldata receiptTokenIds) external onlyPool {
        require(receiptTokenIds.length > 0, "Empty array");
        require(receiptTokenIds.length <= 10, "Too many tokens"); // Gas protection
        
        uint256 receiptTokenIdsLength = receiptTokenIds.length; // Gas optimization: cache array length
        for (uint256 i = 0; i < receiptTokenIdsLength; i++) {
            delete receiptToPoolSlot[receiptTokenIds[i]];
            // Keep timestamp data for historical analytics
            // delete receiptMintTime[receiptTokenIds[i]];
            // delete receiptMinter[receiptTokenIds[i]];
            _burn(receiptTokenIds[i]);
        }
    }

    // 🔄 CHANGED: getPoolSlotId() instead of getOriginalTokenId()
    function getPoolSlotId(uint256 receiptTokenId) external view returns (uint256) {
        require(_exists(receiptTokenId), "Receipt does not exist");
        return receiptToPoolSlot[receiptTokenId];
    }

    function validateReceipt(uint256 receiptTokenId, address expectedPool) external view returns (bool) {
        require(msg.sender == expectedPool, "StakeReceipt: Caller is not the expected pool");
        return _exists(receiptTokenId);
    }

    // 📊 ENHANCED QUERY FUNCTIONS FOR UI
    function getUserReceipts(address user) external view returns (uint256[] memory receipts, uint256[] memory poolSlots) {
        uint256 balance = balanceOf(user);
        receipts = new uint256[](balance);
        poolSlots = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 receiptId = tokenOfOwnerByIndex(user, i);
            receipts[i] = receiptId;
            poolSlots[i] = receiptToPoolSlot[receiptId];
        }
        
        return (receipts, poolSlots);
    }

    function getUserReceiptsDetailed(address user) external view returns (
        uint256[] memory receiptIds,
        uint256[] memory poolSlots,
        uint256[] memory mintTimes,
        uint256[] memory holdingDurations
    ) {
        uint256 balance = balanceOf(user);
        
        receiptIds = new uint256[](balance);
        poolSlots = new uint256[](balance);
        mintTimes = new uint256[](balance);
        holdingDurations = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 receiptId = tokenOfOwnerByIndex(user, i);
            uint256 mintTime = receiptMintTime[receiptId];
            
            receiptIds[i] = receiptId;
            poolSlots[i] = receiptToPoolSlot[receiptId];
            mintTimes[i] = mintTime;
            holdingDurations[i] = block.timestamp - mintTime;
        }
    }

    // 📊 ADMIN ANALYTICS FUNCTIONS 
    function getReceiptAnalytics() external view returns (
        uint256 totalReceipts,
        uint256 averageHoldingDuration,
        uint256 oldestReceiptAge,
        uint256[] memory receiptIds,
        uint256[] memory poolSlots,
        uint256[] memory holdingDurations,
        address[] memory poolAddresses,
        uint256 currentReceiptId,
        uint256 totalHolders,
        bool poolSet
    ) {
        uint256 totalSupplyValue = totalSupply();
        
        if (totalSupplyValue == 0) {
            receiptIds = new uint256[](0);
            poolSlots = new uint256[](0);
            return (0, 0, 0, receiptIds, poolSlots, holdingDurations, poolAddresses, 0, 0, false);
        }
        
        receiptIds = new uint256[](totalSupplyValue);
        poolSlots = new uint256[](totalSupplyValue);
        holdingDurations = new uint256[](totalSupplyValue);
        poolAddresses = new address[](totalSupplyValue);
        
        uint256 totalDuration = 0;
        uint256 maxAge = 0;
        
        for (uint256 i = 0; i < totalSupplyValue; i++) {
            uint256 receiptId = tokenByIndex(i);
            uint256 mintTime = receiptMintTime[receiptId];
            uint256 holdingDuration = block.timestamp - mintTime;
            
            receiptIds[i] = receiptId;
            poolSlots[i] = receiptToPoolSlot[receiptId];
            holdingDurations[i] = holdingDuration;
            poolAddresses[i] = pool; // All receipts are from the same pool
            
            totalDuration += holdingDuration;
            if (holdingDuration > maxAge) {
                maxAge = holdingDuration;
            }
        }
        
        return (
            totalSupplyValue,
            totalSupplyValue > 0 ? totalDuration / totalSupplyValue : 0,
            maxAge,
            receiptIds,
            poolSlots,
            holdingDurations,
            poolAddresses,
            _currentReceiptId - 1,
            _getUniqueHolderCount(),
            pool != address(0)
        );
    }

    function _getUniqueHolderCount() internal view returns (uint256) {
        uint256 totalSupplyValue = totalSupply();
        if (totalSupplyValue == 0) return 0;
        
        address[] memory holders = new address[](totalSupplyValue);
        uint256 uniqueCount = 0;
        
        for (uint256 i = 0; i < totalSupplyValue; i++) {
            address holder = ownerOf(tokenByIndex(i));
            bool isUnique = true;
            
            // Check if this holder is already in our list
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (holders[j] == holder) {
                    isUnique = false;
                    break;
                }
            }
            
            if (isUnique) {
                holders[uniqueCount] = holder;
                uniqueCount++;
            }
        }
        
        return uniqueCount;
    }

    function getPoolSlotsByUser(address user) external view returns (uint256[] memory poolSlots) {
        uint256 balance = balanceOf(user);
        poolSlots = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 receiptId = tokenOfOwnerByIndex(user, i);
            poolSlots[i] = receiptToPoolSlot[receiptId];
        }
    }

    // 🔒 SOULBOUND TOKEN: Override transfer functions to make non-transferable
    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(ERC721, IERC721) {
        revert NonTransferable();
    }

    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert NonTransferable();
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert NonTransferable();
    }

    // 🎨 METADATA FUNCTIONS
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        if (bytes(newBaseURI).length == 0) revert InvalidURI();
        baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 92)
        );
        require(_success, "FeeM registration failed");
    }

    // 📊 PUBLIC QUERY FUNCTIONS
    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    function getReceiptInfo(uint256 receiptTokenId) external view returns (
        address owner,
        uint256 poolSlotId,
        uint256 mintTime,
        address minter,
        uint256 holdingDuration
    ) {
        require(_exists(receiptTokenId), "Receipt does not exist");
        
        return (
            ownerOf(receiptTokenId),
            receiptToPoolSlot[receiptTokenId],
            receiptMintTime[receiptTokenId],
            receiptMinter[receiptTokenId],
            block.timestamp - receiptMintTime[receiptTokenId]
        );
    }

    function getContractInfo() external view returns (
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address pool_,
        string memory baseURI_,
        uint256 nextReceiptId
    ) {
        return (
            name(),
            symbol(),
            totalSupply(),
            pool,
            baseURI,
            _currentReceiptId
        );
    }
}