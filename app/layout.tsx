import "./globals.css";

import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import { TailwindIndicator } from "@/components/tailwind-indicator";

const workSans = Work_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XRPL EVM Transfer - Send XRP with .xrpl Domain Support",
  description:
    "Send XRP on XRPL EVM Mainnet with support for .xrpl domain resolution via ZNS. Transfer native XRP to addresses or .xrpl domains seamlessly.",
  keywords: [
    "XRPL EVM",
    "XRPL Transfer",
    "ZNS",
    "xrpl domains",
    "Ethereum Virtual Machine",
    "XRPL",
    "Smart Contracts",
    "Blockchain",
    "DeFi",
    "dApps",
    "Ethereum Compatibility",
    "XRP",
    "Web3",
    "ENS",
    "Domain Names",
  ],
  openGraph: {
    title: "XRPL EVM Transfer – Send XRP with .xrpl Domain Support",
    description:
      "Transfer XRP on XRPL EVM Mainnet with seamless .xrpl domain resolution powered by ZNS.",
    url: "https://xrplevm.org",
    type: "website",
  },
  referrer: "no-referrer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* 
        Make sure the <body> is "relative" so our absolutely positioned
        images can be placed behind other content via z-[-1].
      */}
      <body className={`${workSans.className} antialiased relative`}>
        <img
          src="/left.svg"
          alt="Branding left"
          className="absolute top-0 bottom-0 left-0 w-32 md:w-69 object-contain pointer-events-none z-[-1]"
        />

        <img
          src="/right.svg"
          alt="Branding right"
          className="absolute top-50 bottom-0 right-0 w-32 md:w-69 object-contain pointer-events-none z-[-1]"
        />

        {children}

        <TailwindIndicator />
      </body>
    </html>
  );
}
