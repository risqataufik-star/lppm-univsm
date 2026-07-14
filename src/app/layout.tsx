import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Admin LPPM UnivSM' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-100 text-gray-800">{children}</body>
    </html>
  );
}
