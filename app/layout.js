import "./globals.css";

export const metadata = {
  title: "Wijkkrant",
  description: "De online wijkkrant — nieuws, verhalen en foto's uit onze wijk.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
