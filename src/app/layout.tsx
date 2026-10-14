import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { IBM_Plex_Mono, Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/navigation/site-header";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-loreline-sans",
});

const story = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-loreline-story",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Samvaad AI — Sovereign Press Briefing Assistant",
  description: "AI-based press note generation, OCR/STT fact extraction, and official briefing assistant for police departments and government officers.",
  applicationName: "Samvaad AI",
};

export const instant = false;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      style={{ colorScheme: "light" }}
      className={cn(
        sans.variable,
        story.variable,
        mono.variable,
        "min-h-screen bg-background text-foreground antialiased font-sans",
      )}
    >
      <body suppressHydrationWarning className="min-h-screen flex flex-col bg-background text-foreground">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <SiteHeader />
          <main className="flex-1 min-h-screen bg-background text-foreground pt-14 sm:pt-16">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}


