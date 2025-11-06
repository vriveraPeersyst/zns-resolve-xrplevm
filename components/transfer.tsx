"use client";

import React, { useState, useEffect, JSX } from "react";
import { Button } from "./ui/button";
import { Logo } from "./logo";
import { ConnectWalletButton } from "./connect-wallet-button";
import { Input } from "./ui/input";
import Link from "next/link";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import type { MetaMaskInpageProvider } from "@metamask/providers";
import { addXRPLEVMToMetaMask, switchToXRPLEVM, XRPL_EVM_CHAIN_ID_HEX } from "@/lib/xrplEvm";
import { sendNativeToXrplName } from "@/lib/transfer";
import { resolveXrplNameToAddress, resolveAddressToXrplName } from "@/lib/zns";

// Get a typed reference to the Ethereum provider if it exists.
const getEthereumProvider = (): MetaMaskInpageProvider | undefined => {
  if (typeof window !== "undefined" && window.ethereum) {
    return window.ethereum as MetaMaskInpageProvider;
  }
  return undefined;
};

// Helper function to extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('reason' in error && typeof error.reason === 'string') {
      return error.reason;
    }
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

export function Transfer(): JSX.Element {
  const [connectedAddress, setConnectedAddress] = useState<string>("");
  const [connectedDomain, setConnectedDomain] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showTxModal, setShowTxModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [chainId, setChainId] = useState<string | null>(null);
  const [isResolvingName, setIsResolvingName] = useState<boolean>(false);
  const [isResolvingConnectedAddress, setIsResolvingConnectedAddress] = useState<boolean>(false);

  const ethereum = getEthereumProvider();
  const hasMetaMask: boolean = Boolean(ethereum);

  useEffect(() => {
    async function fetchChainId() {
      if (hasMetaMask && ethereum) {
        try {
          const cid = await ethereum.request({ method: "eth_chainId" });
          setChainId(cid as string);
        } catch (err) {
          console.error("Failed to get chainId:", err);
        }
      }
    }
    fetchChainId();

    if (hasMetaMask && ethereum) {
      const handleChainChanged = (...args: unknown[]): void => {
        const [chain] = args;
        if (typeof chain === "string") {
          setChainId(chain);
        } else {
          console.error("Invalid chain ID", chain);
        }
      };

      ethereum.on("chainChanged", handleChainChanged);

      return () => {
        ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [hasMetaMask, ethereum]);

  // Resolve .xrpl names as user types
  useEffect(() => {
    const resolveDebounced = async () => {
      if (recipient.toLowerCase().endsWith(".xrpl")) {
        setIsResolvingName(true);
        try {
          const address = await resolveXrplNameToAddress(recipient);
          setResolvedAddress(address);
        } catch (error) {
          console.error("Error resolving name:", error);
          setResolvedAddress(null);
        } finally {
          setIsResolvingName(false);
        }
      } else {
        setResolvedAddress(null);
      }
    };

    const timer = setTimeout(resolveDebounced, 500);
    return () => clearTimeout(timer);
  }, [recipient]);

  // Reverse lookup: resolve connected address to .xrpl domain
  useEffect(() => {
    const resolveConnectedAddress = async () => {
      if (connectedAddress) {
        setIsResolvingConnectedAddress(true);
        try {
          const domain = await resolveAddressToXrplName(connectedAddress);
          setConnectedDomain(domain);
        } catch (error) {
          console.error("Error resolving connected address:", error);
          setConnectedDomain(null);
        } finally {
          setIsResolvingConnectedAddress(false);
        }
      } else {
        setConnectedDomain(null);
      }
    };

    resolveConnectedAddress();
  }, [connectedAddress]);

  const isConnected = connectedAddress !== "";
  const isOnXRPLEVM: boolean = !!chainId && chainId.toLowerCase() === XRPL_EVM_CHAIN_ID_HEX.toLowerCase();

  const handleAddNetwork = async (): Promise<void> => {
    try {
      await addXRPLEVMToMetaMask();
    } catch (error: unknown) {
      console.error("Error adding network:", error);
      setErrorMessage("Failed to add network: " + getErrorMessage(error));
      setShowErrorModal(true);
    }
  };

  const handleSwitchNetwork = async (): Promise<void> => {
    try {
      await switchToXRPLEVM();
    } catch (error: unknown) {
      console.error("Error switching network:", error);
      setErrorMessage("Failed to switch network: " + getErrorMessage(error));
      setShowErrorModal(true);
    }
  };

  const handleSend = async (): Promise<void> => {
    if (!recipient || !amount) {
      setErrorMessage("Please enter both recipient and amount");
      setShowErrorModal(true);
      return;
    }

    if (!isConnected) {
      setErrorMessage("Please connect your wallet first");
      setShowErrorModal(true);
      return;
    }

    if (!isOnXRPLEVM) {
      setErrorMessage("Please switch to XRPL EVM network");
      setShowErrorModal(true);
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage("Please enter a valid amount");
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const hash = await sendNativeToXrplName(recipient.trim(), amount.trim());
      setTxHash(hash);
      setShowTxModal(true);
      // Reset form
      setRecipient("");
      setAmount("");
      setResolvedAddress(null);
    } catch (error: unknown) {
      console.error("Error sending transaction:", error);
      setErrorMessage("Failed to send transaction: " + getErrorMessage(error));
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const TransactionSuccessModal = (): JSX.Element | null => {
    if (!txHash) return null;

    const explorerUrl = `https://explorer.xrplevm.org/tx/${txHash}`;

    return (
      <AlertDialog open={showTxModal} onOpenChange={setShowTxModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transaction Sent!</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-400">Transaction Hash</span>
              <Link
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 underline break-all hover:text-green-300"
              >
                {txHash}
              </Link>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTxModal(false);
                  setTxHash(null);
                }}
                className="hover:bg-gray-800"
              >
                Close
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <>
      <section className="flex flex-col items-center justify-center gap-4 px-4 py-8">
        <div className="mb-8">
          <Logo className="w-56 h-12" />
        </div>

        <h1 className="text-3xl font-bold mb-2">XRPL EVM Transfer</h1>
        <p className="text-center text-gray-400 mb-6 max-w-md">
          Send XRP on XRPL EVM Mainnet. Supports .xrpl domain resolution via ZNS.
        </p>

        <div className="flex flex-col items-center gap-3 mb-4 md:flex-row md:justify-center">
          <ConnectWalletButton
            onConnected={(addr: string) => {
              setConnectedAddress(addr);
            }}
            onDisconnected={() => {
              setConnectedAddress("");
            }}
            connectedDomain={connectedDomain}
            isResolvingDomain={isResolvingConnectedAddress}
          />
          {!hasMetaMask ? (
            <Button variant="outline" className="h-10" disabled>
              No Wallet
            </Button>
          ) : isOnXRPLEVM ? (
            <Button variant="outline" className="h-10" disabled>
              ✅ XRPL EVM
            </Button>
          ) : (
            <Button variant="outline" className="h-10" onClick={handleSwitchNetwork}>
              Switch to XRPL EVM
            </Button>
          )}
          {!isOnXRPLEVM && hasMetaMask && (
            <Button variant="outline" className="h-10" onClick={handleAddNetwork}>
              Add XRPL EVM Network
            </Button>
          )}
        </div>

        <div className="w-full max-w-md space-y-4 mt-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="recipient" className="font-semibold">
              Recipient (.xrpl domain or address)
            </label>
            <Input
              id="recipient"
              type="text"
              value={recipient}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
              placeholder="alice.xrpl or 0x..."
              className="rounded-md px-3 py-2 w-full border border-white/20 bg-background text-foreground focus:placeholder-transparent"
            />
            {isResolvingName && <span className="text-sm text-gray-400">Resolving...</span>}
            {resolvedAddress && (
              <span className="text-sm text-green-400">
                ✓ Resolves to: {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
              </span>
            )}
            {recipient.toLowerCase().endsWith(".xrpl") && !isResolvingName && !resolvedAddress && (
              <span className="text-sm text-red-400">✗ Could not resolve domain</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="amount" className="font-semibold">
              Amount (XRP)
            </label>
            <Input
              id="amount"
              type="text"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              placeholder="0.01"
              className="rounded-md px-3 py-2 w-full border border-white/20 bg-background text-foreground focus:placeholder-transparent"
            />
          </div>

          <Button
            variant="default"
            size="lg"
            className="w-full mt-4"
            onClick={handleSend}
            disabled={loading || !isConnected || !recipient || !amount}
          >
            {loading ? "Sending..." : "Send XRP"}
          </Button>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-400">
            <strong>Network:</strong> XRPL EVM Sidechain
          </p>
          <p className="text-sm text-gray-400">
            <strong>Chain ID:</strong> 1440000
          </p>
          <p className="text-sm text-gray-400">
            <strong>ZNS Registry:</strong>{" "}
            <Link
              href="https://explorer.xrplevm.org/address/0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              0xf180...5D4D
            </Link>
          </p>
        </div>
      </section>

      {/* Transaction Success Modal */}
      {<TransactionSuccessModal />}

      {/* Error Modal */}
      {showErrorModal && (
        <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Error</AlertDialogTitle>
            </AlertDialogHeader>
            <p className="mb-4">{errorMessage}</p>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowErrorModal(false)}>
                Close
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
