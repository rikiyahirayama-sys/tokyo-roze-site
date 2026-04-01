// ============================================
// Tokyo Rendaire 管理サーバー
// Express + 静的ファイル + API
// ============================================
try { require('dotenv').config(); } catch (e) { }

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ミドルウェア =====
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(session({
    secret: process.env.ADMIN_SESSION_SECRET || 'tokyo-rendaire-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24時間
}));

// ===== 静的ファイル配信 =====
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/blog', express.static(path.join(__dirname, 'blog')));

// ===== APIルーティング =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/auth'));
app.use('/api/cast', require('./routes/cast'));
app.use('/api/sns', require('./routes/sns'));
app.use('/api/blog', require('./routes/blog'));

// ===== 予約投稿スケジューラー復元 =====
const scheduler = require('./services/scheduler');
scheduler.restore();

// ===== API 404ハンドラー（HTMLではなくJSONを返す） =====
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// ===== APIエラーハンドラー（HTMLではなくJSONを返す） =====
app.use('/api', (err, req, res, next) => {
    console.error('[API Error]', err.message);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ===== サーバー起動 =====
const server = app.listen(PORT);
server.on('listening', () => {
    console.log('✅ Tokyo Rendaire 管理サーバー起動');
    console.log('📄 LP: http://localhost:' + PORT);
    console.log('⚙️  管理画面: http://localhost:' + PORT + '/admin.html');
    // 環境変数の読み込み状態を表示
    console.log('🔑 ENV check:', {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ missing',
        TWITTER_API_KEY: process.env.TWITTER_API_KEY ? '✓ set' : '✗ missing',
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✓ set' : '✗ missing',
        GITHUB_TOKEN: process.env.GITHUB_TOKEN ? '✓ set' : '✗ missing',
        ADMIN_ID: process.env.ADMIN_ID ? '✓ set' : '✗ missing',
    });
});
