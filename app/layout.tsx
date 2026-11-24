import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tables Buddy - CBSE Primary Learning",
  description: "CBSE curriculum learning for Class 1 to 5 with gentle Indian Teacher voice, multiplication tables up to 30, 2,500 vocabulary words, and Talking Tom rewards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}