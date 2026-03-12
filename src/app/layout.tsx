import type { Metadata } from "next";
import { Abril_Fatface, Crimson_Pro } from "next/font/google";
import "./globals.css";

const abril = Abril_Fatface({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-abril",
});

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
});

export const metadata: Metadata = {
  title: "Seattle Shows",
  description: "Discover live music in Seattle and Ballard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${abril.variable} ${crimson.variable}`}>
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
