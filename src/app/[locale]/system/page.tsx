import { useTranslations } from "next-intl";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { readSiteData } from "@/lib/store";
import { t as tl } from "@/lib/locale-helper";

export async function generateMetadata({
    params: { locale },
}: {
    params: { locale: string };
}) {
    const t = await getTranslations({ locale, namespace: "system" });
    return {
        title: `${t("title")} — TOKYO ROZE`,
        description: t("subtitle"),
    };
}

export default function SystemPage({
    params: { locale },
}: {
    params: { locale: string };
}) {
    unstable_setRequestLocale(locale);
    const t = useTranslations("system");
    const ta = useTranslations("area");
    const siteData = readSiteData();
    const courses = siteData.courses;
    const areas = siteData.areas;

    return (
        <div className="pt-24 pb-16 md:pt-28 md:pb-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="section-title">{t("title")}</h1>
                    <p className="section-subtitle">{t("subtitle")}</p>
                </div>

                {/* Course Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {courses.map((course, index) => (
                        <div key={course.id} className="card p-6 flex flex-col">
                            <h3 className="font-display text-xl font-bold text-white mb-2">
                                {tl(course.name, locale)}
                            </h3>
                            <div className="flex items-baseline gap-2 mb-3">
                                <span className="text-3xl font-bold text-gold-400">¥{course.price.toLocaleString()}</span>
                                <span className="text-dark-400 text-sm">{course.duration}{t("minutes")}</span>
                            </div>
                            {course.description && (
                                <p className="text-dark-400 text-sm mb-4 flex-1">{tl(course.description, locale)}</p>
                            )}
                            <Link
                                href={`/${locale}/booking?course=${course.id}`}
                                className="btn-primary text-center text-sm"
                            >
                                {t("selectCourse")}
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Additional Info */}
                <div className="card p-6 mb-8">
                    <h2 className="font-display text-xl font-bold text-white mb-4">{t("notes")}</h2>
                    <ul className="space-y-2">
                        {[t("note1"), t("note2"), t("note3"), t("note4")].map((note, i) => (
                            <li key={i} className="flex items-start gap-2 text-dark-300 text-sm">
                                <span className="text-dark-500">•</span>
                                {note}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Option Fees */}
                <div className="card p-6 mb-8">
                    <h2 className="font-display text-xl font-bold text-white mb-4">{t("nomination")}</h2>
                    <p className="text-dark-300 text-sm mb-3">{t("nominationNote")}</p>
                    <p className="text-dark-300 text-sm">{t("transportNote")}</p>
                </div>

                {/* Payment Methods */}
                <div className="card p-6 mb-8">
                    <h2 className="font-display text-xl font-bold text-white mb-4">{t("paymentMethods")}</h2>
                    <p className="text-dark-300 text-sm">{t("creditCard")}</p>
                </div>

                {/* Service Areas */}
                <div className="mb-8">
                    <h2 className="section-title text-center mb-4">{ta("title")}</h2>
                    <p className="section-subtitle text-center mb-8">{ta("subtitle")}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {areas.map((area) => (
                            <div key={area.id} className="card p-4 text-center">
                                <h3 className="font-display text-lg font-bold text-white mb-1">{tl(area.name, locale)}</h3>
                                <p className="text-dark-400 text-xs mb-2">{tl(area.description, locale)}</p>
                                <p className="text-dark-500 text-xs mb-1">~{area.transportMinutes}min</p>
                                <p className="text-gold-400 text-xs font-medium">
                                    {area.transportFee === 0 ? "Free" : `¥${area.transportFee.toLocaleString()}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
