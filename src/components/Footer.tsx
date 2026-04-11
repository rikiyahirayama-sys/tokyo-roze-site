"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
    const t = useTranslations("footer");
    const tn = useTranslations("nav");
    const locale = useLocale();

    return (
        <footer className="bg-dark-950 border-t border-dark-800/30 pt-12 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <Image
                                src="/images/logo.png"
                                alt="TOKYO RENDAIRE"
                                width={36}
                                height={36}
                                className="w-9 h-9 object-contain"
                            />
                            <h3 className="font-display text-xl font-bold gold-accent">
                                TOKYO RENDAIRE
                            </h3>
                        </div>
                        <p className="text-dark-400 text-sm leading-relaxed">
                            {t("legal")}
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-3">Links</h4>
                        <div className="flex flex-col gap-2">
                            <Link href={`/${locale}/cast`} className="text-dark-400 text-sm hover:text-white transition-colors">
                                {tn("cast")}
                            </Link>
                            <Link href={`/${locale}/system`} className="text-dark-400 text-sm hover:text-white transition-colors">
                                {tn("system")}
                            </Link>
                            <Link href={`/${locale}/booking`} className="text-dark-400 text-sm hover:text-white transition-colors">
                                {tn("booking")}
                            </Link>
                            <Link href={`/${locale}/contact`} className="text-dark-400 text-sm hover:text-white transition-colors">
                                {tn("contact")}
                            </Link>
                            <Link href={`/${locale}/recruit`} className="text-dark-400 text-sm hover:text-white transition-colors">
                                {tn("recruit")}
                            </Link>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white font-semibold mb-3">Contact</h4>
                        <div className="flex flex-col gap-2">
                            <a
                                href="https://wa.me/81XXXXXXXXXX"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-dark-400 text-sm hover:text-[#25D366] transition-colors"
                            >
                                WhatsApp
                            </a>
                            <span className="text-dark-400 text-sm">
                                WeChat: tokyoroze
                            </span>
                            <a
                                href={`https://line.me/R/ti/p/${process.env.NEXT_PUBLIC_LINE_ID || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-dark-400 text-sm hover:text-[#06C755] transition-colors"
                            >
                                LINE
                            </a>
                            <a
                                href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_ID || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-dark-400 text-sm hover:text-[#0088cc] transition-colors"
                            >
                                Telegram
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-dark-800/50 pt-6">
                    <p className="text-dark-500 text-xs text-center">
                        {t("disclaimer")}
                    </p>
                    <p className="text-dark-600 text-xs text-center mt-2">
                        {t("copyright")}
                    </p>
                </div>
            </div>
        </footer>
    );
}
