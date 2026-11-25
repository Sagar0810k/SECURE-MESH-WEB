import type { Metadata } from 'next'
import { Manrope, Geist_Mono } from 'next/font/google'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'SecureMesh: offline messaging over Bluetooth',
  description: 'Peer-to-peer, end-to-end encrypted chat for nearby Android phones. No internet, no server: multi-hop relay, duplicate suppression and an on-device intrusion detector.',
  icons: { icon: [{ url: '/icon.png', type: 'image/png', sizes: '256x256' }], shortcut: '/icon.png', apple: '/icon.png' },
  openGraph: { title: 'SecureMesh', description: 'Messages that do not need a network.', images: ['/icon.png'] },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${mono.variable}`}>
      <body style={{ margin: 0, background: '#F7F6F2' }}>{children}</body>
    </html>
  )
}