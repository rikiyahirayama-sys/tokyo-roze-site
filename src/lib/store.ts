import fs from "fs";
import path from "path";
import type { Cast, Course, Area, Booking } from "@/types";

export interface SiteSettings {
    // 店舗基本情報
    storeName: string;
    storeSubtitle: string;
    openTime: string;
    closeTime: string;
    phone: string;
    email: string;
    address: string;
    siteUrl: string;
    // SEO
    metaTitle: string;
    metaDescription: string;
    // 料金設定
    nominationFee: number;
    extensionRate30min: number;
    cancelFee: number;
    transportFeeDefault: number;
    hotelDiscountNote: string;
    paymentMethods: string[];
    // 報酬設定
    freeBackRate: number;
    nominationBackRate: number;
    paymentTiming: string;
    // 通知設定
    ownerPhone: string;
    notificationEmail: string;
    // 営業ポリシー
    minAge: number;
    reservationNote: string;
    cancellationPolicy: string;
}

export interface SNSConfig {
    whatsapp: { enabled: boolean; accountId: string };
    wechat: { enabled: boolean; accountId: string };
    line: { enabled: boolean; accountId: string };
    telegram: { enabled: boolean; accountId: string };
}

export interface SiteData {
    settings: SiteSettings;
    sns: SNSConfig;
    casts: Cast[];
    courses: Course[];
    areas: Area[];
    bookings: Booking[];
}

const DATA_FILE = path.join(process.cwd(), "data", "site-data.json");

const defaultData: SiteData = {
    settings: {
        storeName: "TOKYO ROZE",
        storeSubtitle: "Tokyo Premium Escort",
        openTime: "17:00",
        closeTime: "05:00",
        phone: "+81-XX-XXXX-XXXX",
        email: "",
        address: "東京都港区六本木",
        siteUrl: "https://tokyoroze.com",
        metaTitle: "TOKYO ROZE — Tokyo Premium Escort",
        metaDescription: "Premium escort service in Tokyo. International guests welcome.",
        nominationFee: 2000,
        extensionRate30min: 10000,
        cancelFee: 0,
        transportFeeDefault: 0,
        hotelDiscountNote: "六本木・赤坂エリアは交通費無料",
        paymentMethods: ["cash", "credit"],
        freeBackRate: 70,
        nominationBackRate: 80,
        paymentTiming: "翌日払い",
        ownerPhone: "",
        notificationEmail: "",
        minAge: 18,
        reservationNote: "ご予約は営業時間内にお願いいたします",
        cancellationPolicy: "当日キャンセルはキャンセル料が発生する場合があります",
    },
    sns: {
        whatsapp: { enabled: true, accountId: "" },
        wechat: { enabled: true, accountId: "tokyoroze" },
        line: { enabled: true, accountId: "" },
        telegram: { enabled: true, accountId: "" },
    },
    casts: [
        {
            id: "cast-001",
            name: "Yui",
            age: 23,
            height: 162,
            bust: 86,
            cup: "D",
            waist: 57,
            hip: 85,
            images: ["/images/cast/placeholder.jpg"],
            profile: {
                en: "Elegant and charming with a warm personality.",
                ja: "エレガントで魅力的、温かい人柄のYui。",
                zh: "优雅迷人，性格温暖。",
                fr: "Élégante et charmante avec une personnalité chaleureuse.",
                es: "Elegante y encantadora con una personalidad cálida.",
                hi: "गर्म व्यक्तित्व के साथ सुरुचिपूर्ण और आकर्षक।",
            },
            castComment: { ja: "お会いできるのを楽しみにしています♡", en: "I look forward to meeting you♡" },
            storeComment: { ja: "当店イチオシのキャストです。エレガントな雰囲気と温かい人柄でリピーター多数。", en: "Our top recommendation. Elegant atmosphere and warm personality with many repeat clients." },
            tags: ["High Class", "GFE"],
            nationality: "Japanese",
            languages: ["Japanese", "English"],
            smoking: false,
            tattoo: false,
            isNew: false,
            isRecommended: true,
            available: true,
            availableFrom: "18:00",
            availableUntil: "02:00",
        },
        {
            id: "cast-002",
            name: "Hana",
            age: 25,
            height: 168,
            bust: 88,
            cup: "E",
            waist: 58,
            hip: 87,
            images: ["/images/cast/placeholder.jpg"],
            profile: {
                en: "Tall and stunning, Hana brings elegance and sophistication.",
                ja: "長身で美しいHanaはエレガンスと洗練さを兼ね備えています。",
                zh: "身材高挑迷人，Hana带来优雅与精致。",
                fr: "Grande et époustouflante, Hana apporte élégance et raffinement.",
                es: "Alta e impresionante, Hana aporta elegancia y sofisticación.",
                hi: "लंबी और आकर्षक, Hana सुंदरता और परिष्कार लाती हैं।",
            },
            castComment: { ja: "元モデルの経験を活かしておもてなしします♡", en: "I'll use my modeling experience to make your time special♡" },
            storeComment: { ja: "元モデルの長身美女。抜群のスタイルと流暢な英語力が魅力です。", en: "Former model with stunning figure and fluent English." },
            tags: ["High Class", "Slim"],
            nationality: "Japanese",
            languages: ["Japanese", "English"],
            smoking: false,
            tattoo: false,
            isNew: true,
            isRecommended: false,
            available: true,
            availableFrom: "19:00",
            availableUntil: "03:00",
        },
        {
            id: "cast-003",
            name: "Mei",
            age: 22,
            height: 158,
            bust: 84,
            cup: "C",
            waist: 56,
            hip: 83,
            images: ["/images/cast/placeholder.jpg"],
            profile: {
                en: "Sweet and playful, Mei has an infectious smile.",
                ja: "甘くて茶目っ気なMeiは、人を惹きつける笑顔の持ち主。",
                zh: "甜美俏皮，Mei有着感染力十足的笑容。",
                fr: "Douce et espiègle, Mei a un sourire contagieux.",
                es: "Dulce y juguetona, Mei tiene una sonrisa contagiosa.",
                hi: "मीठी और चंचल, Mei की एक संक्रामक मुस्कान है।",
            },
            castComment: { ja: "英語も中国語もOKです！気軽にお話しましょう♡", en: "I speak English and Chinese! Let's chat♡" },
            storeComment: { ja: "3カ国語対応可能なインターナショナルキャスト。笑顔が魅力的です。", en: "Trilingual international cast member with a charming smile." },
            tags: ["GFE", "Threesome"],
            nationality: "Japanese",
            languages: ["Japanese", "English", "Chinese"],
            smoking: false,
            tattoo: false,
            isNew: false,
            isRecommended: true,
            available: false,
        },
    ],
    courses: [
        {
            id: "standard-60",
            name: { en: "Standard 60", zh: "标准 60", ja: "スタンダード 60", fr: "Standard 60", es: "Estándar 60", hi: "स्टैंडर्ड 60" },
            duration: 60,
            price: 30000,
            description: { en: "Our standard 60-minute course", zh: "标准60分钟方案", ja: "スタンダードの60分コース", fr: "Notre formule standard de 60 minutes", es: "Nuestro curso estándar de 60 minutos", hi: "हमारा मानक 60 मिनट का कोर्स" },
        },
        {
            id: "standard-90",
            name: { en: "Standard 90", zh: "标准 90", ja: "スタンダード 90", fr: "Standard 90", es: "Estándar 90", hi: "स्टैंडर्ड 90" },
            duration: 90,
            price: 42000,
            description: { en: "Extended 90-minute experience", zh: "延长90分钟体验", ja: "ロングの90分コース", fr: "Expérience prolongée de 90 minutes", es: "Experiencia extendida de 90 minutos", hi: "विस्तारित 90 मिनट का अनुभव" },
        },
        {
            id: "premium-120",
            name: { en: "Premium 120", zh: "尊享 120", ja: "プレミアム 120", fr: "Premium 120", es: "Premium 120", hi: "प्रीमियम 120" },
            duration: 120,
            price: 55000,
            description: { en: "Premium 2-hour experience", zh: "尊享2小时体验", ja: "プレミアムの120分コース", fr: "Expérience premium de 2 heures", es: "Experiencia premium de 2 horas", hi: "प्रीमियम 2 घंटे का अनुभव" },
        },
        {
            id: "vip-180",
            name: { en: "VIP 180", zh: "VIP 180", ja: "VIP 180", fr: "VIP 180", es: "VIP 180", hi: "VIP 180" },
            duration: 180,
            price: 80000,
            description: { en: "VIP 3-hour experience", zh: "VIP 3小时极致体验", ja: "VIPの180分コース", fr: "Expérience VIP de 3 heures", es: "Experiencia VIP de 3 horas", hi: "VIP 3 घंटे का अनुभव" },
        },
    ],
    areas: [
        { id: "roppongi", slug: "roppongi", name: { en: "Roppongi", ja: "六本木", zh: "六本木", fr: "Roppongi", es: "Roppongi", hi: "रोप्पोंगी" }, description: { en: "Premier entertainment district", ja: "六本木ヒルズ、東京ミッドタウン、多数の高級ホテル", zh: "六本木Hills", fr: "Roppongi Hills", es: "Roppongi Hills", hi: "रोप्पोंगी हिल्स" }, transportMinutes: 15, transportFee: 0 },
        { id: "akasaka", slug: "akasaka", name: { en: "Akasaka", ja: "赤坂", zh: "赤坂", fr: "Akasaka", es: "Akasaka", hi: "अकासाका" }, description: { en: "Luxury hotel district", ja: "高級ホテルエリア", zh: "高级酒店区", fr: "Quartier hôtelier", es: "Zona hotelera", hi: "लक्जरी होटल" }, transportMinutes: 20, transportFee: 0 },
        { id: "shinjuku", slug: "shinjuku", name: { en: "Shinjuku", ja: "新宿", zh: "新宿", fr: "Shinjuku", es: "Shinjuku", hi: "शिंजुकु" }, description: { en: "Business and entertainment hub", ja: "ビジネスとエンターテインメントの中心", zh: "商业娱乐中心", fr: "Centre d'affaires", es: "Centro de negocios", hi: "व्यापार केंद्र" }, transportMinutes: 25, transportFee: 2000 },
        { id: "shibuya", slug: "shibuya", name: { en: "Shibuya", ja: "渋谷", zh: "涩谷", fr: "Shibuya", es: "Shibuya", hi: "शिबुया" }, description: { en: "Iconic Tokyo district", ja: "東京の象徴的なエリア", zh: "东京标志性地区", fr: "Quartier emblématique", es: "Distrito icónico", hi: "प्रतिष्ठित जिला" }, transportMinutes: 20, transportFee: 1000 },
        { id: "ginza", slug: "ginza", name: { en: "Ginza", ja: "銀座", zh: "银座", fr: "Ginza", es: "Ginza", hi: "गिन्ज़ा" }, description: { en: "Prestigious shopping district", ja: "東京最高峰のショッピングエリア", zh: "最负盛名的购物区", fr: "Quartier commerçant", es: "Distrito comercial", hi: "प्रतिष्ठित शॉपिंग" }, transportMinutes: 25, transportFee: 2000 },
    ],
    bookings: [],
};

function ensureDataDir() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export function readSiteData(): SiteData {
    try {
        ensureDataDir();
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, "utf-8");
            return { ...defaultData, ...JSON.parse(raw) };
        }
    } catch {
        // Fall through to default
    }
    return { ...defaultData };
}

export function writeSiteData(data: SiteData): void {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function updateSiteData(partial: Partial<SiteData>): SiteData {
    const current = readSiteData();
    const updated = { ...current, ...partial };
    writeSiteData(updated);
    return updated;
}
