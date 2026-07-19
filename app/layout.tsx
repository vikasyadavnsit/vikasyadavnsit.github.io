import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeContext";
import DevToolsProtection from "@/components/DevToolsProtection";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://vikasyadavnsit.github.io";
const SITE_NAME = "Vikas Yadav";
const SITE_DESCRIPTION = "Software Engineer & Digital Creator";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Portfolio`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Portfolio`,
    description: SITE_DESCRIPTION,
    images: ["/assets/icons/favicon.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Portfolio`,
    description: SITE_DESCRIPTION,
    images: ["/assets/icons/favicon.svg"],
  },
  icons: {
    icon: [
      { url: "/assets/icons/favicon.svg", type: "image/svg+xml" },
    ],
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
