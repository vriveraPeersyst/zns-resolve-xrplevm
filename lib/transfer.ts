// Transfer utilities for sending native XRP on XRPL EVM
import { createWalletClient, custom, parseEther } from 'viem';
import { XRPL_EVM } from './xrplEvm';
import { resolveXrplNameToAddress, isValidAddress } from './zns';

export async function sendNativeToXrplName(recipient: string, amountInEther: string) {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  // Ensure network is added/switchable first; then create a wallet client
  const walletClient = createWalletClient({
    chain: {
      id: XRPL_EVM.id,
      name: XRPL_EVM.name,
      nativeCurrency: XRPL_EVM.nativeCurrency,
      rpcUrls: XRPL_EVM.rpcUrls,
    },
    transport: custom(window.ethereum),
  });

  let to: `0x${string}`;

  // Check if recipient is a .xrpl domain or direct address
  if (recipient.toLowerCase().endsWith('.xrpl')) {
    // Resolve the .xrpl name → address via ZNS
    const resolvedAddress = await resolveXrplNameToAddress(recipient);
    if (!resolvedAddress) {
      throw new Error(`Could not resolve ${recipient}`);
    }
    to = resolvedAddress;
  } else if (isValidAddress(recipient)) {
    to = recipient as `0x${string}`;
  } else {
    throw new Error('Invalid recipient: must be a .xrpl domain or valid address');
  }

  // Get sender account
  const [from] = await walletClient.requestAddresses();

  // Send native XRP (EVM) transfer
  const hash = await walletClient.sendTransaction({
    account: from,
    to,
    value: parseEther(amountInEther),
  });

  return hash;
}

export async function getWalletAddress(): Promise<`0x${string}` | null> {
  if (!window.ethereum) {
    return null;
  }

  try {
    const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
    return accounts[0] as `0x${string}`;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
}

export async function getCurrentChainId(): Promise<string | null> {
  if (!window.ethereum) {
    return null;
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId as string;
  } catch (error) {
    console.error('Error getting chain ID:', error);
    return null;
  }
}
