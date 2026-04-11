import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { readSiteData } from "@/lib/store";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tokyoroze.com";

const pages = ["", "/cast", "/system", "/booking", "/contact", "/recruit"];

export default function sitemap(): MetadataRoute.Sitemap {
    const entries: MetadataRoute.Sitemap = [];

    for (const page of pages) {
        for (const locale of locales) {
            const languages: Record<string, string> = {};
            for (const loc of locales) {
                languages[loc] = `${BASE_URL}/${loc}${page}`;
            }

            entries.push({
                url: `${BASE_URL}/${locale}${page}`,
                lastModified: new Date(),
                changeFrequency: page === "" ? "daily" : "weekly",
                priority: page === "" ? 1.0 : 0.8,
                alternates: { languages },
            });
        }
    }

    // Cast detail pages
    for (const cast of readSiteData().casts) {
        for (const locale of locales) {
            const languages: Record<string, string> = {};
            for (const loc of locales) {
                languages[loc] = `${BASE_URL}/${loc}/cast/${cast.id}`;
            }

            entries.push({
                url: `${BASE_URL}/${locale}/cast/${cast.id}`,
                lastModified: new Date(),
                changeFrequency: "daily",
                priority: 0.7,
                alternates: { languages },
            });
        }
    }

    return entries;
}
