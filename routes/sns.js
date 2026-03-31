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
const twitter = require('../services/twitter');
const telegram = require('../services/telegram');
const scheduler = require('../services/scheduler');

// データファイルパス
const historyPath = path.join(__dirname, '..', 'data', 'posts-history.json');
const draftsPath = path.join(__dirname, '..', 'data', 'drafts.json');
const castsPath = path.join(__dirname, '..', 'data', 'casts.json');

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
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 遅延関数（SNS投稿間隔用）
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== POST /generate — 週間投稿自動生成 =====
router.post('/generate', async (req, res) => {
    try {
        const { topics } = req.body;
        const result = await claude.generateWeeklyPosts(topics);
        if (result.error) return res.json({ success: false, error: result.error });
        return res.json({ success: true, posts: result });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /post — 一括投稿 =====
router.post('/post', async (req, res) => {
    try {
        const { posts } = req.body;
        const results = [];

        // X英語
        if (posts.twitter_en && Array.isArray(posts.twitter_en)) {
            for (const post of posts.twitter_en) {
                const text = typeof post === 'string' ? post : post.text;
                const r = await twitter.postTweet(text, null, 'en');
                results.push({ platform: 'twitter_en', text, ...r });
                await delay(3000);
            }
        }

        // X日本語
        if (posts.twitter_ja && Array.isArray(posts.twitter_ja)) {
            for (const post of posts.twitter_ja) {
                const text = typeof post === 'string' ? post : post.text;
                const r = await twitter.postTweet(text, null, 'ja');
                results.push({ platform: 'twitter_ja', text, ...r });
                await delay(3000);
            }
        }

        // Telegram
        if (posts.telegram && Array.isArray(posts.telegram)) {
            for (const post of posts.telegram) {
                const text = typeof post === 'string' ? post : post.text;
                const r = await telegram.postToChannel(text);
                results.push({ platform: 'telegram', text, ...r });
                await delay(3000);
            }
        }

        // 履歴に記録
        const history = readJSON(historyPath);
        history.push({
            id: Date.now(),
            type: 'weekly_batch',
            results,
            createdAt: new Date().toISOString()
        });
        writeJSON(historyPath, history);

        return res.json({ success: true, results });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /manual — 手動投稿 =====
router.post('/manual', upload.array('images', 5), async (req, res) => {
    try {
        const { text, platforms } = req.body;
        const platformList = typeof platforms === 'string' ? JSON.parse(platforms) : (platforms || []);
        const imagePath = (req.files && req.files.length > 0) ? path.join('uploads', req.files[0].filename) : null;
        const results = [];

        for (const platform of platformList) {
            switch (platform) {
                case 'twitter_en': {
                    const r = await twitter.postTweet(text, imagePath, 'en');
                    results.push({ platform: 'twitter_en', ...r });
                    break;
                }
                case 'twitter_ja': {
                    const r = await twitter.postTweet(text, imagePath, 'ja');
                    results.push({ platform: 'twitter_ja', ...r });
                    break;
                }
                case 'telegram': {
                    const r = await telegram.postToChannel(text, imagePath);
                    results.push({ platform: 'telegram', ...r });
                    break;
                }
            }
            await delay(1000);
        }

        // 履歴に記録
        const history = readJSON(historyPath);
        history.push({
            id: Date.now(),
            type: 'manual',
            text,
            platforms: platformList,
            results,
            createdAt: new Date().toISOString()
        });
        writeJSON(historyPath, history);

        return res.json({ success: true, results });
    } catch (e) {
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

        // 生成結果のみ返す（投稿はフロント側で/postを呼ぶ）
        return res.json({ success: true, posts, type });
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
        const history = readJSON(historyPath);
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
        return res.json({ success: true, history: filtered });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
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
