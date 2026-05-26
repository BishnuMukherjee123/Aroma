import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Aroma AR Management Portal",
  description: "Login to manage your Aroma AR restaurant experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        {/* Material Symbols icon font — kept as <link> since next/font does not support icon fonts */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        {/*
          Inline AR-return reload guard.
          Uses next/script (raw <script> in JSX is ignored by React on the
          client and triggers a runtime warning). strategy="beforeInteractive"
          guarantees this runs before React hydrates so a stale BFCache
          restore is replaced with a fresh menu page.
        */}
        <Script
          id="aroma-ar-return-reload"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var key = 'aroma-ar-active';
                var restore = function() {
                  try {
                    if (sessionStorage.getItem(key) === '1') {
                      sessionStorage.removeItem(key);
                      window.location.reload();
                    }
                  } catch (e) {}
                };
                // CASE A: normal navigation back – run immediately before React hydrates
                restore();
                // CASE B: BFCache restore – pageshow fires before React wakes up
                window.addEventListener('pageshow', function(event) {
                  if (event.persisted) restore();
                });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
