import type {Metadata} from 'next';
import { Geist } from 'next/font/google'; // Keep Geist Sans
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SpotOn Cover',
  description: 'Crea tus portadas de canciones personalizadas estilo Spotify',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark"> {/* Ensure dark theme is applied if any components rely on .dark selector, lang set to es */}
      <body className={`${geistSans.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster /> {/* Add Toaster for notifications */}
      </body>
    </html>
  );
}
