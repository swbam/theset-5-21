import '@/index.css'; // Correct path assuming @ maps to src/
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        <header className="border-b border-border/50 bg-card">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-primary">TheSet</Link>
            <nav>
              <ul className="flex space-x-6">
                <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
                <li><Link href="/artists" className="hover:text-primary transition-colors">Artists</Link></li>
                <li><Link href="/import" className="hover:text-primary transition-colors">Import</Link></li>
                <li><Link href="/admin" className="hover:text-primary transition-colors">Admin</Link></li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="min-h-screen bg-background">
          {children}
        </main>
        <footer className="py-6 border-t border-border/50 bg-card">
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} TheSet. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
} 