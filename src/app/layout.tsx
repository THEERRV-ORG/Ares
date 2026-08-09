import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Sidebar } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";
import { AuthGate } from "@/components/auth-gate";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const telma = localFont({
  variable: "--font-telma",
  src: [
    { path: "../assets/fonts/telma/Telma-Regular.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/telma/Telma-Medium.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/telma/Telma-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ares",
  description: "Ares",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${telma.variable} dark h-full antialiased`}
    >
      <body className="h-full bg-background text-foreground overflow-hidden">
        <AuthProvider>
          <AuthGate>
            <Sidebar />
            <UserMenu />
            {children}
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
