import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeContext";
import DevToolsProtection from "@/components/DevToolsProtection";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vikas Yadav | Portfolio",
  description: "Software Engineer & Digital Creator",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <ThemeProvider>
          <DevToolsProtection />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
