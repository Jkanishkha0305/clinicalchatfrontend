import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import ReduxProvider from "@/components/ReduxProvider";
import QueryProvider from "@/components/QueryProvider";
import { ToastProvider } from "@/lib/toast";
import ToastContainer from "@/components/ToastContainer";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clinical Chat | Trial Intelligence Workspace",
  description: "Search, analyze, and discuss clinical trials in a prompt-first workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      </head>
      <body
        className={`${manrope.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ToastProvider>
          <QueryProvider>
            <ReduxProvider>{children}</ReduxProvider>
          </QueryProvider>
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
