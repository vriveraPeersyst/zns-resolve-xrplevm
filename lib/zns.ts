// ZNS Registry Integration for .xrpl domain resolution
import { createPublicClient, http, getAddress } from 'viem';
import { XRPL_EVM } from './xrplEvm';

// ZNS Registry address (verified)
export const ZNS_REGISTRY = '0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D' as const;

// Simple in-memory cache for faster repeated lookups
const resolutionCache = new Map<string, { address: `0x${string}` | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Clear expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of resolutionCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      resolutionCache.delete(key);
    }
  }
}, CACHE_DURATION);

// Domain lookup ABI - returns tokenId as uint256
const ABI_DOMAIN_LOOKUP = [
  {
    inputs: [{ name: '', type: 'string' }],
    name: 'domainLookup',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Registry lookup by name - returns RegistryData struct
const ABI_REGISTRY_LOOKUP_BY_NAME = [
  {
    inputs: [{ name: 'domainName', type: 'string' }],
    name: 'registryLookupByName',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'domainName', type: 'string' },
          { name: 'lengthOfDomain', type: 'uint16' },
          { name: 'expirationDate', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Reverse lookup ABI: userLookupByAddress returns UserConfig struct
const ABI_USER_LOOKUP = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'userLookupByAddress',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'primaryDomain', type: 'uint256' },
          { name: 'allOwnedDomains', type: 'uint256[]' },
          { name: 'numberOfReferrals', type: 'uint256' },
          { name: 'totalEarnings', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Registry lookup by ID to get domain name from token ID
const ABI_REGISTRY_LOOKUP_BY_ID = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'registryLookupById',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'domainName', type: 'string' },
          { name: 'lengthOfDomain', type: 'uint16' },
          { name: 'expirationDate', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Create a read client
export const publicClient = createPublicClient({
  chain: {
    id: XRPL_EVM.id,
    name: XRPL_EVM.name,
    nativeCurrency: XRPL_EVM.nativeCurrency,
    rpcUrls: XRPL_EVM.rpcUrls,
  },
  transport: http(XRPL_EVM.rpcUrls.default.http[0]),
});

// Try resolving owner for a ".xrpl" name - optimized for speed with caching
export async function resolveXrplNameToAddress(name: string): Promise<`0x${string}` | null> {
  if (!name.toLowerCase().endsWith('.xrpl')) return null;

  // Strip the .xrpl suffix since the registry stores names without TLD
  const nameWithoutTld = name.toLowerCase().replace(/\.xrpl$/, '');
  
  // Early validation - empty name after stripping TLD
  if (!nameWithoutTld.trim()) return null;

  // Check cache first for instant results
  const cacheKey = nameWithoutTld;
  const cached = resolutionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.address;
  }

  let resolvedAddress: `0x${string}` | null = null;

  // Optimized: Try the most efficient method first (domainLookup + registryLookupById)
  // This is typically faster than registryLookupByName as it's a two-step indexed lookup
  try {
    const tokenId = (await publicClient.readContract({
      address: ZNS_REGISTRY,
      abi: ABI_DOMAIN_LOOKUP,
      functionName: 'domainLookup',
      args: [nameWithoutTld],
    })) as bigint;
    
    if (tokenId && tokenId > BigInt(0)) {
      // Get the registry data for this token ID
      const registryData = (await publicClient.readContract({
        address: ZNS_REGISTRY,
        abi: ABI_REGISTRY_LOOKUP_BY_ID,
        functionName: 'registryLookupById',
        args: [tokenId],
      })) as {
        owner: `0x${string}`;
        domainName: string;
        lengthOfDomain: number;
        expirationDate: bigint;
      };
      
      if (registryData?.owner && registryData.owner !== '0x0000000000000000000000000000000000000000') {
        resolvedAddress = getAddress(registryData.owner);
      }
    }
  } catch (error) {
    // Log for debugging but continue to fallback
    console.debug('Primary resolution method failed, trying fallback:', error);
  }

  // Fallback: Try registryLookupByName with the name without TLD
  if (!resolvedAddress) {
    try {
      const info = (await publicClient.readContract({
        address: ZNS_REGISTRY,
        abi: ABI_REGISTRY_LOOKUP_BY_NAME,
        functionName: 'registryLookupByName',
        args: [nameWithoutTld],
      })) as {
        owner: `0x${string}`;
        domainName: string;
        lengthOfDomain: number;
        expirationDate: bigint;
      };
      
      if (info?.owner && info.owner !== '0x0000000000000000000000000000000000000000') {
        resolvedAddress = getAddress(info.owner);
      }
    } catch (error) {
      // Final failure - domain not found or network issue
      console.debug('Fallback resolution method also failed:', error);
    }
  }

  // Cache the result (including null results to avoid repeated failed lookups)
  resolutionCache.set(cacheKey, { 
    address: resolvedAddress, 
    timestamp: Date.now() 
  });

  return resolvedAddress;
}

// Validate if an address is a valid Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Reverse lookup: get primary .xrpl domain for an address
export async function resolveAddressToXrplName(address: string): Promise<string | null> {
  if (!isValidAddress(address)) return null;

  try {
    // Step 1: Get user config which includes primaryDomain token ID
    const userConfig = (await publicClient.readContract({
      address: ZNS_REGISTRY,
      abi: ABI_USER_LOOKUP,
      functionName: 'userLookupByAddress',
      args: [address as `0x${string}`],
    })) as {
      primaryDomain: bigint;
      allOwnedDomains: readonly bigint[];
      numberOfReferrals: bigint;
      totalEarnings: bigint;
    };

    // Check if user has a primary domain set (token ID > 0)
    if (!userConfig.primaryDomain || userConfig.primaryDomain === BigInt(0)) {
      return null;
    }

    // Step 2: Look up the domain name using the token ID
    const registryData = (await publicClient.readContract({
      address: ZNS_REGISTRY,
      abi: ABI_REGISTRY_LOOKUP_BY_ID,
      functionName: 'registryLookupById',
      args: [userConfig.primaryDomain],
    })) as {
      owner: `0x${string}`;
      domainName: string;
      lengthOfDomain: number;
      expirationDate: bigint;
    };

    if (registryData?.domainName) {
      // The registry stores domain names without the .xrpl suffix, so we add it
      const fullDomain = registryData.domainName.toLowerCase().endsWith('.xrpl') 
        ? registryData.domainName 
        : `${registryData.domainName}.xrpl`;
      return fullDomain;
    }
  } catch {
    // No primary domain or lookup failed
  }

  return null;
}
