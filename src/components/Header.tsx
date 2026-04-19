"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
    const t = useTranslations("nav");
    const tc = useTranslations("common");
    const locale = useLocale();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
        { href: `/${locale}`, label: t("home") },
        { href: `/${locale}/cast`, label: t("cast") },
        { href: `/${locale}/system`, label: t("system") },
        { href: `/${locale}/booking`, label: t("booking") },
        { href: `/${locale}/contact`, label: t("contact") },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-dark-950/90 backdrop-blur-md border-b border-dark-800/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <Link href={`/${locale}`} className="flex items-center gap-2">
                        <Image
                            src="/images/logo.png"
                            alt="TOKYO ROZE"
                            width={44}
                            height={44}
                            className="w-10 h-10 md:w-11 md:h-11 object-contain"
                            priority
                        />
                        <span className="font-display text-lg md:text-xl font-bold gold-accent">
                            {tc("storeName")}
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="text-sm font-medium text-dark-300 hover:text-white transition-colors"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <LanguageSwitcher />
                        <Link href={`/${locale}/booking`} className="btn-primary text-sm py-2 px-6">
                            {tc("bookNow")}
                        </Link>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 text-dark-300 hover:text-white"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Nav */}
                {mobileOpen && (
                    <nav className="md:hidden pb-4 border-t border-dark-800/50 pt-4">
                        <div className="flex flex-col gap-3">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="text-base text-dark-300 hover:text-white transition-colors py-2"
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <Link
                                href={`/${locale}/recruit`}
                                onClick={() => setMobileOpen(false)}
                                className="text-base text-dark-300 hover:text-white transition-colors py-2"
                            >
                                {t("recruit")}
                            </Link>
                            <div className="pt-2">
                                <LanguageSwitcher />
                            </div>
                            <Link href={`/${locale}/booking`} className="btn-primary text-center mt-2" onClick={() => setMobileOpen(false)}>
                                {tc("bookNow")}
                            </Link>
                        </div>
                    </nav>
                )}
            </div>
        </header>
    );
}
