import "./globals.css"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "CodeBase",
  icons: {
    icon: "/favicon.ico",
  },
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
        <body>  {children} </body>
    </html>
    
    ) }     

export default Layout