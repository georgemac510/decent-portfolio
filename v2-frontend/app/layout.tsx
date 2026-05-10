import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Decent Portfolio',
  description:
    'A peer-to-peer crypto portfolio tracker built on OrbitDB and IPFS.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
