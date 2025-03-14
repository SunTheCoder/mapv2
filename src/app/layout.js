import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./store/provider";
import { AuthInit } from "./components/Auth/AuthInit";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MapBox Demo",
  description: "Interactive Map Demo for the CEC Website",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AuthInit>{children}</AuthInit>
        </Providers>
      </body>
    </html>
  );
}
