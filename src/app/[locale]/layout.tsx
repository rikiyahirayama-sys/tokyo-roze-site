import { NextIntlClientProvider } from "next-intl";
import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/lib/i18n/config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tokyoroze.com";

const hreflangMap: Record<string, string> = {
    en: "en",
    zh: "zh-Hans",
    ja: "ja",
    fr: "fr",
    es: "es",
    hi: "hi",
};

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
    params: { locale },
}: {
    params: { locale: string };
}): Promise<Metadata> {
    const alternates: Record<string, string> = {};
    for (const loc of locales) {
        alternates[hreflangMap[loc]] = `${BASE_URL}/${loc}`;
    }
    alternates["x-default"] = `${BASE_URL}/en`;

    return {
        metadataBase: new URL(BASE_URL),
        alternates: {
            canonical: `${BASE_URL}/${locale}`,
            languages: alternates,
        },
        openGraph: {
            siteName: "TOKYO ROZE",
            locale: hreflangMap[locale],
            type: "website",
            url: `${BASE_URL}/${locale}`,
        },
        twitter: {
            card: "summary_large_image",
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function LocaleLayout({
    children,
    params: { locale },
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    if (!locales.includes(locale as any)) notFound();
    unstable_setRequestLocale(locale);
    const messages = await getMessages();

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "TOKYO ROZE",
        url: `${BASE_URL}/${locale}`,
        telephone: "+81-XX-XXXX-XXXX",
        address: {
            "@type": "PostalAddress",
            addressLocality: "Tokyo",
            addressCountry: "JP",
        },
        openingHours: "Mo-Su 17:00-05:00",
        priceRange: "¥¥¥",
    };

    return (
        <html lang={locale}>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body className="min-h-screen flex flex-col">
                <NextIntlClientProvider messages={messages}>
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
