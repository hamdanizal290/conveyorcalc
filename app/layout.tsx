import "./globals.css";

export const metadata = {
  title: "ConveyorCalc — RE Mechanical",
  description: "Belt conveyor design & verification tool — internal Rekayasa Engineering.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-white text-[rgb(var(--re-ink))]">
        {children}
      </body>
    </html>
  );
}
