import type { Metadata } from "next";
import Link from "next/link";
import SiteLogo from "./SiteLogo";
import Navigation from "./Navigation";
import FloatingContact from "./FloatingContact";
import "./globals.css";


export const metadata: Metadata = {
  title: "The Meatly | Fresh Cold Store",
  description: "Premium Quality Meat and Cold Store Manager. Fresh chicken, mutton, buff, and pork delivered to your doorstep.",
  keywords: "The Meatly, meat, cold store, chicken, mutton, buff, pork, fresh meat, online shopping Nepal",
  openGraph: {
    title: "The Meatly | Fresh Cold Store",
    description: "Your go-to store for fresh, premium quality meat products.",
    url: "https://themeatly.com",
    siteName: "The Meatly",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "en_NP",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=3" },
      { url: "/favicon.png?v=3", type: "image/png" }
    ],
    shortcut: "/favicon.ico?v=3",
    apple: "/favicon.png?v=3",
  },
};

import ClientLayout from "@/components/ClientLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              "name": "The Meatly",
              "image": "https://themeatly.com/logo.png",
              "@id": "https://themeatly.com",
              "url": "https://themeatly.com",
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
                "opens": "07:00",
                "closes": "21:00"
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
