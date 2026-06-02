import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kotoba Quest",
  description: "日本語でプログラミングを学ぶRPG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0f1117; color: #e2e8f0; }
          select option { background: #1a202c; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
