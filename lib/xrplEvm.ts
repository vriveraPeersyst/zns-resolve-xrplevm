// XRPL EVM Network Configuration
export const XRPL_EVM_CHAIN_ID_HEX = '0x15F900'; // 1440000 in hex
export const XRPL_EVM = {
  id: parseInt(XRPL_EVM_CHAIN_ID_HEX, 16),
  name: 'XRPL EVM',
  nativeCurrency: { name: 'XRP', symbol: 'XRP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xrplevm.org/'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.xrplevm.org' },
  },
  ensRegistry: '0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D', // ZNSRegistry
} as const;

export async function addXRPLEVMToMetaMask() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: XRPL_EVM_CHAIN_ID_HEX,
          chainName: XRPL_EVM.name,
          rpcUrls: XRPL_EVM.rpcUrls.default.http,
          nativeCurrency: XRPL_EVM.nativeCurrency,
          blockExplorerUrls: [XRPL_EVM.blockExplorers.default.url],
        },
      ],
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      const err = error as { code: number; message?: string };
      if (err.code === 4001) {
        throw new Error('User rejected the request');
      }
      throw new Error(err.message || `MetaMask error (code: ${err.code})`);
    }
    throw error;
  }
}

export async function switchToXRPLEVM() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: XRPL_EVM_CHAIN_ID_HEX }],
    });
  } catch (switchError: unknown) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError && typeof switchError === 'object' && 'code' in switchError) {
      const err = switchError as { code: number; message?: string };
      if (err.code === 4902) {
        // Chain not added yet, add it then switch
        await addXRPLEVMToMetaMask();
        // Switch again after adding
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: XRPL_EVM_CHAIN_ID_HEX }],
        });
        return;
      }
      if (err.code === 4001) {
        throw new Error('User rejected the request');
      }
      throw new Error(err.message || `MetaMask error (code: ${err.code})`);
    }
    throw switchError;
  }
}
