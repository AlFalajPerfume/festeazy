import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { CUSTOM_FONT_FACE_CSS, GOOGLE_FONT_STYLESHEET_URL } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Festeazy | Make your fest easy",
  description:
    "Festeazy helps madrasas, schools and event teams manage students, programmes, judges, marks, results, reports and public portals.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={GOOGLE_FONT_STYLESHEET_URL} />
        <style dangerouslySetInnerHTML={{ __html: CUSTOM_FONT_FACE_CSS }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}