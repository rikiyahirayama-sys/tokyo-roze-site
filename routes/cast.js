// ============================================
// キャスト管理 API
// CRUD + 出勤ステータス + 新人お知らせ投稿
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const claude = require('../services/claude');
const telegram = require('../services/telegram');

// データファイルパス
const castsPath = path.join(__dirname, '..', 'data', 'casts.json');
const historyPath = path.join(__dirname, '..', 'data', 'posts-history.json');

// ファイルアップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
        cb(null, Date.now() + '_' + safeName);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// データ読み書き
function readCasts() {
    if (!fs.existsSync(castsPath)) return [];
    return JSON.parse(fs.readFileSync(castsPath, 'utf-8'));
}
function writeCasts(data) {
    fs.writeFileSync(castsPath, JSON.stringify(data, null, 2), 'utf-8');
}
function readHistory() {
    if (!fs.existsSync(historyPath)) return [];
    return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
}
function writeHistory(data) {
    fs.writeFileSync(historyPath, JSON.stringify(data, null, 2), 'utf-8');
}

// ===== POST / — 新規キャスト登録 =====
router.post('/', upload.array('photos', 10), (req, res) => {
    try {
        const casts = readCasts();
        const photos = (req.files || []).map(f => 'uploads/' + f.filename);

        const newCast = {
            id: Date.now(),
            name: req.body.name || '',
            age: parseInt(req.body.age) || 0,
            height: parseInt(req.body.height) || 0,
            bust: req.body.bust || '',
            waist: parseInt(req.body.waist) || 0,
            hip: parseInt(req.body.hip) || 0,
            description_ja: req.body.description_ja || '',
            description_en: req.body.description_en || '',
            description_zh: req.body.description_zh || '',
            photos: photos,
            status: '新人',
            createdAt: new Date().toISOString()
        };

        casts.push(newCast);
        writeCasts(casts);
        return res.json({ success: true, cast: newCast });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== GET / — キャスト一覧 =====
router.get('/', (req, res) => {
    try {
        const casts = readCasts();
        return res.json({ success: true, casts });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== GET /:id — キャスト詳細 =====
router.get('/:id', (req, res) => {
    try {
        const casts = readCasts();
        const cast = casts.find(c => String(c.id) === req.params.id);
        if (!cast) return res.status(404).json({ success: false, error: 'キャストが見つかりません' });
        return res.json({ success: true, cast });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== PUT /:id — キャスト更新 =====
router.put('/:id', upload.array('photos', 10), (req, res) => {
    try {
        const casts = readCasts();
        const idx = casts.findIndex(c => String(c.id) === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'キャストが見つかりません' });

        const newPhotos = (req.files || []).map(f => 'uploads/' + f.filename);
        const existing = casts[idx];

        casts[idx] = {
            ...existing,
            name: req.body.name || existing.name,
            age: req.body.age ? parseInt(req.body.age) : existing.age,
            height: req.body.height ? parseInt(req.body.height) : existing.height,
            bust: req.body.bust || existing.bust,
            waist: req.body.waist ? parseInt(req.body.waist) : existing.waist,
            hip: req.body.hip ? parseInt(req.body.hip) : existing.hip,
            description_ja: req.body.description_ja !== undefined ? req.body.description_ja : existing.description_ja,
            description_en: req.body.description_en !== undefined ? req.body.description_en : existing.description_en,
            description_zh: req.body.description_zh !== undefined ? req.body.description_zh : existing.description_zh,
            photos: newPhotos.length > 0 ? [...existing.photos, ...newPhotos] : existing.photos,
            status: req.body.status || existing.status
        };

        writeCasts(casts);
        return res.json({ success: true, cast: casts[idx] });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== DELETE /:id — キャスト削除 =====
router.delete('/:id', (req, res) => {
    try {
        let casts = readCasts();
        const idx = casts.findIndex(c => String(c.id) === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'キャストが見つかりません' });
        casts.splice(idx, 1);
        writeCasts(casts);
        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== PUT /:id/status — 出勤ステータス変更 =====
router.put('/:id/status', (req, res) => {
    try {
        const casts = readCasts();
        const idx = casts.findIndex(c => String(c.id) === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'キャストが見つかりません' });

        const validStatuses = ['出勤中', '待機中', '休み', '新人'];
        const newStatus = req.body.status;
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({ success: false, error: '無効なステータスです' });
        }

        casts[idx].status = newStatus;
        writeCasts(casts);
        return res.json({ success: true, cast: casts[idx] });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /:id/announce — 新人入店お知らせ =====
router.post('/:id/announce', async (req, res) => {
    try {
        const casts = readCasts();
        const cast = casts.find(c => String(c.id) === req.params.id);
        if (!cast) return res.status(404).json({ success: false, error: 'キャストが見つかりません' });

        // Claude APIで投稿文生成
        const posts = await claude.generateNewCastAnnouncement(cast);
        if (posts.error) return res.json({ success: false, error: posts.error });

        const imagePath = cast.photos && cast.photos.length > 0 ? cast.photos[0] : null;
        const results = [];

        // Telegram
        if (posts.telegram) {
            const r = await telegram.postToChannel(posts.telegram, imagePath);
            results.push({ platform: 'telegram', ...r });
        }

        // 投稿履歴に記録
        const history = readHistory();
        history.push({
            id: Date.now(),
            type: 'new_cast_announce',
            castId: cast.id,
            castName: cast.name,
            posts: posts,
            results: results,
            createdAt: new Date().toISOString()
        });
        writeHistory(history);

        return res.json({ success: true, posts, results });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
