import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dragon AI - AI Teaching Assistant Platform',
  description: 'An AI-powered teaching assistant platform for university instructors',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
