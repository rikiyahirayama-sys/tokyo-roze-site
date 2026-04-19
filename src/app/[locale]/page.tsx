import { useTranslations } from "next-intl";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import CastCard from "@/components/CastCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import WeChatButton from "@/components/WeChatButton";
import LINEButton from "@/components/LINEButton";
import TelegramButton from "@/components/TelegramButton";
import { readSiteData } from "@/lib/store";
import { t as tl } from "@/lib/locale-helper";

export async function generateMetadata({
    params: { locale },
}: {
    params: { locale: string };
}) {
    const t = await getTranslations({ locale, namespace: "hero" });
    return {
        title: `TOKYO ROZE — ${t("title")} | ${t("subtitle")}`,
        description: t("description"),
    };
}

export default function HomePage({
    params: { locale },
}: {
    params: { locale: string };
}) {
    unstable_setRequestLocale(locale);
    const t = useTranslations("hero");
    const ta = useTranslations("about");
    const tc = useTranslations("cast");
    const ts = useTranslations("system");
    const tcon = useTranslations("contact");
    const tcom = useTranslations("common");

    const siteData = readSiteData();
    const demoCasts = siteData.casts;
    const courses = siteData.courses;
    const areas = siteData.areas;

    const availableCasts = demoCasts.filter((c) => c.available);

    return (
        <div>
            {/* === HERO === */}
            <section className="relative pt-24 pb-12 md:pt-28 md:pb-16 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent" />

                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                        {/* Left: Branding */}
                        <div className="flex-1 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 mb-5">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-xs text-green-400 font-medium">{tcom("openingHours")}</span>
                            </div>

                            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-3">
                                <span className="gold-accent">{t("title")}</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-dark-300 font-display mb-4">
                                {t("subtitle")}
                            </p>
                            <p className="text-dark-400 max-w-lg mb-6 leading-relaxed">
                                {t("description")}
                            </p>

                            {/* Trust badges */}
                            <div className="flex flex-wrap gap-3 mb-6 justify-center lg:justify-start">
                                {[ta("point1"), ta("point5"), ta("point6")].map((point, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-800/80 border border-dark-700/40 text-xs text-dark-300">
                                        <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {point}
                                    </span>
                                ))}
                            </div>

                            {/* Quick contact */}
                            <div className="flex items-center gap-3 justify-center lg:justify-start">
                                <span className="text-xs text-dark-500 mr-1">{tcon("title")}:</span>
                                <WhatsAppButton text="" iconOnly />
                                <WeChatButton text="" iconOnly />
                                <LINEButton text="" iconOnly />
                                <TelegramButton text="" iconOnly />
                            </div>
                        </div>

                        {/* Right: Quick pricing cards */}
                        <div className="w-full lg:w-auto lg:min-w-[320px]">
                            <div className="bg-dark-900/80 backdrop-blur-sm border border-dark-700/40 rounded-2xl p-5">
                                <h2 className="font-display text-lg font-bold text-white mb-4 text-center">{ts("title")}</h2>
                                <div className="space-y-2.5">
                                    {courses.map((course, index) => (
                                        <Link
                                            key={course.id}
                                            href={`/${locale}/booking?course=${course.id}`}
                                            className="flex items-center justify-between py-3 px-4 rounded-lg bg-dark-800/50 hover:bg-dark-800 border border-dark-700/30 hover:border-primary-700/40 transition-all group"
                                        >
                                            <div>
                                                <p className="text-white text-sm font-medium group-hover:text-primary-300 transition-colors">
                                                    {tl(course.name, locale)}
                                                </p>
                                                <p className="text-dark-500 text-xs">{course.duration}{ts("minutes")}</p>
                                            </div>
                                            <p className="text-gold-400 font-bold">¥{course.price.toLocaleString()}</p>
                                        </Link>
                                    ))}
                                </div>
                                <Link
                                    href={`/${locale}/system`}
                                    className="mt-4 block text-center text-xs text-dark-400 hover:text-primary-300 transition-colors"
                                >
                                    {t("ctaSecondary")} →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* === CAST === */}
            <section className="py-16 md:py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="section-title">{tc("title")}</h2>
                        <p className="section-subtitle">{tc("subtitle")}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableCasts.slice(0, 6).map((cast) => (
                            <CastCard
                                key={cast.id}
                                cast={cast}
                                tAvailable={tc("available")}
                                tUnavailable={tc("unavailable")}
                                tNew={tc("newArrival")}
                                tRecommended={tc("recommended")}
                                tAge={tc("age")}
                                tHeight={tc("height")}
                                tViewDetails={tcom("viewDetails")}
                            />
                        ))}
                    </div>

                    {demoCasts.length > 6 && (
                        <div className="text-center mt-8">
                            <Link href={`/${locale}/cast`} className="btn-secondary">
                                {t("cta")} →
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* === ABOUT === */}
            <section className="py-16 md:py-20 bg-dark-900/40">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="section-title mb-4">{ta("title")}</h2>
                    <p className="text-dark-300 leading-relaxed mb-8">{ta("description")}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[ta("point1"), ta("point2"), ta("point3"), ta("point4"), ta("point5"), ta("point6")].map((point, i) => (
                            <div key={i} className="flex items-center gap-2 text-left px-4 py-3 rounded-lg bg-dark-800/50 border border-dark-700/30">
                                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm text-dark-200">{point}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* === AREA === */}
            <section className="py-16 md:py-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="section-title">{useTranslations("area")("title")}</h2>
                        <p className="section-subtitle">{useTranslations("area")("subtitle")}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {areas.map((area) => (
                            <div key={area.id} className="card p-4 text-center">
                                <h3 className="font-display text-lg font-bold text-white mb-1">{tl(area.name, locale)}</h3>
                                <p className="text-dark-400 text-xs mb-2">{tl(area.description, locale)}</p>
                                <p className="text-gold-400 text-xs">
                                    {area.transportFee === 0
                                        ? "Free delivery"
                                        : `¥${area.transportFee.toLocaleString()}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* === CONTACT CTA === */}
            <section className="py-16 md:py-20 bg-dark-900/40">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="section-title mb-3">{tcon("title")}</h2>
                    <p className="section-subtitle mb-8">{tcon("subtitle")}</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <WhatsAppButton text={tcon("whatsapp")} />
                        <WeChatButton text={tcon("wechat")} />
                        <LINEButton text={tcon("line")} />
                        <TelegramButton text={tcon("telegram")} />
                    </div>
                    <p className="text-dark-500 text-sm mt-6">{tcon("responseTime")}</p>
                </div>
            </section>
        </div>
    );
}
