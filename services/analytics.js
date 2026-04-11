// ============================================
// 分析データ収集・集計サービス
// LP・Telegram・求人の統計データを管理
// ============================================
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const analyticsPath = path.join(dataDir, 'analytics.json');
const historyPath = path.join(dataDir, 'posts-history.json');
const scheduledPath = path.join(dataDir, 'scheduled-posts.json');

// データ読み書き
function readJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) return [];
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        console.error(`[Analytics] JSON読み込みエラー ${filePath}:`, e.message);
        return [];
    }
}
function writeJSON(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error(`[Analytics] JSON書き込みエラー ${filePath}:`, e.message);
    }
}

// 分析データの初期構造
function getAnalytics() {
    const filePath = analyticsPath;
    if (!fs.existsSync(filePath)) {
        const initial = { events: [], daily: {} };
        writeJSON(filePath, initial);
        return initial;
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        return { events: [], daily: {} };
    }
}

// イベントを記録
function recordEvent(event) {
    const data = getAnalytics();
    const ts = event.ts || new Date().toISOString();
    const dateKey = ts.slice(0, 10); // YYYY-MM-DD

    // イベント配列に追加（直近90日分のみ詳細保持、日別集計は永久保存）
    data.events.push({ ...event, ts });
    const cutoff90 = new Date();
    cutoff90.setDate(cutoff90.getDate() - 90);
    const cutoffStr = cutoff90.toISOString();
    if (data.events.length > 20000) {
        data.events = data.events.filter(e => e.ts >= cutoffStr);
    }

    // 日別集計
    if (!data.daily[dateKey]) {
        data.daily[dateKey] = { pv: 0, uu: new Set(), cta: {}, lang: {} };
    }
    const day = data.daily[dateKey];

    // Set をJSON復元時に対応
    if (Array.isArray(day.uu)) {
        day.uu = new Set(day.uu);
    } else if (!(day.uu instanceof Set)) {
        day.uu = new Set();
    }

    if (event.event === 'page_view') {
        day.pv++;
        if (event.ip) day.uu.add(event.ip);
        if (event.lang) {
            day.lang[event.lang] = (day.lang[event.lang] || 0) + 1;
        }
    }

    if (event.event === 'cta_click') {
        const label = event.label || 'unknown';
        day.cta[label] = (day.cta[label] || 0) + 1;
    }

    // 求人関連イベント
    if (event.event === 'job_view') {
        day.jobView = (day.jobView || 0) + 1;
    }
    if (event.event === 'job_inquiry') {
        day.jobInquiry = (day.jobInquiry || 0) + 1;
        if (event.label) {
            if (!day.jobInquiryBy) day.jobInquiryBy = {};
            day.jobInquiryBy[event.label] = (day.jobInquiryBy[event.label] || 0) + 1;
        }
    }

    // Set → Array に変換してJSON保存
    const saveData = JSON.parse(JSON.stringify(data, (key, value) => {
        if (value instanceof Set) return [...value];
        return value;
    }));
    writeJSON(analyticsPath, saveData);
}

// 日別データを月別に集約
function aggregateMonthly(daily, startKey, endKey) {
    const months = {};
    for (const [key, day] of Object.entries(daily)) {
        if (key < startKey || key > endKey) continue;
        const monthKey = key.slice(0, 7); // YYYY-MM
        if (!months[monthKey]) {
            months[monthKey] = { pv: 0, uu: 0, cta: {}, lang: {}, days: 0 };
        }
        const m = months[monthKey];
        m.pv += day.pv || 0;
        m.uu += Array.isArray(day.uu) ? day.uu.length : 0;
        m.days++;
        for (const [k, v] of Object.entries(day.cta || {})) {
            m.cta[k] = (m.cta[k] || 0) + v;
        }
        for (const [k, v] of Object.entries(day.lang || {})) {
            m.lang[k] = (m.lang[k] || 0) + v;
        }
    }
    return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({ date, ...d }));
}

// ダッシュボード用データ取得
function getDashboard(days = 30) {
    const data = getAnalytics();
    const history = readJSON(historyPath);
    const scheduled = readJSON(scheduledPath);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startKey = startDate.toISOString().slice(0, 10);
    const endKey = now.toISOString().slice(0, 10);

    // 90日以下 → 日別トレンド、それ以上 → 月別トレンド
    const useMonthly = days > 90;
    let trend;

    if (useMonthly) {
        trend = aggregateMonthly(data.daily, startKey, endKey);
    } else {
        trend = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            const day = data.daily[key] || { pv: 0, uu: [], cta: {}, lang: {} };
            const uuCount = Array.isArray(day.uu) ? day.uu.length : 0;
            trend.push({
                date: key,
                pv: day.pv || 0,
                uu: uuCount,
                cta: day.cta || {},
                lang: day.lang || {}
            });
        }
    }

    // 今日のデータ
    const todayKey = now.toISOString().slice(0, 10);
    const today = data.daily[todayKey] || { pv: 0, uu: [], cta: {}, lang: {} };
    const todayUU = Array.isArray(today.uu) ? today.uu.length : 0;

    // 期間合計
    let periodPV = 0, periodUU = 0;
    const periodCta = {};
    const periodLang = {};
    for (const [key, day] of Object.entries(data.daily)) {
        if (key < startKey || key > endKey) continue;
        periodPV += day.pv || 0;
        periodUU += Array.isArray(day.uu) ? day.uu.length : 0;
        for (const [k, v] of Object.entries(day.cta || {})) {
            periodCta[k] = (periodCta[k] || 0) + v;
        }
        for (const [k, v] of Object.entries(day.lang || {})) {
            periodLang[k] = (periodLang[k] || 0) + v;
        }
    }

    // SNS投稿統計（期間フィルタリング）
    const startISO = startDate.toISOString();
    const periodPosts = history.filter(p => (p.createdAt || '') >= startISO);
    const recentPosts = periodPosts.slice(-50).reverse();
    const postsByPlatform = {};
    for (const post of periodPosts) {
        if (post.results) {
            for (const r of post.results) {
                if (!postsByPlatform[r.platform]) postsByPlatform[r.platform] = { total: 0, success: 0, failed: 0 };
                postsByPlatform[r.platform].total++;
                if (r.success) postsByPlatform[r.platform].success++;
                else postsByPlatform[r.platform].failed++;
            }
        }
    }

    // 予約投稿状況
    const pendingScheduled = scheduled.filter(s => s.status === 'scheduled').length;
    const postedScheduled = scheduled.filter(s => s.status === 'posted').length;
    const failedScheduled = scheduled.filter(s => s.status === 'failed').length;
    const blockedScheduled = scheduled.filter(s => s.status === 'blocked').length;

    // コンテンツフィルター統計（イベントから集計）
    const filterEvents = data.events.filter(e => e.event === 'filter_block' || e.event === 'filter_sanitize');
    const filterStats = {
        blocked: filterEvents.filter(e => e.event === 'filter_block').length,
        sanitized: filterEvents.filter(e => e.event === 'filter_sanitize').length
    };

    // 保存データの統計情報
    const dailyKeys = Object.keys(data.daily).sort();
    const dataRange = {
        from: dailyKeys[0] || null,
        to: dailyKeys[dailyKeys.length - 1] || null,
        totalDays: dailyKeys.length
    };

    return {
        today: {
            pv: today.pv || 0,
            uu: todayUU,
            cta: today.cta || {},
            lang: today.lang || {}
        },
        period: {
            days,
            pv: periodPV,
            uu: periodUU,
            cta: periodCta,
            lang: periodLang,
            useMonthly
        },
        trend,
        sns: {
            postsByPlatform,
            recentPosts: recentPosts.slice(0, 20),
            scheduled: { pending: pendingScheduled, posted: postedScheduled, failed: failedScheduled, blocked: blockedScheduled }
        },
        filter: filterStats,
        ctaTotal: periodCta,
        dataRange
    };
}

// ===== 求人アナリティクス =====

// 求人日別データを月別に集約
function aggregateJobMonthly(daily, startKey, endKey) {
    const months = {};
    for (const [key, day] of Object.entries(daily)) {
        if (key < startKey || key > endKey) continue;
        if (!day.jobView && !day.jobInquiry) continue;
        const monthKey = key.slice(0, 7);
        if (!months[monthKey]) {
            months[monthKey] = { views: 0, inquiries: 0, inquiryBy: {}, days: 0 };
        }
        const m = months[monthKey];
        m.views += day.jobView || 0;
        m.inquiries += day.jobInquiry || 0;
        m.days++;
        for (const [k, v] of Object.entries(day.jobInquiryBy || {})) {
            m.inquiryBy[k] = (m.inquiryBy[k] || 0) + v;
        }
    }
    return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({ date, ...d }));
}

// 求人日別データを年別に集約
function aggregateJobYearly(daily, startKey, endKey) {
    const years = {};
    for (const [key, day] of Object.entries(daily)) {
        if (key < startKey || key > endKey) continue;
        if (!day.jobView && !day.jobInquiry) continue;
        const yearKey = key.slice(0, 4);
        if (!years[yearKey]) {
            years[yearKey] = { views: 0, inquiries: 0, inquiryBy: {}, days: 0 };
        }
        const y = years[yearKey];
        y.views += day.jobView || 0;
        y.inquiries += day.jobInquiry || 0;
        y.days++;
        for (const [k, v] of Object.entries(day.jobInquiryBy || {})) {
            y.inquiryBy[k] = (y.inquiryBy[k] || 0) + v;
        }
    }
    return Object.entries(years)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({ date, ...d }));
}

// 求人ダッシュボードデータ取得
function getJobDashboard(days = 30) {
    const data = getAnalytics();
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startKey = startDate.toISOString().slice(0, 10);
    const endKey = now.toISOString().slice(0, 10);

    // 90日以下→日別, 1825日以下→月別, それ以上→年別
    let trend;
    let aggregation = 'daily';
    if (days > 1825) {
        trend = aggregateJobYearly(data.daily, startKey, endKey);
        aggregation = 'yearly';
    } else if (days > 90) {
        trend = aggregateJobMonthly(data.daily, startKey, endKey);
        aggregation = 'monthly';
    } else {
        trend = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            const day = data.daily[key] || {};
            trend.push({
                date: key,
                views: day.jobView || 0,
                inquiries: day.jobInquiry || 0,
                inquiryBy: day.jobInquiryBy || {}
            });
        }
    }

    // 今日
    const todayKey = now.toISOString().slice(0, 10);
    const today = data.daily[todayKey] || {};

    // 期間合計
    let totalViews = 0, totalInquiries = 0;
    const totalInquiryBy = {};
    for (const [key, day] of Object.entries(data.daily)) {
        if (key < startKey || key > endKey) continue;
        totalViews += day.jobView || 0;
        totalInquiries += day.jobInquiry || 0;
        for (const [k, v] of Object.entries(day.jobInquiryBy || {})) {
            totalInquiryBy[k] = (totalInquiryBy[k] || 0) + v;
        }
    }

    // CVR (問い合わせ / 閲覧)
    const cvr = totalViews > 0 ? (totalInquiries / totalViews * 100).toFixed(2) : 0;

    // データ範囲
    const dailyKeys = Object.keys(data.daily).filter(k => (data.daily[k].jobView || 0) > 0 || (data.daily[k].jobInquiry || 0) > 0).sort();

    return {
        today: {
            views: today.jobView || 0,
            inquiries: today.jobInquiry || 0
        },
        period: {
            days,
            views: totalViews,
            inquiries: totalInquiries,
            inquiryBy: totalInquiryBy,
            cvr,
            aggregation
        },
        trend,
        dataRange: {
            from: dailyKeys[0] || null,
            to: dailyKeys[dailyKeys.length - 1] || null,
            totalDays: dailyKeys.length
        }
    };
}

module.exports = { recordEvent, getDashboard, getJobDashboard, getAnalytics };
