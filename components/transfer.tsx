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
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [isTypingAnimation, setIsTypingAnimation] = useState<boolean>(false);
  const [previousRecipientLength, setPreviousRecipientLength] = useState<number>(0);
  const [deleteCount, setDeleteCount] = useState<number>(0);

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

  // Resolve .xrpl names as user types - optimized for speed
  useEffect(() => {
    const resolveDebounced = async () => {
      const trimmedRecipient = recipient.trim();
      
      if (trimmedRecipient.toLowerCase().endsWith(".xrpl")) {
        setIsResolvingName(true);
        try {
          const address = await resolveXrplNameToAddress(trimmedRecipient);
          setResolvedAddress(address);
        } catch (error) {
          console.error("Error resolving name:", error);
          setResolvedAddress(null);
        } finally {
          setIsResolvingName(false);
        }
      } else {
        setResolvedAddress(null);
        setIsResolvingName(false);
      }
    };

    // For better UX: start resolving immediately if .xrpl is complete
    // Use shorter debounce for completed domains, longer for incomplete ones
    const isComplete = recipient.toLowerCase().endsWith(".xrpl") && recipient.length > 5;
    const debounceTime = isComplete ? 100 : 250; // 100ms for complete, 250ms for typing
    
    const timer = setTimeout(resolveDebounced, debounceTime);
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

  // Magical typing animation: auto-complete with .xrpl after 0.74s pause
  useEffect(() => {
    // Only trigger if:
    // 1. User has typed something
    // 2. Input doesn't already end with .xrpl
    // 3. Input doesn't contain a dot (to avoid interfering with addresses)
    // 4. Input is not empty
    // 5. Not currently animating
    if (!recipient || recipient.includes('.') || recipient.trim() === '' || isTypingAnimation) {
      return;
    }

    const timer = setTimeout(() => {
      const xrplSuffix = '.xrpl';
      let currentIndex = 0;
      const baseText = recipient; // Capture the base text at start
      setIsTypingAnimation(true);

      const typeNextChar = () => {
        if (currentIndex < xrplSuffix.length) {
          setRecipient(baseText + xrplSuffix.substring(0, currentIndex + 1));
          currentIndex++;
          setTimeout(typeNextChar, 80); // 80ms between each character
        } else {
          setIsTypingAnimation(false);
        }
      };

      typeNextChar();
    }, 740); // 0.74 seconds pause

    return () => {
      clearTimeout(timer);
    };
  }, [recipient, isTypingAnimation]);

  // Detect deletion and auto-clear after 2 backspaces
  useEffect(() => {
    // Track if user is deleting
    if (recipient.length < previousRecipientLength) {
      // User deleted a character
      setDeleteCount(prev => prev + 1);
      
      // If user has deleted 2 characters, clear the input
      if (deleteCount >= 1) {
        setRecipient('');
        setDeleteCount(0);
        setPreviousRecipientLength(0);
        return;
      }
    } else if (recipient.length > previousRecipientLength) {
      // User is typing, reset delete count
      setDeleteCount(0);
    }
    
    setPreviousRecipientLength(recipient.length);
  }, [recipient.length, previousRecipientLength, deleteCount]);

  const isConnected = connectedAddress !== "";
  const isOnXRPLEVM: boolean = !!chainId && chainId.toLowerCase() === XRPL_EVM_CHAIN_ID_HEX.toLowerCase();

  // Copy to clipboard function that works on all devices
  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      // Modern browsers with Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or when clipboard API is not available
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

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
            {/* Enhanced real-time feedback */}
            {recipient.toLowerCase().includes('.xrpl') && (
              <div className="space-y-1">
                {isResolvingName && (
                  <span className="text-sm text-blue-400 flex items-center gap-1">
                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    Resolving domain...
                  </span>
                )}
                {!isResolvingName && resolvedAddress && (
                  <div className="text-sm text-green-400">
                    <div className="flex items-center gap-2 mb-1">
                      <span>✓ Resolves to:</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(resolvedAddress)}
                      className="bg-green-400/10 hover:bg-green-400/20 px-2 py-1 rounded font-mono text-xs transition-colors cursor-pointer flex items-center gap-1 border border-green-400/20 w-full sm:w-auto break-all"
                      title="Click to copy address"
                    >
                      <span className="break-all">{resolvedAddress}</span>
                      {copiedAddress ? (
                        <span className="text-green-300 flex-shrink-0">✓</span>
                      ) : (
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                {!isResolvingName && recipient.toLowerCase().endsWith(".xrpl") && !resolvedAddress && recipient.length > 5 && (
                  <div className="text-sm text-red-400 flex items-center gap-2">
                    <span>✗ Domain not found or not registered</span>
                    <Link
                      href={`https://zns.bio/search?tab=smart&domain=${encodeURIComponent(recipient.toLowerCase().replace(/\.xrpl$/, ''))}&chain=1440000`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-300 underline text-xs opacity-80 hover:opacity-100 transition-opacity"
                    >
                      Buy it now!
                    </Link>
                  </div>
                )}
              </div>
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
