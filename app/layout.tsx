import './globals.css';import type{Metadata}from'next';
export const metadata:Metadata={title:'Procura | Procurement intelligence',description:'AI-powered B2B procurement'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
