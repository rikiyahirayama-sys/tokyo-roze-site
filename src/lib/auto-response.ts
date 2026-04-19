import { courses, demoCasts, areas } from "./data";

/**
 * AI Auto-Response Conversation System.
 * Manages a stateful conversation flow to complete bookings automatically.
 * Supports: WhatsApp, WeChat, LINE, Telegram.
 */

export interface ConversationState {
    step: "greeting" | "ask_time" | "ask_area" | "ask_nomination" | "ask_course" | "confirm" | "complete";
    date?: string;
    time?: string;
    area?: string;
    castId?: string;
    courseId?: string;
    customerName?: string;
}

// In-memory state store — replace with Redis/DB in production
const conversations = new Map<string, ConversationState>();

function getState(userId: string): ConversationState {
    return conversations.get(userId) || { step: "greeting" };
}

function setState(userId: string, state: ConversationState) {
    conversations.set(userId, state);
    // Auto-expire after 30 minutes
    setTimeout(() => conversations.delete(userId), 30 * 60 * 1000);
}

function resetState(userId: string) {
    conversations.delete(userId);
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tokyoroze.com";

/**
 * Generate AI auto-reply based on conversation state and incoming message.
 * Handles multi-step booking flow automatically.
 */
export function generateAIReply(
    userId: string,
    incomingMessage: string,
    locale: string = "en"
): string {
    const msg = incomingMessage.toLowerCase().trim();
    const state = getState(userId);

    // Reset command
    if (msg === "reset" || msg === "リセット" || msg === "重置") {
        resetState(userId);
        return getGreeting(locale);
    }

    // Direct keyword shortcuts (override conversation flow)
    if (state.step === "greeting") {
        if (matchesKeyword(msg, ["price", "rate", "cost", "how much", "料金", "価格", "费用", "prix", "precio", "कीमत"])) {
            return getPriceList(locale);
        }
        if (matchesKeyword(msg, ["cast", "lady", "ladies", "girl", "キャスト", "在籍", "佳丽", "dame"])) {
            return getCastList(locale);
        }
        if (matchesKeyword(msg, ["area", "location", "where", "エリア", "場所", "地区", "哪里"])) {
            return getAreaInfo(locale);
        }
        if (matchesKeyword(msg, ["recruit", "work", "job", "求人", "応募", "招聘", "trabajo"])) {
            return getRecruitInfo(locale);
        }
    }

    // Booking conversation flow
    if (matchesKeyword(msg, ["book", "reserve", "予約", "预约", "réserver", "reservar"]) && state.step === "greeting") {
        setState(userId, { step: "ask_time" });
        return getAskTime(locale);
    }

    switch (state.step) {
        case "ask_time": {
            const parsed = parseDateTime(msg);
            if (parsed) {
                setState(userId, { ...state, step: "ask_area", date: parsed.date, time: parsed.time });
                return getAskArea(locale);
            }
            return getAskTimeRetry(locale);
        }

        case "ask_area": {
            const area = parseArea(msg);
            if (area) {
                setState(userId, { ...state, step: "ask_nomination", area });
                return getAskNomination(locale);
            }
            return getAskAreaRetry(locale);
        }

        case "ask_nomination": {
            const { hasNomination, castId } = parseNomination(msg);
            if (hasNomination === false || castId) {
                setState(userId, { ...state, step: "ask_course", castId: castId || undefined });
                return getAskCourse(locale, !!castId);
            }
            return getAskNominationRetry(locale);
        }

        case "ask_course": {
            const courseId = parseCourse(msg);
            if (courseId) {
                const newState: ConversationState = { ...state, step: "confirm", courseId };
                setState(userId, newState);
                return getConfirmation(locale, newState);
            }
            return getAskCourseRetry(locale);
        }

        case "confirm": {
            if (matchesKeyword(msg, ["yes", "ok", "confirm", "はい", "確定", "确认", "oui", "sí"])) {
                setState(userId, { ...state, step: "complete" });
                resetState(userId);
                return getBookingComplete(locale, state);
            }
            if (matchesKeyword(msg, ["no", "cancel", "いいえ", "やめる", "取消", "non"])) {
                resetState(userId);
                return getCancelled(locale);
            }
            return getConfirmRetry(locale);
        }

        default:
            return getGreeting(locale);
    }
}

// --- Helper functions ---

function matchesKeyword(msg: string, keywords: string[]): boolean {
    return keywords.some((kw) => msg.includes(kw));
}

function parseDateTime(msg: string): { date: string; time: string } | null {
    // Match patterns like "tonight 8pm", "3/22 20:00", "今日 20時", etc.
    const timeMatch = msg.match(/(\d{1,2})[:\s]?(\d{2})?\s*(pm|am)?/i);
    const todayKeywords = ["today", "tonight", "今日", "今晚", "今天"];
    const tomorrowKeywords = ["tomorrow", "明日", "明天"];

    const now = new Date();
    let date = now.toISOString().split("T")[0];

    if (tomorrowKeywords.some((k) => msg.includes(k))) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        date = tomorrow.toISOString().split("T")[0];
    }

    // Date pattern like 3/22 or 2026-03-22
    const dateMatch = msg.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
        const month = dateMatch[1].padStart(2, "0");
        const day = dateMatch[2].padStart(2, "0");
        date = `${now.getFullYear()}-${month}-${day}`;
    }

    if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] || "00";
        if (timeMatch[3]?.toLowerCase() === "pm" && hour < 12) hour += 12;
        if (timeMatch[3]?.toLowerCase() === "am" && hour === 12) hour = 0;
        return { date, time: `${hour.toString().padStart(2, "0")}:${minute}` };
    }

    // Japanese time: 20時, 8時
    const jaTimeMatch = msg.match(/(\d{1,2})時/);
    if (jaTimeMatch) {
        const hour = parseInt(jaTimeMatch[1]);
        return { date, time: `${hour.toString().padStart(2, "0")}:00` };
    }

    return null;
}

function parseArea(msg: string): string | null {
    const areaMap: Record<string, string[]> = {
        roppongi: ["roppongi", "六本木"],
        akasaka: ["akasaka", "赤坂"],
        shinjuku: ["shinjuku", "新宿"],
        shibuya: ["shibuya", "渋谷"],
        ginza: ["ginza", "銀座", "银座"],
        ikebukuro: ["ikebukuro", "池袋"],
    };

    for (const [area, keywords] of Object.entries(areaMap)) {
        if (keywords.some((k) => msg.includes(k))) return area;
    }
    return null;
}

function parseNomination(msg: string): { hasNomination: boolean; castId?: string } {
    // Check "no" preference
    if (matchesKeyword(msg, ["no", "any", "おまかせ", "なし", "随便", "whichever"])) {
        return { hasNomination: false };
    }

    // Check for cast name
    for (const cast of demoCasts) {
        if (msg.includes(cast.name.toLowerCase())) {
            return { hasNomination: true, castId: cast.id };
        }
    }

    return { hasNomination: false };
}

function parseCourse(msg: string): string | null {
    if (msg.includes("60")) return "standard-60";
    if (msg.includes("90")) return "standard-90";
    if (msg.includes("120") || msg.includes("premium")) return "premium-120";
    if (msg.includes("180") || msg.includes("vip")) return "vip-180";
    return null;
}

// --- Response templates ---

function getGreeting(locale: string): string {
    const greetings: Record<string, string> = {
        ja: `TOKYO ROZEへようこそ！🌹\n\n以下からお選びください：\n\n📋 「予約」— ご予約の手続き\n💎 「料金」— コース・料金一覧\n👤 「キャスト」— 在籍キャスト一覧\n📍 「エリア」— 出張可能エリア\n\nまたはお気軽にご質問ください！\n24時間自動対応いたします。`,
        en: `Welcome to TOKYO ROZE! 🌹\n\nHow can we help you?\n\n📋 "Book" — Start a reservation\n💎 "Prices" — View courses & rates\n👤 "Cast" — View available ladies\n📍 "Area" — Service areas\n\nFeel free to ask anything!\nOur AI assistant is available 24/7.`,
        zh: `欢迎来到 TOKYO ROZE！🌹\n\n请回复以下选项：\n\n📋「预约」— 开始预约\n💎「价格」— 查看课程与费用\n👤「佳丽」— 查看在籍佳丽\n📍「地区」— 服务区域\n\n随时提问，24小时自动应答！`,
        fr: `Bienvenue chez TOKYO ROZE ! 🌹\n\n📋 "Réserver" — Faire une réservation\n💎 "Prix" — Tarifs et formules\n👤 "Cast" — Nos demoiselles\n📍 "Zone" — Zones de service`,
        es: `¡Bienvenido a TOKYO ROZE! 🌹\n\n📋 "Reservar" — Hacer una reserva\n💎 "Precios" — Tarifas y cursos\n👤 "Cast" — Nuestras damas\n📍 "Área" — Zonas de servicio`,
        hi: `TOKYO ROZE में आपका स्वागत है! 🌹\n\n📋 "Book" — बुकिंग करें\n💎 "Prices" — दरें देखें\n👤 "Cast" — उपलब्ध महिलाएं\n📍 "Area" — सेवा क्षेत्र`,
    };
    return greetings[locale] || greetings.en;
}

function getPriceList(locale: string): string {
    const courseList = courses
        .map((c) => `💎 ${c.name[locale] || c.name.en} (${c.duration}min) — ¥${c.price.toLocaleString()}`)
        .join("\n");

    const msgs: Record<string, string> = {
        ja: `【料金一覧】\n\n${courseList}\n\n※ 指名料: ¥2,000\n※ 交通費: エリアにより ¥0〜¥5,000\n\n予約するには「予約」と返信してください。\n詳細: ${BASE_URL}/ja/system`,
        en: `【Our Rates】\n\n${courseList}\n\n※ Nomination fee: ¥2,000\n※ Transport: ¥0-¥5,000 by area\n\nReply "book" to make a reservation.\nDetails: ${BASE_URL}/en/system`,
        zh: `【价格一览】\n\n${courseList}\n\n※ 指名费: ¥2,000\n※ 交通费: ¥0〜¥5,000\n\n回复「预约」开始预约。\n详情: ${BASE_URL}/zh/system`,
    };
    return msgs[locale] || msgs.en;
}

function getCastList(locale: string): string {
    const available = demoCasts.filter((c) => c.available);
    const castInfo = available.length > 0
        ? available.map((c) => `• ${c.name} (${c.age}歳 / ${c.height}cm)`).join("\n")
        : locale === "ja" ? "現在出勤中のキャストはおりません" : "No ladies currently available";

    const msgs: Record<string, string> = {
        ja: `【本日の出勤キャスト】\n\n${castInfo}\n\n詳細・写真: ${BASE_URL}/ja/cast\n\n予約するには「予約」と返信してください。`,
        en: `【Available Ladies Today】\n\n${castInfo}\n\nPhotos & details: ${BASE_URL}/en/cast\n\nReply "book" to make a reservation.`,
        zh: `【今日出勤佳丽】\n\n${castInfo}\n\n详情: ${BASE_URL}/zh/cast\n\n回复「预约」开始预约。`,
    };
    return msgs[locale] || msgs.en;
}

function getAreaInfo(locale: string): string {
    const areaList = areas.map((a) => `📍 ${a.name[locale] || a.name.en} — ${a.transportMinutes}min / ¥${a.transportFee.toLocaleString()}`).join("\n");

    const msgs: Record<string, string> = {
        ja: `【出張エリア】\n\n${areaList}\n\n※ 六本木・赤坂は交通費無料\n\n詳細: ${BASE_URL}/ja`,
        en: `【Service Areas】\n\n${areaList}\n\n※ Roppongi & Akasaka: free transport\n\nDetails: ${BASE_URL}/en`,
    };
    return msgs[locale] || msgs.en;
}

function getRecruitInfo(locale: string): string {
    const msgs: Record<string, string> = {
        ja: `【求人情報】\n\n✨ バック率70%（業界最高水準）\n✨ 本指名80%バック\n✨ 完全在宅待機、出勤不要\n✨ タクシー代全額支給\n✨ 翌日銀行振込\n✨ 自由出勤\n\n詳細: ${BASE_URL}/ja/recruit\n応募は「応募」と返信してください。`,
        en: `【Work With Us】\n\n✨ 70% commission (industry's highest)\n✨ 80% for nominated bookings\n✨ Work from home, no commute\n✨ Taxi fare fully covered\n✨ Next-day bank transfer\n✨ Flexible schedule\n\nDetails: ${BASE_URL}/en/recruit`,
    };
    return msgs[locale] || msgs.en;
}

function getAskTime(locale: string): string {
    const msgs: Record<string, string> = {
        ja: `ご予約ありがとうございます！🌹\n\n📅 ご希望の日時を教えてください。\n\n例:\n• 「今日 20時」\n• 「明日 21:00」\n• 「3/23 22:00」`,
        en: `Thank you for booking! 🌹\n\n📅 When would you like your appointment?\n\nExamples:\n• "Tonight 8pm"\n• "Tomorrow 9pm"\n• "3/23 10pm"`,
        zh: `感谢预约！🌹\n\n📅 请告诉我您希望的日期和时间。\n\n例如:\n• 「今天 20:00」\n• 「明天 21:00」`,
    };
    return msgs[locale] || msgs.en;
}

function getAskTimeRetry(locale: string): string {
    const msgs: Record<string, string> = {
        ja: `申し訳ありません、時間が認識できませんでした。\n\n「今日 20時」や「3/23 21:00」のように入力してください。`,
        en: `Sorry, I couldn't understand the time.\n\nPlease try: "Tonight 8pm" or "3/23 9pm"`,
    };
    return msgs[locale] || msgs.en;
}

function getAskArea(locale: string): string {
    const msgs: Record<string, string> = {
        ja: `📍 出張先のエリアを教えてください。\n\n• 六本木（交通費無料）\n• 赤坂（交通費無料）\n• 新宿（+¥2,000）\n• 渋谷（+¥1,000）\n• 銀座（+¥1,000）\n• 池袋（+¥3,000）`,
        en: `📍 Which area will you be in?\n\n• Roppongi (free transport)\n• Akasaka (free transport)\n• Shinjuku (+¥2,000)\n• Shibuya (+¥1,000)\n• Ginza (+¥1,000)\n• Ikebukuro (+¥3,000)`,
        zh: `📍 请问您在哪个区域？\n\n• 六本木（免交通费）\n• 赤坂（免交通费）\n• 新宿（+¥2,000）\n• 涩谷（+¥1,000）\n• 银座（+¥1,000）`,
    };
    return msgs[locale] || msgs.en;
}

function getAskAreaRetry(locale: string): string {
    const msgs: Record<string, string> = {
        ja: `エリアを認識できませんでした。「六本木」「新宿」などエリア名を入力してください。`,
        en: `Sorry, I couldn't identify the area. Please reply with an area name like "Roppongi" or "Shinjuku".`,
    };
    return msgs[locale] || msgs.en;
}

function getAskNomination(locale: string): string {
    const available = demoCasts.filter((c) => c.available);
    const castNames = available.map((c) => `• ${c.name}`).join("\n");

    const msgs: Record<string, string> = {
        ja: `👤 ご指名はございますか？\n\n【本日出勤中】\n${castNames}\n\nキャスト名を入力するか、「おまかせ」と返信してください。\n\n写真・詳細: ${BASE_URL}/ja/cast`,
        en: `👤 Do you have a preference for a lady?\n\n【Available Today】\n${castNames}\n\nReply with a name, or "any" for no preference.\n\nPhotos: ${BASE_URL}/en/cast`,
        zh: `👤 您有指名的佳丽吗？\n\n【今日出勤】\n${castNames}\n\n输入名字或回复「随便」。`,
    };
    return msgs[locale] || msgs.en;
}

function getAskNominationRetry(locale: string): string {
    const msgs: Record<string, string> = {
        ja: `キャスト名を入力するか、「おまかせ」と返信してください。`,
        en: `Please reply with a lady's name or "any" for no preference.`,
    };
    return msgs[locale] || msgs.en;
}

function getAskCourse(locale: string, hasNomination: boolean): string {
    const courseList = courses
        .map((c) => `${c.duration}分 — ¥${c.price.toLocaleString()}`)
        .join("\n");

    const nominationNote = hasNomination
        ? (locale === "ja" ? "\n※ 指名料 ¥2,000が加算されます" : "\n※ Nomination fee: +¥2,000")
        : "";

    const msgs: Record<string, string> = {
        ja: `💎 コースをお選びください。\n\n${courseList}${nominationNote}\n\n時間（60, 90, 120, 180）を入力してください。`,
        en: `💎 Please choose your course.\n\n${courseList}${nominationNote}\n\nReply with the duration (60, 90, 120, or 180).`,
        zh: `💎 请选择课程。\n\n${courseList}${nominationNote}\n\n回复时间（60, 90, 120, 180）。`,
    };
    return msgs[locale] || msgs.en;
}

function getAskCourseRetry(locale: string): string {
    const msgs: Record<string, string> = {
        ja: `コースを認識できませんでした。60, 90, 120, 180 のいずれかを入力してください。`,
        en: `Sorry, please reply with 60, 90, 120, or 180 to select a course.`,
    };
    return msgs[locale] || msgs.en;
}

function getConfirmation(locale: string, state: ConversationState): string {
    const course = courses.find((c) => c.id === state.courseId);
    const cast = state.castId ? demoCasts.find((c) => c.id === state.castId) : null;
    const area = areas.find((a) => a.id === state.area);

    const total = (course?.price || 0) + (cast ? 2000 : 0) + (area?.transportFee || 0);

    const msgs: Record<string, string> = {
        ja: `📋 ご予約内容の確認\n\n📅 日時: ${state.date} ${state.time}\n📍 エリア: ${area?.name.ja || state.area}\n👤 キャスト: ${cast?.name || "おまかせ"}\n💎 コース: ${course?.name.ja || ""} (${course?.duration}分)\n\n💰 合計: ¥${total.toLocaleString()}\n　コース料金: ¥${course?.price.toLocaleString()}\n　${cast ? `指名料: ¥2,000\n　` : ""}交通費: ¥${(area?.transportFee || 0).toLocaleString()}\n\n「はい」で確定、「いいえ」でキャンセル`,
        en: `📋 Booking Summary\n\n📅 Date/Time: ${state.date} ${state.time}\n📍 Area: ${area?.name.en || state.area}\n👤 Lady: ${cast?.name || "No preference"}\n💎 Course: ${course?.name.en || ""} (${course?.duration}min)\n\n💰 Total: ¥${total.toLocaleString()}\n  Course: ¥${course?.price.toLocaleString()}\n  ${cast ? `Nomination: ¥2,000\n  ` : ""}Transport: ¥${(area?.transportFee || 0).toLocaleString()}\n\nReply "yes" to confirm or "no" to cancel.`,
        zh: `📋 预约确认\n\n📅 时间: ${state.date} ${state.time}\n📍 区域: ${area?.name.zh || state.area}\n👤 佳丽: ${cast?.name || "随机"}\n💎 课程: ${course?.name.zh || ""} (${course?.duration}分)\n\n💰 合计: ¥${total.toLocaleString()}\n\n回复「确认」确定或「取消」取消。`,
    };
    return msgs[locale] || msgs.en;
}

function getBookingComplete(locale: string, state: ConversationState): string {
    const bookingUrl = `${BASE_URL}/${locale}/booking?course=${state.courseId}${state.castId ? `&cast=${state.castId}` : ""}`;

    const msgs: Record<string, string> = {
        ja: `✅ ありがとうございます！\n\nお支払い手続きを以下のリンクからお願いいたします：\n${bookingUrl}\n\nまたは、ご到着後に現地でのお支払いも可能です。\n\n素敵なお時間をお過ごしください 🌹`,
        en: `✅ Thank you!\n\nPlease complete payment here:\n${bookingUrl}\n\nOr pay on arrival.\n\nWe look forward to seeing you! 🌹`,
        zh: `✅ 谢谢您！\n\n请通过以下链接完成支付：\n${bookingUrl}\n\n也可以到达后支付。\n\n期待您的到来！🌹`,
    };
    return msgs[locale] || msgs.en;
}

function getCancelled(locale: string): string {
    const msgs: Record<string, string> = {
        ja: `予約をキャンセルしました。\nまたのご利用をお待ちしております。\n\n新しい予約は「予約」と返信してください。`,
        en: `Reservation cancelled.\nFeel free to try again anytime.\n\nReply "book" to start a new reservation.`,
    };
    return msgs[locale] || msgs.en;
}

function getConfirmRetry(locale: string): string {
    const msgs: Record<string, string> = {
        ja: `「はい」で確定、「いいえ」でキャンセルしてください。`,
        en: `Please reply "yes" to confirm or "no" to cancel.`,
    };
    return msgs[locale] || msgs.en;
}

/**
 * Detect locale from message content.
 */
export function detectLocale(text: string): string {
    if (/[\u4e00-\u9fff]/.test(text)) return "zh";
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
    if (/[\u0900-\u097f]/.test(text)) return "hi";
    if (/[àâçéèêëîïôùûüÿœæ]/i.test(text)) return "fr";
    if (/[ñ¿¡áéíóú]/i.test(text)) return "es";
    return "en";
}
