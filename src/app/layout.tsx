import type {Metadata} from 'next';
import { Geist } from 'next/font/google'; // Keep Geist Sans
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// Geist Mono removed as it's not explicitly requested by Spotify theme
// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'SpotOn Cover',
  description: 'Create your custom Spotify-like song covers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> {/* Ensure dark theme is applied if any components rely on .dark selector */}
      <body className={`${geistSans.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster /> {/* Add Toaster for notifications */}
      </body>
    </html>
  );
}
