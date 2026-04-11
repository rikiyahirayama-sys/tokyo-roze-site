// ============================================
// SNS投稿管理 API
// 自動生成・手動投稿・テンプレート投稿・下書き・履歴
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const claude = require('../services/claude');
const telegram = require('../services/telegram');
const reddit = require('../services/reddit');
const gbp = require('../services/gbp');
const scheduler = require('../services/scheduler');
const { filterPosts, checkContent, sanitizeContent } = require('../services/content-filter');

// データファイルパス
const dataDir = path.join(__dirname, '..', 'data');
const historyPath = path.join(dataDir, 'posts-history.json');
const draftsPath = path.join(dataDir, 'drafts.json');
const castsPath = path.join(dataDir, 'casts.json');

// dataディレクトリがなければ作成
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// メモリ内履歴キャッシュ（Render.comファイルシステム対応）
let historyCache = null;

// ファイルアップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
        cb(null, Date.now() + '_' + safeName);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// データ読み書きヘルパー
function readJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) return [];
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        console.error(`[SNS] JSON読み込みエラー ${filePath}:`, e.message);
        return [];
    }
}
function writeJSON(filePath, data) {
    try {
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error(`[SNS] JSON書き込みエラー ${filePath}:`, e.message);
    }
}

// 履歴読み書き（メモリキャッシュ併用）
function readHistory() {
    if (historyCache === null) {
        historyCache = readJSON(historyPath);
    }
    return historyCache;
}
function writeHistory(data) {
    historyCache = data;
    writeJSON(historyPath, data);
}

// 遅延関数（SNS投稿間隔用）
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== POST /generate — 週間投稿自動生成 =====
router.post('/generate', async (req, res) => {
    try {
        const { topics } = req.body;
        const result = await claude.generateWeeklyPosts(topics);
        if (result.error) return res.json({ success: false, error: result.error });

        // コンテンツフィルター適用
        const { posts: filtered, report } = filterPosts(result);
        return res.json({ success: true, posts: filtered, filterReport: report });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /post — 一括投稿 =====
router.post('/post', async (req, res) => {
    try {
        const { posts: rawPosts } = req.body;
        // 投稿前にコンテンツフィルターを適用
        const { posts, report: filterReport } = filterPosts(rawPosts || {});
        if (filterReport.blocked.length > 0) {
            console.error('[SNS] ⚠️ NGワード検出により投稿ブロック:', filterReport.blocked);
            return res.status(400).json({ success: false, error: 'NGワードが検出されました。投稿内容を修正してください。', filterReport });
        }
        const results = [];
        console.log('[SNS] 一括投稿開始:', Object.keys(posts || {}));

        // Telegram EN（集客・英語圏向け）
        if (posts.telegram_en && Array.isArray(posts.telegram_en)) {
            for (const post of posts.telegram_en) {
                const text = typeof post === 'string' ? post : post.text;
                const r = await telegram.postToChannel(text);
                console.log('[SNS] telegram_en 結果:', r.success ? '✅' : '❌', r.error || '');
                results.push({ platform: 'telegram_en', text, ...r });
                await delay(3000);
            }
        }

        // Telegram JA（求人・日本語向け）
        if (posts.telegram_ja && Array.isArray(posts.telegram_ja)) {
            for (const post of posts.telegram_ja) {
                const text = typeof post === 'string' ? post : post.text;
                const r = await telegram.postToChannel(text);
                console.log('[SNS] telegram_ja 結果:', r.success ? '✅' : '❌', r.error || '');
                results.push({ platform: 'telegram_ja', text, ...r });
                await delay(3000);
            }
        }

        // Telegram（一般チャンネル）
        if (posts.telegram && Array.isArray(posts.telegram)) {
            for (const post of posts.telegram) {
                const text = typeof post === 'string' ? post : post.text;
                const r = await telegram.postToChannel(text);
                console.log('[SNS] telegram 結果:', r.success ? '✅' : '❌', r.error || '');
                results.push({ platform: 'telegram', text, ...r });
                await delay(3000);
            }
        }

        // Reddit（集客・英語圏向け）
        if (posts.reddit && Array.isArray(posts.reddit)) {
            for (const post of posts.reddit) {
                const title = typeof post === 'string' ? post : post.title;
                const text = typeof post === 'string' ? '' : (post.text || '');
                const subreddit = typeof post === 'string' ? 'Tokyo' : (post.subreddit || 'Tokyo');
                const r = await reddit.postToSubreddit(subreddit, title, text);
                console.log(`[SNS] reddit r/${subreddit} 結果:`, r.success ? '✅' : '❌', r.error || '');
                results.push({ platform: 'reddit', subreddit, title, ...r });
                await delay(5000); // Reddit rate limit対策
            }
        }

        // 履歴に記録
        const history = readHistory();
        history.push({
            id: Date.now(),
            type: 'weekly_batch',
            results,
            createdAt: new Date().toISOString()
        });
        writeHistory(history);
        console.log('[SNS] 履歴保存完了 件数:', history.length);

        return res.json({ success: true, results });
    } catch (e) {
        console.error('[SNS] 一括投稿エラー:', e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /manual — 手動投稿 =====
router.post('/manual', upload.array('images', 5), async (req, res) => {
    try {
        const { text: rawText, platforms } = req.body;
        // 手動投稿にもコンテンツフィルター適用
        const contentCheck = checkContent(rawText);
        let text = rawText;
        if (!contentCheck.safe) {
            const { text: sanitized, replacements } = sanitizeContent(rawText);
            console.log('[SNS] 手動投稿NGワード置換:', replacements);
            // 再チェック — まだNGなら拒否
            const recheck = checkContent(sanitized);
            if (!recheck.safe) {
                return res.status(400).json({ success: false, error: 'NGワードが含まれています。投稿内容を修正してください。', blocked: recheck.blocked });
            }
            text = sanitized;
        }
        const platformList = typeof platforms === 'string' ? JSON.parse(platforms) : (platforms || []);
        const imagePath = (req.files && req.files.length > 0) ? path.join('uploads', req.files[0].filename) : null;
        const results = [];
        console.log('[SNS] 手動投稿開始 platforms:', platformList, 'image:', imagePath ? 'yes' : 'no');

        for (const platform of platformList) {
            switch (platform) {
                case 'telegram_en':
                case 'telegram_ja':
                case 'telegram': {
                    const r = await telegram.postToChannel(text, imagePath);
                    console.log(`[SNS] ${platform} 結果:`, r.success ? '✅' : '❌', r.error || '');
                    results.push({ platform, ...r });
                    break;
                }
                case 'reddit': {
                    const r = await reddit.postToSubreddit('Tokyo', text.substring(0, 100), text);
                    console.log('[SNS] reddit 結果:', r.success ? '✅' : '❌', r.error || '');
                    results.push({ platform: 'reddit', ...r });
                    break;
                }
                case 'gbp': {
                    const r = await gbp.createPost(text);
                    console.log('[SNS] gbp 結果:', r.success ? '✅' : '❌', r.error || '');
                    results.push({ platform: 'gbp', ...r });
                    break;
                }
            }
            await delay(1000);
        }

        // 履歴に記録
        const history = readHistory();
        history.push({
            id: Date.now(),
            type: 'manual',
            text,
            platforms: platformList,
            results,
            createdAt: new Date().toISOString()
        });
        writeHistory(history);
        console.log('[SNS] 手動投稿履歴保存 件数:', history.length);

        return res.json({ success: true, results });
    } catch (e) {
        console.error('[SNS] 手動投稿エラー:', e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /template — テンプレート投稿 =====
router.post('/template', async (req, res) => {
    try {
        const { type, data } = req.body;
        let posts = null;

        switch (type) {
            case 'daily_schedule': {
                const casts = readJSON(castsPath).filter(c => c.status === '出勤中');
                posts = await claude.generateDailySchedule(casts);
                break;
            }
            case 'new_cast': {
                const casts = readJSON(castsPath);
                const cast = casts.find(c => String(c.id) === String(data.castId));
                if (!cast) return res.status(404).json({ success: false, error: 'キャストが見つかりません' });
                posts = await claude.generateNewCastAnnouncement(cast);
                break;
            }
            case 'campaign':
                posts = await claude.generateCampaign(data);
                break;
            case 'review':
                posts = await claude.generateReviewPost(data);
                break;
            case 'weekend': {
                const casts = readJSON(castsPath);
                const available = (data.castIds || []).map(id => casts.find(c => String(c.id) === String(id))).filter(Boolean);
                posts = await claude.generateWeekendAvailability({ availableCasts: available, notes: data.notes });
                break;
            }
            case 'cast_return': {
                const casts = readJSON(castsPath);
                const cast = casts.find(c => String(c.id) === String(data.castId));
                if (!cast) return res.status(404).json({ success: false, error: 'キャストが見つかりません' });
                posts = await claude.generateCastReturn(cast, data.message);
                break;
            }
            case 'ranking': {
                const casts = readJSON(castsPath);
                posts = await claude.generateMonthlyRanking(casts.slice(0, 10));
                break;
            }
            case 'announcement':
                posts = await claude.generateAnnouncement(data);
                break;
            default:
                return res.status(400).json({ success: false, error: '不明なテンプレートタイプです' });
        }

        if (posts.error) return res.json({ success: false, error: posts.error });

        // コンテンツフィルター適用
        const { posts: filteredPosts, report: filterReport } = filterPosts(posts);

        // 生成結果のみ返す（投稿はフロント側で/postを呼ぶ）
        return res.json({ success: true, posts: filteredPosts, type, filterReport });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /draft — 下書き保存 =====
router.post('/draft', (req, res) => {
    try {
        const drafts = readJSON(draftsPath);
        const draft = {
            id: Date.now(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        drafts.push(draft);
        writeJSON(draftsPath, drafts);
        return res.json({ success: true, draft });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== GET /drafts — 下書き一覧 =====
router.get('/drafts', (req, res) => {
    try {
        const drafts = readJSON(draftsPath);
        return res.json({ success: true, drafts });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== GET /history — 投稿履歴 =====
router.get('/history', (req, res) => {
    try {
        const history = readHistory();
        const { platform } = req.query;
        let filtered = history;

        if (platform) {
            filtered = history.filter(h => {
                if (h.results) return h.results.some(r => r.platform === platform);
                if (h.platforms) return h.platforms.includes(platform);
                return true;
            });
        }

        // 新しい順
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log(`[SNS] 履歴取得 ${filtered.length}件`);
        return res.json({ success: true, history: filtered });
    } catch (e) {
        console.error('[SNS] 履歴取得エラー:', e.message);
        return res.status(500).json({ success: true, history: [] });
    }
});

// ===== POST /schedule — 予約投稿を登録 =====
router.post('/schedule', (req, res) => {
    try {
        const { posts, startDate } = req.body;
        if (!posts || !startDate) {
            return res.status(400).json({ success: false, error: '投稿データと開始日が必要です' });
        }
        const result = scheduler.schedule(posts, startDate);
        return res.json({ success: true, ...result });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== GET /scheduled — 予約投稿一覧 =====
router.get('/scheduled', (req, res) => {
    try {
        const { platform } = req.query;
        const entries = scheduler.getScheduled(platform);
        return res.json({ success: true, entries });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /schedule/cancel — 予約キャンセル =====
router.post('/schedule/cancel', (req, res) => {
    try {
        const { id } = req.body;
        const cancelled = scheduler.cancel(id);
        if (cancelled) return res.json({ success: true });
        return res.status(400).json({ success: false, error: '該当する予約が見つかりません' });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
