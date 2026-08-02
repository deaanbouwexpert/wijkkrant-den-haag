import "./globals.css";
import { LangProvider } from "../components/LangProvider";

export const metadata = {
  title: "Wijkkrant",
  description: "De online wijkkrant — nieuws, verhalen en foto's uit onze wijk.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
