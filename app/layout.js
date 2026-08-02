import "./globals.css";
import { LangProvider } from "../components/LangProvider";
import { SettingsProvider } from "../components/SettingsProvider";

export const metadata = {
  title: "Wijkkrant",
  description: "De online wijkkrant — nieuws, verhalen en foto's uit onze wijk.",
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
