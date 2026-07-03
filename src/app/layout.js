import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata = {
  title: "Catálogo Online · Arthromed",
  description: "Portfólio de Produtos e Especialidades Arthromed",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${jakarta.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
