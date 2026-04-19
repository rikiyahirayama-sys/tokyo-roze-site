"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";


const languages = [
    { code: "en", label: "English", sub: "英語" },
    { code: "zh", label: "中文", sub: "Chinese" },
    { code: "ja", label: "日本語", sub: "Japanese" },
    { code: "fr", label: "Français", sub: "French" },
    { code: "es", label: "Español", sub: "Spanish" },
    { code: "hi", label: "हिन्दी", sub: "Hindi" },
];

const entranceTexts: Record<string, { title: string; subtitle: string; confirm: string; decline: string; warning: string }> = {
    en: {
        title: "Age Verification",
        subtitle: "This website is for adults aged 18 and over only.",
        confirm: "I am 18 years or older",
        decline: "I am under 18",
        warning: "Access by minors under 18 is prohibited by law.",
    },
    zh: {
        title: "年龄确认",
        subtitle: "本网站仅限年满18周岁以上的成人访问。",
        confirm: "我已年满18周岁",
        decline: "我未满18周岁",
        warning: "法律禁止18岁以下未成年人访问。",
    },
    ja: {
        title: "年齢確認",
        subtitle: "このサイトは18歳以上の方のみご利用いただけます。",
        confirm: "私は18歳以上です",
        decline: "18歳未満です",
        warning: "18歳未満の方のアクセスは法律により禁止されています。",
    },
    fr: {
        title: "Vérification de l'âge",
        subtitle: "Ce site est réservé aux adultes de 18 ans et plus.",
        confirm: "J'ai 18 ans ou plus",
        decline: "J'ai moins de 18 ans",
        warning: "L'accès aux mineurs de moins de 18 ans est interdit par la loi.",
    },
    es: {
        title: "Verificación de edad",
        subtitle: "Este sitio web es solo para adultos mayores de 18 años.",
        confirm: "Tengo 18 años o más",
        decline: "Soy menor de 18 años",
        warning: "El acceso de menores de 18 años está prohibido por ley.",
    },
    hi: {
        title: "आयु सत्यापन",
        subtitle: "यह वेबसाइट केवल 18 वर्ष और उससे अधिक आयु के वयस्कों के लिए है।",
        confirm: "मैं 18 वर्ष या उससे अधिक आयु का/की हूँ",
        decline: "मैं 18 वर्ष से कम हूँ",
        warning: "18 वर्ष से कम आयु के व्यक्तियों का प्रवेश कानून द्वारा निषिद्ध है।",
    },
};

export default function EntrancePage() {
    const [selectedLang, setSelectedLang] = useState<string | null>(null);
    const [declined, setDeclined] = useState(false);
    const router = useRouter();

    const texts = selectedLang ? entranceTexts[selectedLang] : null;

    function handleConfirm() {
        if (!selectedLang) return;
        document.cookie = `age_verified=true; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        router.push(`/${selectedLang}`);
    }

    function handleDecline() {
        setDeclined(true);
    }

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>TOKYO ROZE</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet" />
            </head>
            <body style={{ margin: 0, padding: 0, background: "#1a0a0e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center", maxWidth: 520, padding: "40px 24px", width: "100%" }}>
                    {/* Logo */}
                    <div style={{ marginBottom: 24 }}>
                        <Image
                            src="/images/logo.png"
                            alt="TOKYO ROZE"
                            width={160}
                            height={160}
                            style={{ width: 160, height: "auto", borderRadius: 12, margin: "0 auto" }}
                            priority
                        />
                    </div>
                    <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.4rem", fontWeight: 700, color: "#F8F4EE", marginBottom: 4, letterSpacing: "0.05em" }}>
                        TOKYO ROZE
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "rgba(248,244,238,0.5)", marginBottom: 8, letterSpacing: "0.15em" }}>
                        トウキョウ ローゼ
                    </p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontStyle: "italic", color: "#C9A96E", marginBottom: 40 }}>
                        Roze is your bespoke Tokyo rendezvous.
                    </p>

                    {declined ? (
                        /* Denied */
                        <div>
                            <p style={{ color: "#e74c3c", fontSize: "0.9rem", marginBottom: 24 }}>
                                {texts?.warning || "Access denied."}
                            </p>
                            <button
                                onClick={() => setDeclined(false)}
                                style={{ background: "transparent", border: "1px solid rgba(248,244,238,0.2)", color: "rgba(248,244,238,0.5)", padding: "10px 32px", borderRadius: 2, cursor: "pointer", fontSize: "0.85rem" }}
                            >
                                ← Back
                            </button>
                        </div>
                    ) : !selectedLang ? (
                        /* Step 1: Language Selection */
                        <div>
                            <p style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A96E", marginBottom: 20 }}>
                                SELECT LANGUAGE
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setSelectedLang(lang.code)}
                                        style={{
                                            background: "rgba(255,255,255,0.05)",
                                            border: "1px solid rgba(201,169,110,0.2)",
                                            borderRadius: 4,
                                            padding: "14px 8px",
                                            color: "#F8F4EE",
                                            fontSize: "0.85rem",
                                            cursor: "pointer",
                                            textAlign: "center",
                                            transition: "all 0.3s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "rgba(201,169,110,0.15)";
                                            e.currentTarget.style.borderColor = "#C9A96E";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                            e.currentTarget.style.borderColor = "rgba(201,169,110,0.2)";
                                        }}
                                    >
                                        {lang.label}
                                        <small style={{ display: "block", fontSize: "0.65rem", color: "rgba(248,244,238,0.4)", marginTop: 2 }}>
                                            {lang.sub}
                                        </small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Age Verification */
                        <div>
                            <p style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A96E", marginBottom: 20 }}>
                                {texts!.title}
                            </p>
                            <p style={{ fontSize: "1rem", color: "#F8F4EE", marginBottom: 8, lineHeight: 1.8 }}>
                                {texts!.subtitle}
                            </p>
                            <p style={{ fontSize: "0.75rem", color: "rgba(248,244,238,0.4)", marginBottom: 32 }}>
                                {texts!.warning}
                            </p>

                            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24 }}>
                                <button
                                    onClick={handleConfirm}
                                    style={{
                                        padding: "14px 48px",
                                        fontSize: "0.95rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.1em",
                                        borderRadius: 2,
                                        cursor: "pointer",
                                        border: "none",
                                        background: "#C9A96E",
                                        color: "#1a0a0e",
                                        transition: "all 0.3s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#DFC494";
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#C9A96E";
                                        e.currentTarget.style.transform = "translateY(0)";
                                    }}
                                >
                                    {texts!.confirm}
                                </button>
                                <button
                                    onClick={handleDecline}
                                    style={{
                                        padding: "14px 48px",
                                        fontSize: "0.95rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.1em",
                                        borderRadius: 2,
                                        cursor: "pointer",
                                        background: "transparent",
                                        border: "1px solid rgba(248,244,238,0.2)",
                                        color: "rgba(248,244,238,0.5)",
                                        transition: "all 0.3s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(248,244,238,0.5)";
                                        e.currentTarget.style.color = "#F8F4EE";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "rgba(248,244,238,0.2)";
                                        e.currentTarget.style.color = "rgba(248,244,238,0.5)";
                                    }}
                                >
                                    {texts!.decline}
                                </button>
                            </div>

                            <button
                                onClick={() => setSelectedLang(null)}
                                style={{ background: "none", border: "none", color: "rgba(248,244,238,0.3)", fontSize: "0.75rem", cursor: "pointer", padding: "8px 16px" }}
                            >
                                ← Change language
                            </button>
                        </div>
                    )}
                </div>
            </body>
        </html>
    );
}
