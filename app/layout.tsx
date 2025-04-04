import "../globals.css"
import { Analytics } from "@vercel/analytics/react"
import Navbar from "./components/Navbar"

export default function RootLayout({
    // Layouts must accept a children prop.
    // This will be populated with nested layouts or pages
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <html lang="en">
        <body>
            <Navbar/>
            <main>
            {children}
            </main>
            <Analytics/>
        </body>
      </html>
    )
  }