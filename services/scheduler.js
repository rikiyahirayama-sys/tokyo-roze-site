// ============================================
// 予約投稿スケジューラー
// 指定日時にSNS投稿を自動配信
// ============================================
const path = require('path');
const fs = require('fs');

const twitter = require('./twitter');
const telegram = require('./telegram');

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
    const enTimes = ['07:00', '12:00', '07:00', '21:00', '12:00', '09:00', '18:00'];
    const jaTimes = ['19:00', '19:00', '19:00', '19:00', '19:00', '19:00', '19:00'];
    const tgTimes = ['10:00', '14:00', '10:00', '14:00', '10:00', '10:00', '14:00'];
    const dayLabels = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜', '日曜'];

    const start = new Date(startDate + 'T00:00:00+09:00');
    const newEntries = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = new Date(start);
        date.setDate(date.getDate() + dayIndex);
        const dateStr = date.toISOString().slice(0, 10);

        // X英語
        if (posts.twitter_en && posts.twitter_en[dayIndex]) {
            const text = typeof posts.twitter_en[dayIndex] === 'string'
                ? posts.twitter_en[dayIndex]
                : posts.twitter_en[dayIndex].text;
            const time = enTimes[dayIndex];
            newEntries.push({
                id: batchId + dayIndex * 10 + 1,
                batchId,
                platform: 'twitter_en',
                text,
                day: dayLabels[dayIndex],
                scheduledAt: `${dateStr}T${time}:00+09:00`,
                status: 'scheduled',
                createdAt: new Date().toISOString()
            });
        }

        // X日本語
        if (posts.twitter_ja && posts.twitter_ja[dayIndex]) {
            const post = posts.twitter_ja[dayIndex];
            const text = typeof post === 'string' ? post : post.text;
            const time = jaTimes[dayIndex];
            newEntries.push({
                id: batchId + dayIndex * 10 + 2,
                batchId,
                platform: 'twitter_ja',
                text,
                type: post.type || 'recruit',
                day: dayLabels[dayIndex],
                scheduledAt: `${dateStr}T${time}:00+09:00`,
                status: 'scheduled',
                createdAt: new Date().toISOString()
            });
        }

        // Telegram
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
        let result;
        switch (entry.platform) {
            case 'twitter_en':
                result = await twitter.postTweet(entry.text, null, 'en');
                break;
            case 'twitter_ja':
                result = await twitter.postTweet(entry.text, null, 'ja');
                break;
            case 'telegram':
                result = await telegram.postToChannel(entry.text);
                break;
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

module.exports = { schedule, restore, getScheduled, cancel, executePost };
