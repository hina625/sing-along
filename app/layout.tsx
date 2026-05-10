import { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Rubik } from "next/font/google";

import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/providers/ThemeProvider";

const rubik = Rubik({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sing Along",
  description: "Video calling App",
  icons: {
    icon: "/icons/full-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/css/all.min.css" />
        <link rel="stylesheet" href="/css/quick-website.css" id="stylesheet" />
        {/* Set theme class before first paint so users don't see a dark→light flash.
            suppressHydrationWarning above is required because this script may flip
            the `class` from "dark" to "light" before React hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('singalong.theme');var c=document.documentElement.classList;if(t==='light'){c.remove('dark');c.add('light');}else{c.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${rubik.className} bg-bg-dark`}>
        <ThemeProvider>
          <ClerkProvider>
            <Toaster />
            {children}
          </ClerkProvider>
        </ThemeProvider>

        <script src="/js/jquery.min.js"></script>
        <script src="/js/bootstrap.bundle.min.js"></script>
        <script src="/js/svg-injector.min.js"></script>
        <script src="/js/feather.min.js"></script>
        <script src="/js/quick-website.js"></script>
      </body>
    </html>
  );
}
