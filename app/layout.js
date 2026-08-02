import "./globals.css";
import { LangProvider } from "../components/LangProvider";
import { SettingsProvider } from "../components/SettingsProvider";

export const metadata = {
  title: "Wijkkrant",
  description: "De online wijkkrant — nieuws, verhalen en foto's uit onze wijk.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wijkkrant",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#1b302a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>
        <LangProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </LangProvider>
      </body>
    </html>
  );
}
