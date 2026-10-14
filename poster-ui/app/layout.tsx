import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Poster — доступ по токенам',description:'Лабораторная работа № 4. Solidity, Hardhat, Next.js и Web3.js.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ru"><body>{children}</body></html>;}
