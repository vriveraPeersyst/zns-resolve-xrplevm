# XRPL EVM Transfer DApp

A production-ready Next.js decentralized application for sending XRP on XRPL EVM Mainnet with seamless .xrpl domain resolution powered by ZNS (Zelf Name Service).

## ✨ Features

- 🔗 **MetaMask Integration**: Seamless wallet connection with automatic network detection
- 🌐 **XRPL EVM Mainnet Support**: One-click network addition to MetaMask
- 🏷️ **ZNS Domain Resolution**: Resolve `.xrpl` domains to addresses in real-time
- 💸 **Native XRP Transfers**: Send XRP directly to addresses or .xrpl domains
- ⚡ **Real-time Domain Resolution**: See resolved addresses as you type
- 🎨 **Modern UI**: Built with Tailwind CSS and Radix UI components
- 🔄 **Reverse Lookup**: Display connected wallet's primary .xrpl domain
- 📱 **Mobile Responsive**: Full support for mobile wallets via MetaMask deep linking

## 🌐 Network Information

| Parameter | Value |
|-----------|-------|
| **Network Name** | XRPL EVM |
| **RPC URL** | https://rpc.xrplevm.org/ |
| **Chain ID** | 1440000 (0x15F900) |
| **Currency Symbol** | XRP |
| **Block Explorer** | https://explorer.xrplevm.org |
| **ZNS Registry** | [0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D](https://explorer.xrplevm.org/address/0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D) |

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **MetaMask**: Browser extension or mobile app

### Installation

```bash
# Clone the repository
git clone https://github.com/vriveraPeersyst/zns-resolve-xrplevm.git
cd zns-resolve-xrplevm

# Install dependencies
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:5089](http://localhost:5089) to view the application.

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## 📖 How It Works

### ZNS Domain Resolution

The application integrates with the ZNS Registry contract on XRPL EVM to provide seamless `.xrpl` domain name resolution:

#### Forward Lookup (Name → Address)
1. User enters a `.xrpl` domain name (e.g., `alice.xrpl`)
2. App strips the `.xrpl` suffix to get the base name (`alice`)
3. Queries `domainLookup(name)` to get the token ID
4. Queries `registryLookupById(tokenId)` to get owner address
5. Displays the resolved address in real-time

#### Reverse Lookup (Address → Name)
1. User connects their wallet
2. App queries `userLookupByAddress(address)` to get user config
3. Retrieves the primary domain token ID
4. Queries `registryLookupById(tokenId)` to get domain name
5. Displays the domain name in the wallet button

**Note**: MetaMask does not currently support custom ENS registries via the `wallet_addEthereumChain` RPC method (per [EIP-3085](https://eips.ethereum.org/EIPS/eip-3085)). All domain resolution is handled client-side within the dApp before sending transactions.

### Sending XRP

1. **Connect Wallet**: Click "Connect Wallet" to connect MetaMask
2. **Add Network**: Click "Add XRPL EVM Network" (only needed once)
3. **Switch Network**: Ensure you're on XRPL EVM Mainnet
4. **Enter Recipient**: Type a `.xrpl` domain or Ethereum address
5. **Enter Amount**: Specify the amount of XRP to send
6. **Send**: Click "Send XRP" and confirm the transaction in MetaMask

## 🏗️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Blockchain**: [Viem](https://viem.sh) for Ethereum interactions
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **Wallet**: MetaMask integration via EIP-1193
- **Type Safety**: TypeScript with strict mode
- **Deployment**: Optimized for [Vercel](https://vercel.com)

## 📁 Project Structure

```
zns-resolve-xrplevm/
├── app/
│   ├── page.tsx              # Main application page
│   ├── layout.tsx            # Root layout with metadata
│   └── globals.css           # Global styles
├── components/
│   ├── transfer.tsx          # Main transfer component
│   ├── connect-wallet-button.tsx  # Wallet connection UI
│   ├── footer.tsx            # Footer component
│   └── ui/                   # Reusable UI components
├── lib/
│   ├── xrplEvm.ts           # XRPL EVM network configuration
│   ├── zns.ts               # ZNS Registry integration
│   ├── transfer.ts          # Transfer utilities
│   └── utils.ts             # Helper functions
├── public/                   # Static assets
├── vercel.json              # Vercel deployment configuration
└── package.json             # Project dependencies
```

## 🔧 Configuration

### Environment Variables

No environment variables are required for basic functionality. All configuration is hardcoded for XRPL EVM Mainnet.

### Network Configuration

Edit `lib/xrplEvm.ts` to modify network settings:

```typescript
export const XRPL_EVM_CHAIN_ID_HEX = '0x15F900';
export const XRPL_EVM = {
  id: parseInt(XRPL_EVM_CHAIN_ID_HEX, 16),
  name: 'XRPL EVM',
  // ... other settings
};
```

### ZNS Registry

Edit `lib/zns.ts` to update the registry address:

```typescript
export const ZNS_REGISTRY = '0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D' as const;
```

## 🚀 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vriveraPeersyst/zns-resolve-xrplevm)

Or manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

The `vercel.json` configuration includes:
- Security headers (CSP, X-Frame-Options, etc.)
- Next.js framework detection
- Optimized build settings

### Deploy to Other Platforms

The application is a standard Next.js app and can be deployed to:
- **Netlify**: Use the Next.js build plugin
- **Railway**: Automatically detected
- **AWS Amplify**: Configure build settings for Next.js
- **Cloudflare Pages**: Use Next.js adapter

## 🔒 Security

- ✅ No private keys stored or transmitted
- ✅ All transactions signed client-side by MetaMask
- ✅ Security headers configured in `vercel.json`
- ✅ Input validation for addresses and amounts
- ✅ Domain resolution verification
- ✅ No backend or API required

## 🐛 Troubleshooting

### MetaMask Not Detected
- Ensure MetaMask extension is installed and enabled
- On mobile, use the "Connect Wallet" button to open in MetaMask browser
- Check browser console for errors

### Domain Not Resolving
- Verify the domain exists in the ZNS Registry
- Ensure the domain hasn't expired
- Check that the domain owner has set it correctly

### Transaction Failing
- Ensure sufficient XRP balance for amount + gas fees
- Verify you're on XRPL EVM Mainnet
- Check that the recipient address is valid

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📚 Resources

- [XRPL EVM Documentation](https://docs.xrplevm.org)
- [ZNS Registry Contract](https://explorer.xrplevm.org/address/0xf180136DdC9e4F8c9b5A9FE59e2b1f07265C5D4D)
- [Viem Documentation](https://viem.sh)
- [Next.js Documentation](https://nextjs.org/docs)
- [MetaMask Developer Docs](https://docs.metamask.io)

## 💬 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above

---

Built with ❤️ for the XRPL EVM community


