import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "GraVITas'26 | Press Intelligence", description: "Authorized statistical intelligence dashboard" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
