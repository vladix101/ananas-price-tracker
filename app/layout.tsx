import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// latin-ext carries č ć š ž đ — without it the Serbian copy falls back mid-word.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Ananas Price Tracker",
    template: "%s · Ananas Price Tracker",
  },
  description: "Prati cene proizvoda sa ananas.rs i dobij mejl kada padnu.",
  // Phones render the page under the status bar; this keeps that strip in the
  // app's own colour instead of white-on-dark.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Ananas Tracker" },
};

export const viewport: Viewport = {
  // No maximumScale / userScalable: false — pinch-zoom is an accessibility
  // affordance, and the 16px input rule below removes the reason people
  // disable it.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The app is light-only (see globals.css), so the status bar is too — a
  // dark strip above a white page is the mismatch this replaces.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
