import type { Metadata } from "next";
import Link from "next/link";
import SiteLogo from "./SiteLogo";
import Navigation from "./Navigation";
import FloatingContact from "./FloatingContact";
import "./globals.css";


export const metadata: Metadata = {
  title: "Delicious Meat Shop | Fresh Cold Store",
  description: "Premium Quality Meat and Cold Store Manager. Fresh chicken, mutton, buff, and pork delivered to your doorstep.",
  keywords: "Delicious Meat Shop, meat, cold store, chicken, mutton, buff, pork, fresh meat, online shopping Nepal",
  openGraph: {
    title: "Delicious Meat Shop | Fresh Cold Store",
    description: "Your go-to store for fresh, premium quality meat products.",
    url: "https://lyka-nepal.example.com",
    siteName: "LYKA Nepal",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "en_NP",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg?v=1",
    shortcut: "/favicon.svg?v=1",
    apple: "/favicon.svg?v=1",
  },
};

import ClientLayout from "@/components/ClientLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ClothingStore",
              "name": "LYKA Nepal",
              "image": "https://lyka-nepal.example.com/logo.png",
              "@id": "https://lyka-nepal.example.com",
              "url": "https://lyka-nepal.example.com",
              "telephone": "+9771234567890",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Imadole",
                "addressLocality": "Lalitpur",
                "postalCode": "44700",
                "addressCountry": "NP"
              },
              "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday"
                ],
                "opens": "10:00",
                "closes": "20:00"
              }
            })
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
