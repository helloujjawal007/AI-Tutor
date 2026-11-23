import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans-serif">
      <body className="min-h-full bg-background text-background">
        {children}
      </body>
    </html>
  );
}