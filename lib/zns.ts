// ZNS Registry Integration for .xrpl domain resolution
import { createPublicClient, http, getAddress } from 'viem';
import { XRPL_EVM } from './xrplEvm';

// ZNS Registry address (verified)
export const ZNS_REGISTRY = '0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D' as const;

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

// Try resolving owner for a ".xrpl" name
export async function resolveXrplNameToAddress(name: string): Promise<`0x${string}` | null> {
  if (!name.toLowerCase().endsWith('.xrpl')) return null;

  // Strip the .xrpl suffix since the registry stores names without TLD
  const nameWithoutTld = name.toLowerCase().replace(/\.xrpl$/, '');

  // Try using domainLookup which returns tokenId
  try {
    const tokenId = (await publicClient.readContract({
      address: ZNS_REGISTRY,
      abi: ABI_DOMAIN_LOOKUP,
      functionName: 'domainLookup',
      args: [nameWithoutTld],
    })) as bigint;
    
    if (tokenId && tokenId > BigInt(0)) {
      // Now get the registry data for this token ID
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
        return getAddress(registryData.owner);
      }
    }
  } catch {
    // Silent fallback to next method
  }

  // Fallback: Try registryLookupByName with the name without TLD
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
      return getAddress(info.owner);
    }
  } catch {
    // Domain not found
  }

  return null;
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
