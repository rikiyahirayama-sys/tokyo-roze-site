// ============================================
// AI Auto-Response Conversation System (Express版)
// WhatsApp, LINE, Telegram, WeChat 対応
// ============================================

const fs = require('fs');
const path = require('path');

// site-data.json からデータを読み込む
function loadSiteData() {
    try {
        const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'site-data.json'), 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return { casts: [], courses: [], areas: [] };
    }
}

// コース・エリア・キャストのデフォルト
const defaultCourses = [
    { id: 'standard-60', name: { en: 'Standard 60', ja: 'スタンダード 60', zh: '标准 60' }, duration: 60, price: 30000 },
    { id: 'standard-90', name: { en: 'Standard 90', ja: 'スタンダード 90', zh: '标准 90' }, duration: 90, price: 42000 },
    { id: 'premium-120', name: { en: 'Premium 120', ja: 'プレミアム 120', zh: '尊享 120' }, duration: 120, price: 55000 },
    { id: 'vip-180', name: { en: 'VIP 180', ja: 'VIP 180', zh: 'VIP 180' }, duration: 180, price: 80000 },
];

const defaultAreas = [
    { id: 'roppongi', name: { en: 'Roppongi', ja: '六本木', zh: '六本木' }, transportMinutes: 15, transportFee: 0 },
    { id: 'akasaka', name: { en: 'Akasaka', ja: '赤坂', zh: '赤坂' }, transportMinutes: 20, transportFee: 0 },
    { id: 'shinjuku', name: { en: 'Shinjuku', ja: '新宿', zh: '新宿' }, transportMinutes: 25, transportFee: 2000 },
    { id: 'shibuya', name: { en: 'Shibuya', ja: '渋谷', zh: '涩谷' }, transportMinutes: 20, transportFee: 1000 },
    { id: 'ginza', name: { en: 'Ginza', ja: '銀座', zh: '银座' }, transportMinutes: 25, transportFee: 2000 },
    { id: 'ikebukuro', name: { en: 'Ikebukuro', ja: '池袋', zh: '池袋' }, transportMinutes: 30, transportFee: 3000 },
];

function getCourses() {
    const data = loadSiteData();
    return data.courses?.length ? data.courses : defaultCourses;
}

function getAreas() {
    const data = loadSiteData();
    return data.areas?.length ? data.areas : defaultAreas;
}

function getCasts() {
    const data = loadSiteData();
    return data.casts || [];
}

// --- インメモリ会話ストレージ ---
const conversations = new Map();

function getState(userId) {
    return conversations.get(userId) || { step: 'greeting' };
}

function setState(userId, state) {
    conversations.set(userId, state);
    setTimeout(() => conversations.delete(userId), 30 * 60 * 1000); // 30分タイムアウト
}

function resetState(userId) {
    conversations.delete(userId);
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://tokyoroze.com';

// --- 言語自動判定 ---
function detectLocale(text) {
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u0900-\u097f]/.test(text)) return 'hi';
    if (/[àâçéèêëïîôùûüÿœæ]/i.test(text)) return 'fr';
    if (/[áéíóúñ¿¡]/i.test(text)) return 'es';
    return 'en';
}

// --- メイン回答生成 ---
function generateAIReply(userId, incomingMessage, locale) {
    const msg = incomingMessage.toLowerCase().trim();
    const state = getState(userId);
    locale = locale || 'en';

    // リセット
    if (msg === 'reset' || msg === 'リセット' || msg === '重置') {
        resetState(userId);
        return getGreeting(locale);
    }

    // キーワードショートカット
    if (state.step === 'greeting') {
        if (matchKw(msg, ['price', 'rate', 'cost', 'how much', '料金', '価格', '费用', 'prix', 'precio'])) {
            return getPriceList(locale);
        }
        if (matchKw(msg, ['cast', 'lady', 'ladies', 'girl', 'キャスト', '在籍', '佳丽', 'dame'])) {
            return getCastList(locale);
        }
        if (matchKw(msg, ['area', 'location', 'where', 'エリア', '場所', '地区', '哪里'])) {
            return getAreaInfo(locale);
        }
        if (matchKw(msg, ['recruit', 'work', 'job', '求人', '応募', '招聘', 'trabajo'])) {
            return getRecruitInfo(locale);
        }
    }

    // 予約開始
    if (matchKw(msg, ['book', 'reserve', '予約', '预约', 'réserver', 'reservar']) && state.step === 'greeting') {
        setState(userId, { step: 'ask_time' });
        return getAskTime(locale);
    }

    switch (state.step) {
        case 'ask_time': {
            const parsed = parseDateTime(msg);
            if (parsed) {
                setState(userId, { ...state, step: 'ask_area', date: parsed.date, time: parsed.time });
                return getAskArea(locale);
            }
            return getAskTimeRetry(locale);
        }
        case 'ask_area': {
            const area = parseArea(msg);
            if (area) {
                setState(userId, { ...state, step: 'ask_nomination', area });
                return getAskNomination(locale);
            }
            return getAskAreaRetry(locale);
        }
        case 'ask_nomination': {
            const { hasNomination, castId } = parseNomination(msg);
            if (hasNomination === false || castId) {
                setState(userId, { ...state, step: 'ask_course', castId: castId || undefined });
                return getAskCourse(locale, !!castId);
            }
            return getAskNominationRetry(locale);
        }
        case 'ask_course': {
            const courseId = parseCourse(msg);
            if (courseId) {
                const newState = { ...state, step: 'confirm', courseId };
                setState(userId, newState);
                return getConfirmation(locale, newState);
            }
            return getAskCourseRetry(locale);
        }
        case 'confirm': {
            if (matchKw(msg, ['yes', 'ok', 'confirm', 'はい', '確定', '确认', 'oui', 'sí'])) {
                const completedState = { ...state };
                resetState(userId);
                return getBookingComplete(locale, completedState);
            }
            if (matchKw(msg, ['no', 'cancel', 'いいえ', 'やめる', '取消', 'non'])) {
                resetState(userId);
                return getCancelled(locale);
            }
            return getConfirmRetry(locale);
        }
        default:
            return getGreeting(locale);
    }
}

// --- ヘルパー ---
function matchKw(msg, keywords) {
    return keywords.some(kw => msg.includes(kw));
}

function parseDateTime(msg) {
    const timeMatch = msg.match(/(\d{1,2})[:\s]?(\d{2})?\s*(pm|am)?/i);
    const todayKw = ['today', 'tonight', '今日', '今晚', '今天'];
    const tomorrowKw = ['tomorrow', '明日', '明天'];
    const now = new Date();
    let date = now.toISOString().split('T')[0];

    if (tomorrowKw.some(k => msg.includes(k))) {
        const tmr = new Date(now);
        tmr.setDate(tmr.getDate() + 1);
        date = tmr.toISOString().split('T')[0];
    }
    const dateMatch = msg.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
        date = `${now.getFullYear()}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
    }
    if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] || '00';
        if (timeMatch[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
        if (timeMatch[3]?.toLowerCase() === 'am' && hour === 12) hour = 0;
        return { date, time: `${hour.toString().padStart(2, '0')}:${minute}` };
    }
    const jaMatch = msg.match(/(\d{1,2})時/);
    if (jaMatch) {
        return { date, time: `${parseInt(jaMatch[1]).toString().padStart(2, '0')}:00` };
    }
    return null;
}

function parseArea(msg) {
    const map = {
        roppongi: ['roppongi', '六本木'],
        akasaka: ['akasaka', '赤坂'],
        shinjuku: ['shinjuku', '新宿'],
        shibuya: ['shibuya', '渋谷'],
        ginza: ['ginza', '銀座', '银座'],
        ikebukuro: ['ikebukuro', '池袋'],
    };
    for (const [area, keywords] of Object.entries(map)) {
        if (keywords.some(k => msg.includes(k))) return area;
    }
    return null;
}

function parseNomination(msg) {
    if (matchKw(msg, ['no', 'any', 'おまかせ', 'なし', '随便', 'whichever'])) {
        return { hasNomination: false };
    }
    const casts = getCasts();
    for (const cast of casts) {
        if (cast.name && msg.includes(cast.name.toLowerCase())) {
            return { hasNomination: true, castId: cast.id };
        }
    }
    return { hasNomination: false };
}

function parseCourse(msg) {
    if (msg.includes('60')) return 'standard-60';
    if (msg.includes('90')) return 'standard-90';
    if (msg.includes('120') || msg.includes('premium')) return 'premium-120';
    if (msg.includes('180') || msg.includes('vip')) return 'vip-180';
    return null;
}

// --- 回答テンプレート ---
function getGreeting(locale) {
    const m = {
        ja: `TOKYO RENDAIREへようこそ！🌹\n\n以下からお選びください：\n\n📋 「予約」— ご予約の手続き\n💎 「料金」— コース・料金一覧\n👤 「キャスト」— 在籍キャスト一覧\n📍 「エリア」— 出張可能エリア\n\nまたはお気軽にご質問ください！\n24時間自動対応いたします。`,
        en: `Welcome to TOKYO RENDAIRE! 🌹\n\nHow can we help you?\n\n📋 "Book" — Start a reservation\n💎 "Prices" — View courses & rates\n👤 "Cast" — View available ladies\n📍 "Area" — Service areas\n\nFeel free to ask anything!\nOur AI assistant is available 24/7.`,
        zh: `欢迎来到 TOKYO RENDAIRE！🌹\n\n请回复以下选项：\n\n📋「预约」— 开始预约\n💎「价格」— 查看课程与费用\n👤「佳丽」— 查看在籍佳丽\n📍「地区」— 服务区域\n\n随时提问，24小时自动应答！`,
    };
    return m[locale] || m.en;
}

function getPriceList(locale) {
    const courses = getCourses();
    const list = courses.map(c => `💎 ${(c.name && c.name[locale]) || (c.name && c.name.en) || c.id} (${c.duration}分) — ¥${c.price.toLocaleString()}`).join('\n');
    const m = {
        ja: `【料金一覧】\n\n${list}\n\n※ 指名料: ¥2,000\n※ 交通費: エリアにより ¥0〜¥5,000\n\n予約するには「予約」と返信してください。`,
        en: `【Our Rates】\n\n${list}\n\n※ Nomination fee: ¥2,000\n※ Transport: ¥0-¥5,000 by area\n\nReply "book" to make a reservation.`,
        zh: `【价格一览】\n\n${list}\n\n※ 指名费: ¥2,000\n※ 交通费: ¥0〜¥5,000\n\n回复「预约」开始预约。`,
    };
    return m[locale] || m.en;
}

function getCastList(locale) {
    const casts = getCasts();
    const available = casts.filter(c => c.available !== false);
    const info = available.length > 0
        ? available.map(c => `• ${c.name} (${c.age || '?'}歳 / ${c.height || '?'}cm)`).join('\n')
        : (locale === 'ja' ? '現在出勤中のキャストはおりません' : 'No ladies currently available');
    const m = {
        ja: `【本日の出勤キャスト】\n\n${info}\n\n詳細・写真: ${BASE_URL}/ja/cast\n\n予約するには「予約」と返信してください。`,
        en: `【Available Ladies Today】\n\n${info}\n\nPhotos & details: ${BASE_URL}/en/cast\n\nReply "book" to make a reservation.`,
        zh: `【今日出勤佳丽】\n\n${info}\n\n详情: ${BASE_URL}/zh/cast\n\n回复「预约」开始预约。`,
    };
    return m[locale] || m.en;
}

function getAreaInfo(locale) {
    const areas = getAreas();
    const list = areas.map(a => `📍 ${(a.name && a.name[locale]) || (a.name && a.name.en) || a.id} — ${a.transportMinutes || '?'}min / ¥${(a.transportFee || 0).toLocaleString()}`).join('\n');
    const m = {
        ja: `【出張エリア】\n\n${list}\n\n※ 六本木・赤坂は交通費無料`,
        en: `【Service Areas】\n\n${list}\n\n※ Roppongi & Akasaka: free transport`,
    };
    return m[locale] || m.en;
}

function getRecruitInfo(locale) {
    const m = {
        ja: `【求人情報】\n\n✨ バック率70%（業界最高水準）\n✨ 本指名80%バック\n✨ 完全在宅待機\n✨ タクシー代全額支給\n✨ 翌日銀行振込\n✨ 自由出勤\n\n詳細: ${BASE_URL}/ja/recruit`,
        en: `【Work With Us】\n\n✨ 70% commission (industry's highest)\n✨ 80% for nominated bookings\n✨ Work from home\n✨ Taxi fare fully covered\n✨ Next-day bank transfer\n✨ Flexible schedule\n\nDetails: ${BASE_URL}/en/recruit`,
    };
    return m[locale] || m.en;
}

function getAskTime(locale) {
    const m = {
        ja: `ご予約ありがとうございます！🌹\n\n📅 ご希望の日時を教えてください。\n\n例:\n• 「今日 20時」\n• 「明日 21:00」\n• 「3/23 22:00」`,
        en: `Thank you for booking! 🌹\n\n📅 When would you like your appointment?\n\nExamples:\n• "Tonight 8pm"\n• "Tomorrow 9pm"\n• "3/23 10pm"`,
        zh: `感谢预约！🌹\n\n📅 请告诉我您希望的日期和时间。`,
    };
    return m[locale] || m.en;
}

function getAskTimeRetry(locale) {
    const m = {
        ja: `申し訳ありません、時間が認識できませんでした。\n\n「今日 20時」や「3/23 21:00」のように入力してください。`,
        en: `Sorry, I couldn't understand the time.\n\nPlease try: "Tonight 8pm" or "3/23 9pm"`,
    };
    return m[locale] || m.en;
}

function getAskArea(locale) {
    const m = {
        ja: `📍 出張先のエリアを教えてください。\n\n• 六本木（交通費無料）\n• 赤坂（交通費無料）\n• 新宿（+¥2,000）\n• 渋谷（+¥1,000）\n• 銀座（+¥1,000）\n• 池袋（+¥3,000）`,
        en: `📍 Which area will you be in?\n\n• Roppongi (free transport)\n• Akasaka (free transport)\n• Shinjuku (+¥2,000)\n• Shibuya (+¥1,000)\n• Ginza (+¥1,000)\n• Ikebukuro (+¥3,000)`,
        zh: `📍 请问您在哪个区域？\n\n• 六本木（免交通费）\n• 赤坂（免交通费）\n• 新宿（+¥2,000）\n• 涩谷（+¥1,000）\n• 银座（+¥1,000）`,
    };
    return m[locale] || m.en;
}

function getAskAreaRetry(locale) {
    const m = {
        ja: `エリアを認識できませんでした。「六本木」「新宿」などエリア名を入力してください。`,
        en: `Sorry, I couldn't identify the area. Please reply with an area name like "Roppongi" or "Shinjuku".`,
    };
    return m[locale] || m.en;
}

function getAskNomination(locale) {
    const casts = getCasts();
    const available = casts.filter(c => c.available !== false);
    const names = available.map(c => `• ${c.name}`).join('\n');
    const m = {
        ja: `👤 ご指名はございますか？\n\n【本日出勤中】\n${names}\n\nキャスト名を入力するか、「おまかせ」と返信してください。\n\n写真・詳細: ${BASE_URL}/ja/cast`,
        en: `👤 Do you have a preference for a lady?\n\n【Available Today】\n${names}\n\nReply with a name, or "any" for no preference.\n\nPhotos: ${BASE_URL}/en/cast`,
        zh: `👤 您有指名的佳丽吗？\n\n【今日出勤】\n${names}\n\n输入名字或回复「随便」。`,
    };
    return m[locale] || m.en;
}

function getAskNominationRetry(locale) {
    const m = {
        ja: `キャスト名を入力するか、「おまかせ」と返信してください。`,
        en: `Please reply with a lady's name or "any" for no preference.`,
    };
    return m[locale] || m.en;
}

function getAskCourse(locale, hasNomination) {
    const courses = getCourses();
    const list = courses.map(c => `${c.duration}分 — ¥${c.price.toLocaleString()}`).join('\n');
    const note = hasNomination ? (locale === 'ja' ? '\n※ 指名料 ¥2,000が加算されます' : '\n※ Nomination fee: +¥2,000') : '';
    const m = {
        ja: `💎 コースをお選びください。\n\n${list}${note}\n\n時間（60, 90, 120, 180）を入力してください。`,
        en: `💎 Please choose your course.\n\n${list}${note}\n\nReply with the duration (60, 90, 120, or 180).`,
        zh: `💎 请选择课程。\n\n${list}${note}\n\n回复时间（60, 90, 120, 180）。`,
    };
    return m[locale] || m.en;
}

function getAskCourseRetry(locale) {
    const m = {
        ja: `コースを認識できませんでした。60, 90, 120, 180 のいずれかを入力してください。`,
        en: `Sorry, please reply with 60, 90, 120, or 180 to select a course.`,
    };
    return m[locale] || m.en;
}

function getConfirmation(locale, state) {
    const courses = getCourses();
    const areas = getAreas();
    const casts = getCasts();
    const course = courses.find(c => c.id === state.courseId);
    const cast = state.castId ? casts.find(c => c.id === state.castId) : null;
    const area = areas.find(a => a.id === state.area);
    const total = (course?.price || 0) + (cast ? 2000 : 0) + (area?.transportFee || 0);

    const m = {
        ja: `📋 ご予約内容の確認\n\n📅 日時: ${state.date} ${state.time}\n📍 エリア: ${area?.name?.ja || state.area}\n👤 キャスト: ${cast?.name || 'おまかせ'}\n💎 コース: ${course?.name?.ja || ''} (${course?.duration}分)\n\n💰 合計: ¥${total.toLocaleString()}\n\n「はい」で確定、「いいえ」でキャンセル`,
        en: `📋 Booking Summary\n\n📅 Date/Time: ${state.date} ${state.time}\n📍 Area: ${area?.name?.en || state.area}\n👤 Lady: ${cast?.name || 'No preference'}\n💎 Course: ${course?.name?.en || ''} (${course?.duration}min)\n\n💰 Total: ¥${total.toLocaleString()}\n\nReply "yes" to confirm or "no" to cancel.`,
        zh: `📋 预约确认\n\n📅 时间: ${state.date} ${state.time}\n📍 区域: ${area?.name?.zh || state.area}\n👤 佳丽: ${cast?.name || '随机'}\n💎 课程: ${course?.name?.zh || ''}\n\n💰 合计: ¥${total.toLocaleString()}\n\n回复「确认」确定或「取消」取消。`,
    };
    return m[locale] || m.en;
}

function getBookingComplete(locale, state) {
    const url = `${BASE_URL}/${locale}/booking?course=${state.courseId}${state.castId ? `&cast=${state.castId}` : ''}`;
    const m = {
        ja: `✅ ありがとうございます！\n\nお支払い手続きを以下のリンクからお願いいたします：\n${url}\n\nまたは、ご到着後に現地でのお支払いも可能です。\n\n素敵なお時間をお過ごしください 🌹`,
        en: `✅ Thank you!\n\nPlease complete payment here:\n${url}\n\nOr pay on arrival.\n\nWe look forward to seeing you! 🌹`,
        zh: `✅ 谢谢您！\n\n请通过以下链接完成支付：\n${url}\n\n也可以到达后支付。\n\n期待您的到来！🌹`,
    };
    return m[locale] || m.en;
}

function getCancelled(locale) {
    const m = {
        ja: `予約をキャンセルしました。\nまたのご利用をお待ちしております。\n\n新しい予約は「予約」と返信してください。`,
        en: `Reservation cancelled.\nFeel free to try again anytime.\n\nReply "book" to start a new reservation.`,
    };
    return m[locale] || m.en;
}

function getConfirmRetry(locale) {
    const m = {
        ja: `「はい」で確定、「いいえ」でキャンセルしてください。`,
        en: `Please reply "yes" to confirm or "no" to cancel.`,
    };
    return m[locale] || m.en;
}

module.exports = { generateAIReply, detectLocale };
