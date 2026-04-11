// ============================================
// 予約投稿スケジューラー
// 指定日時にSNS投稿を自動配信
// Telegram（EN/JA/一般）+ Reddit + ブログ自動公開
// ============================================
const path = require('path');
const fs = require('fs');

const telegram = require('./telegram');
const reddit = require('./reddit');
const gbp = require('./gbp');
const { checkContent, sanitizeContent } = require('./content-filter');

const schedulePath = path.join(__dirname, '..', 'data', 'scheduled-posts.json');
const historyPath = path.join(__dirname, '..', 'data', 'posts-history.json');

// タイマー管理
const timers = new Map();

function readJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) return [];
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        console.error(`[Scheduler] JSON読み込みエラー ${filePath}:`, e.message);
        return [];
    }
}
function writeJSON(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error(`[Scheduler] JSON書き込みエラー ${filePath}:`, e.message);
    }
}

// 予約投稿を登録
function schedule(posts, startDate) {
    const scheduled = readJSON(schedulePath);
    const batchId = Date.now();

    // 各プラットフォームの投稿時間（曜日別）
    const tgEnTimes = ['07:00', '12:00', '07:00', '21:00', '12:00', '09:00', '18:00'];
    const tgJaTimes = ['19:00', '19:00', '19:00', '19:00', '19:00', '19:00', '19:00'];
    const tgTimes = ['10:00', '14:00', '10:00', '14:00', '10:00', '10:00', '14:00'];
    const redditTimes = ['08:00', '13:00', '08:00', '20:00', '13:00', '11:00', '16:00'];
    const dayLabels = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜', '日曜'];

    const start = new Date(startDate + 'T00:00:00+09:00');
    const newEntries = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = new Date(start);
        date.setDate(date.getDate() + dayIndex);
        const dateStr = date.toISOString().slice(0, 10);

        // Telegram EN（集客・英語圏向け）
        if (posts.telegram_en && posts.telegram_en[dayIndex]) {
            const text = typeof posts.telegram_en[dayIndex] === 'string'
                ? posts.telegram_en[dayIndex]
                : posts.telegram_en[dayIndex].text;
            const time = tgEnTimes[dayIndex];
            newEntries.push({
                id: batchId + dayIndex * 10 + 1,
                batchId,
                platform: 'telegram_en',
                text,
                day: dayLabels[dayIndex],
                scheduledAt: `${dateStr}T${time}:00+09:00`,
                status: 'scheduled',
                createdAt: new Date().toISOString()
            });
        }

        // Telegram JA（求人・日本語向け）
        if (posts.telegram_ja && posts.telegram_ja[dayIndex]) {
            const post = posts.telegram_ja[dayIndex];
            const text = typeof post === 'string' ? post : post.text;
            const time = tgJaTimes[dayIndex];
            newEntries.push({
                id: batchId + dayIndex * 10 + 2,
                batchId,
                platform: 'telegram_ja',
                text,
                type: post.type || 'recruit',
                day: dayLabels[dayIndex],
                scheduledAt: `${dateStr}T${time}:00+09:00`,
                status: 'scheduled',
                createdAt: new Date().toISOString()
            });
        }

        // Reddit（集客・英語圏向け）
        if (posts.reddit && posts.reddit[dayIndex]) {
            const post = posts.reddit[dayIndex];
            const title = typeof post === 'string' ? post : post.title;
            const text = typeof post === 'string' ? '' : (post.text || '');
            const subreddit = typeof post === 'string' ? 'Tokyo' : (post.subreddit || 'Tokyo');
            const time = redditTimes[dayIndex];
            newEntries.push({
                id: batchId + dayIndex * 10 + 4,
                batchId,
                platform: 'reddit',
                text: JSON.stringify({ title, text, subreddit }),
                day: dayLabels[dayIndex],
                scheduledAt: `${dateStr}T${time}:00+09:00`,
                status: 'scheduled',
                createdAt: new Date().toISOString()
            });
        }

        // Telegram（既存・一般チャンネル）
        if (posts.telegram && posts.telegram[dayIndex]) {
            const text = typeof posts.telegram[dayIndex] === 'string'
                ? posts.telegram[dayIndex]
                : posts.telegram[dayIndex].text;
            const time = tgTimes[dayIndex];
            newEntries.push({
                id: batchId + dayIndex * 10 + 3,
                batchId,
                platform: 'telegram',
                text,
                day: dayLabels[dayIndex],
                scheduledAt: `${dateStr}T${time}:00+09:00`,
                status: 'scheduled',
                createdAt: new Date().toISOString()
            });
        }
    }

    scheduled.push(...newEntries);
    writeJSON(schedulePath, scheduled);

    // タイマーをセット
    newEntries.forEach(entry => setTimer(entry));

    return { batchId, count: newEntries.length, entries: newEntries };
}

// 個別投稿のタイマーをセット
function setTimer(entry) {
    const now = Date.now();
    const scheduledTime = new Date(entry.scheduledAt).getTime();
    const delay = scheduledTime - now;

    if (delay <= 0) {
        // 過去の時刻は即座に実行
        executePost(entry.id);
        return;
    }

    const timer = setTimeout(() => {
        executePost(entry.id);
        timers.delete(entry.id);
    }, delay);
    timers.set(entry.id, timer);
}

// 投稿を実行
async function executePost(entryId) {
    const scheduled = readJSON(schedulePath);
    const entry = scheduled.find(e => e.id === entryId);
    if (!entry || entry.status !== 'scheduled') return;

    try {
        // コンテンツフィルター適用
        let text = entry.text;
        const check = checkContent(text);
        if (!check.safe) {
            const { text: sanitized, replacements } = sanitizeContent(text);
            console.log(`[Scheduler] ⚠️ NGワード置換 (${entry.platform}):`, replacements);
            const recheck = checkContent(sanitized);
            if (!recheck.safe) {
                console.error(`[Scheduler] 🚫 投稿ブロック (${entry.platform}): NGワード残存`, recheck.blocked);
                entry.status = 'blocked';
                entry.error = `NGワード検出: ${recheck.blocked.join(', ')}`;
                entry.postedAt = new Date().toISOString();
                writeJSON(schedulePath, scheduled);
                return;
            }
            text = sanitized;
        }

        let result;
        switch (entry.platform) {
            case 'telegram_en':
            case 'telegram_ja':
            case 'telegram':
                result = await telegram.postToChannel(text);
                break;
            case 'reddit': {
                // Reddit投稿（JSONパースして投稿）
                try {
                    const postData = JSON.parse(text);
                    result = await reddit.postToSubreddit(
                        postData.subreddit || 'Tokyo',
                        postData.title,
                        postData.text
                    );
                } catch (redditErr) {
                    result = { success: false, error: redditErr.message };
                }
                break;
            }
            case 'gbp': {
                // Google Business Profile投稿
                result = await gbp.createPost(text);
                break;
            }
            case 'blog_auto': {
                // ブログ自動公開（記事生成→公開）
                try {
                    const claude = require('./claude');
                    const github = require('./github');
                    const blogRoute = require('../routes/blog');
                    const article = await claude.generateBlogArticle();
                    if (article.error) throw new Error(article.error);
                    // blog/publish相当の処理をインラインで実行
                    const blogDir = path.join(__dirname, '..', 'blog');
                    if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
                    const safeSlug = article.slug.replace(/[^a-zA-Z0-9-]/g, '');
                    console.log(`[Scheduler] 📝 ブログ自動公開: ${article.title} (${safeSlug})`);
                    result = { success: true, title: article.title, slug: safeSlug };
                    // GitHub公開は非同期で（失敗しても投稿済みとする）
                    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
                        github.pushFile(`blog/${safeSlug}.html`, article.body, `Auto blog: ${article.title}`).catch(e => {
                            console.error('[Scheduler] GitHub公開エラー:', e.message);
                        });
                    }
                } catch (blogErr) {
                    result = { success: false, error: blogErr.message };
                }
                break;
            }
        }

        entry.status = result && result.success ? 'posted' : 'failed';
        entry.result = result;
        entry.postedAt = new Date().toISOString();
    } catch (e) {
        entry.status = 'failed';
        entry.error = e.message;
        entry.postedAt = new Date().toISOString();
    }

    writeJSON(schedulePath, scheduled);

    // 履歴にも記録
    const history = readJSON(historyPath);
    history.push({
        id: Date.now(),
        type: 'scheduled',
        text: entry.text,
        platform: entry.platform,
        results: [{ platform: entry.platform, success: entry.status === 'posted', text: entry.text }],
        scheduledAt: entry.scheduledAt,
        createdAt: entry.postedAt
    });
    writeJSON(historyPath, history);
}

// サーバー起動時に未投稿のスケジュールを復元
function restore() {
    const scheduled = readJSON(schedulePath);
    let restored = 0;
    scheduled.forEach(entry => {
        if (entry.status === 'scheduled') {
            setTimer(entry);
            restored++;
        }
    });
    if (restored > 0) {
        console.log(`📅 予約投稿 ${restored}件 を復元しました`);
    }
}

// 予約一覧を取得
function getScheduled(filter) {
    const scheduled = readJSON(schedulePath);
    let filtered = scheduled;
    if (filter && filter !== 'all') {
        filtered = scheduled.filter(e => e.platform === filter);
    }
    // 新しい順
    filtered.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    return filtered;
}

// 予約をキャンセル
function cancel(entryId) {
    const scheduled = readJSON(schedulePath);
    const entry = scheduled.find(e => e.id === entryId);
    if (!entry || entry.status !== 'scheduled') return false;

    entry.status = 'cancelled';
    writeJSON(schedulePath, scheduled);

    const timer = timers.get(entryId);
    if (timer) {
        clearTimeout(timer);
        timers.delete(entryId);
    }
    return true;
}

// ブログ自動公開スケジュール（週2回：火曜10:00、金曜10:00）
function scheduleBlogAuto() {
    const now = new Date();
    const scheduled = readJSON(schedulePath);

    // 今週の火曜と金曜を計算
    const dayOfWeek = now.getDay(); // 0=日, 1=月, ...
    const blogDays = [2, 5]; // 火曜, 金曜
    const batchId = Date.now();
    const newEntries = [];

    for (const targetDay of blogDays) {
        let daysUntil = targetDay - dayOfWeek;
        if (daysUntil < 0) daysUntil += 7;
        if (daysUntil === 0) {
            // 今日が該当日で、まだ10:00前なら今日分をスケジュール
            const todayAt10 = new Date(now);
            todayAt10.setHours(10, 0, 0, 0);
            if (now >= todayAt10) continue; // 既に過ぎていたらスキップ
        }

        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysUntil);
        const dateStr = targetDate.toISOString().slice(0, 10);

        // 既にスケジュール済みかチェック
        const alreadyScheduled = scheduled.some(e =>
            e.platform === 'blog_auto' &&
            e.scheduledAt.startsWith(dateStr) &&
            e.status === 'scheduled'
        );
        if (alreadyScheduled) continue;

        const entry = {
            id: batchId + targetDay,
            batchId,
            platform: 'blog_auto',
            text: 'SEOブログ記事自動生成・公開',
            day: ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'][targetDay],
            scheduledAt: `${dateStr}T10:00:00+09:00`,
            status: 'scheduled',
            createdAt: new Date().toISOString()
        };
        newEntries.push(entry);
    }

    if (newEntries.length > 0) {
        scheduled.push(...newEntries);
        writeJSON(schedulePath, scheduled);
        newEntries.forEach(entry => setTimer(entry));
        console.log(`📝 ブログ自動公開 ${newEntries.length}件 をスケジュールしました`);
    }
    return newEntries;
}

// GBP自動投稿スケジュール（邑3回：月曜11:00、水曜11:00、土曜11:00）
function scheduleGBPAuto() {
    const now = new Date();
    const scheduled = readJSON(schedulePath);
    const gbpDays = [1, 3, 6]; // 月曜, 水曜, 土曜
    const dayOfWeek = now.getDay();
    const batchId = Date.now();
    const newEntries = [];

    const gbpTexts = [
        'Discover premium hospitality in the heart of Roppongi, Tokyo. Our carefully selected concierge team provides an unforgettable evening experience. Visit tokyoroze.com to learn more.',
        'Looking for an exceptional night out in Tokyo? Our Roppongi-based luxury concierge service offers personalized experiences for discerning guests. Book at tokyoroze.com',
        'Weekend in Tokyo? Experience the finest hospitality Roppongi has to offer. Our premium concierge service is available 7 days a week, 5PM-5AM. Details at tokyoroze.com'
    ];

    for (let i = 0; i < gbpDays.length; i++) {
        const targetDay = gbpDays[i];
        let daysUntil = targetDay - dayOfWeek;
        if (daysUntil < 0) daysUntil += 7;
        if (daysUntil === 0) {
            const todayAt11 = new Date(now);
            todayAt11.setHours(11, 0, 0, 0);
            if (now >= todayAt11) continue;
        }

        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysUntil);
        const dateStr = targetDate.toISOString().slice(0, 10);

        const alreadyScheduled = scheduled.some(e =>
            e.platform === 'gbp' &&
            e.scheduledAt.startsWith(dateStr) &&
            e.status === 'scheduled'
        );
        if (alreadyScheduled) continue;

        const entry = {
            id: batchId + targetDay + 100,
            batchId,
            platform: 'gbp',
            text: gbpTexts[i],
            day: ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'][targetDay],
            scheduledAt: `${dateStr}T11:00:00+09:00`,
            status: 'scheduled',
            createdAt: new Date().toISOString()
        };
        newEntries.push(entry);
    }

    if (newEntries.length > 0) {
        scheduled.push(...newEntries);
        writeJSON(schedulePath, scheduled);
        newEntries.forEach(entry => setTimer(entry));
        console.log(`📍 GBP自動投稿 ${newEntries.length}件 をスケジュールしました`);
    }
    return newEntries;
}

module.exports = { schedule, restore, getScheduled, cancel, executePost, scheduleBlogAuto, scheduleGBPAuto };
