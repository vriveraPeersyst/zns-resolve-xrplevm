# ZNS Integration Reference

This document provides technical details about the ZNS (Zelf Name Service) integration in this dApp.

## ZNS Registry Contract

**Address**: `0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D`  
**Network**: XRPL EVM Mainnet (Chain ID: 1440000)  
**Explorer**: [View on Explorer](https://explorer.xrplevm.org/address/0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D)

## Key Functions Used

### 1. Forward Resolution (Name → Address)

```typescript
// Get token ID from domain name
function domainLookup(string memory name) public view returns (uint256)

// Get registry data from token ID
function registryLookupById(uint256 tokenId) public view returns (RegistryData memory)

// Alternative: Get registry data directly from name
function registryLookupByName(string memory domainName) public view returns (RegistryData memory)
```

**RegistryData Structure**:
```solidity
struct RegistryData {
    address owner;
    string domainName;
    uint16 lengthOfDomain;
    uint256 expirationDate;
}
```

### 2. Reverse Resolution (Address → Name)

```typescript
// Get user config including primary domain
function userLookupByAddress(address user) public view returns (UserConfig memory)
```

**UserConfig Structure**:
```solidity
struct UserConfig {
    uint256 primaryDomain;        // Token ID of primary domain
    uint256[] allOwnedDomains;    // All domains owned by user
    uint256 numberOfReferrals;
    uint256 totalEarnings;
}
```

## Implementation Flow

### Resolving a .xrpl Domain

1. **Input**: User enters `alice.xrpl`
2. **Strip TLD**: Remove `.xrpl` suffix → `alice`
3. **Get Token ID**: Call `domainLookup("alice")` → returns token ID
4. **Get Owner**: Call `registryLookupById(tokenId)` → returns `RegistryData` with owner address
5. **Return**: Owner address

```typescript
// Simplified example
const nameWithoutTld = "alice";
const tokenId = await domainLookup(nameWithoutTld);
const registryData = await registryLookupById(tokenId);
const ownerAddress = registryData.owner;
```

### Reverse Lookup (Getting Primary Domain)

1. **Input**: User's wallet address
2. **Get User Config**: Call `userLookupByAddress(address)` → returns `UserConfig`
3. **Check Primary**: If `primaryDomain > 0`, user has a primary domain set
4. **Get Domain Name**: Call `registryLookupById(primaryDomain)` → returns `RegistryData`
5. **Add TLD**: Append `.xrpl` to `domainName`
6. **Return**: Full domain name

```typescript
// Simplified example
const userConfig = await userLookupByAddress(address);
if (userConfig.primaryDomain > 0) {
    const registryData = await registryLookupById(userConfig.primaryDomain);
    const fullDomain = registryData.domainName + ".xrpl";
}
```

## Important Notes

### Domain Name Storage
- ZNS Registry stores domain names **without** the `.xrpl` TLD
- Always strip the TLD before querying
- Always append the TLD when displaying to users

### Error Handling
- Domain not found: `domainLookup` returns `0`
- No primary domain: `userConfig.primaryDomain` is `0`
- Expired domains: Check `expirationDate` field
- Invalid addresses: Zero address `0x0000...0000`

### Gas Optimization
- All ZNS functions are `view` functions (no gas cost)
- Multiple calls can be batched in a single RPC request
- Results can be cached client-side

## Code Examples

### Using Viem (This Project)

```typescript
import { createPublicClient, http } from 'viem';

const client = createPublicClient({
  chain: XRPL_EVM,
  transport: http('https://rpc.xrplevm.org/'),
});

// Forward resolution
const tokenId = await client.readContract({
  address: '0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D',
  abi: DOMAIN_LOOKUP_ABI,
  functionName: 'domainLookup',
  args: ['alice'],
});

// Reverse resolution
const userConfig = await client.readContract({
  address: '0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D',
  abi: USER_LOOKUP_ABI,
  functionName: 'userLookupByAddress',
  args: ['0x...'],
});
```

## Testing

### Test Domains
You can test with any registered .xrpl domain on mainnet. To find test domains:
1. Visit the ZNS Registry on the explorer
2. Look at recent "MintedDomain" events
3. Use those domain names for testing

### Verification
Always verify resolved addresses:
- Check that address is not zero address
- Optionally check expiration date
- Display shortened address for user confirmation

## Resources

- **Contract Explorer**: https://explorer.xrplevm.org/address/0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D
- **Full ABI**: See contract explorer's "Contract" tab
- **XRPL EVM Docs**: https://docs.xrplevm.org
- **Viem Docs**: https://viem.sh

## Future Enhancements

Potential features to add:
- Domain expiration checking before transfer
- Support for subdomains
- Batch resolution for multiple domains
- Caching layer for frequently resolved domains
- Support for custom avatar/profile metadata
