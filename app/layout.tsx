import "./globals.css";
import { Public_Sans } from "next/font/google";

const publicSans = Public_Sans({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Dynamic charts generation</title>
        <link rel="shortcut icon" href="/images/favicon_sparkles.ico" />
        <meta
          name="description"
          content="Generate charts on demand based on user prompts without uploading data"
        />
        <meta property="og:title" content="Dynamic charts generation" />
        <meta
          property="og:description"
          content="Generate charts on demand based on user prompts without uploading data"
        />
        <meta property="og:image" content="/images/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Dynamic charts generation" />
        <meta
          name="twitter:description"
          content="Generate charts on demand based on user prompts without uploading data"
        />
        <meta name="twitter:image" content="/images/og-image.png" />
      </head>
      <body className={publicSans.className}>
        <div className="flex flex-col p-2 md:p-4 h-[90vh] max-h-[90%]">
          {children}
        </div>
      </body>
    </html>
  );
}
