// ============================================
// 認証・設定 API
// ログイン / パスワード変更 / .env設定管理
// ============================================
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const claude = require('../services/claude');
const twitter = require('../services/twitter');
const telegram = require('../services/telegram');
const github = require('../services/github');

// .envファイルをパースして読み込む（Render.com対応: .envがなければprocess.envから取得）
const ENV_KEYS = [
    'ADMIN_ID', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'PORT', 'SITE_URL',
    'ANTHROPIC_API_KEY',
    'TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET',
    'TWITTER_API_KEY_JA', 'TWITTER_API_SECRET_JA', 'TWITTER_ACCESS_TOKEN_JA', 'TWITTER_ACCESS_SECRET_JA',
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID',
    'GITHUB_TOKEN', 'GITHUB_REPO'
];

function readEnv() {
    // まず.envファイルから読む
    const env = {};
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const idx = trimmed.indexOf('=');
            if (idx === -1) return;
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim();
            env[key] = val;
        });
    }
    // .envに無いキーはprocess.envから補完（Render.com等のホスティング環境対応）
    ENV_KEYS.forEach(key => {
        if (!env[key] && process.env[key]) {
            env[key] = process.env[key];
        }
    });
    return env;
}

// .envファイルに書き込む
function writeEnv(envObj) {
    const lines = Object.entries(envObj).map(([k, v]) => `${k}=${v}`);
    fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');
    // process.envも更新
    Object.entries(envObj).forEach(([k, v]) => { process.env[k] = v; });
}

// 値をマスク表示
function maskValue(val) {
    if (!val || val.length === 0) return '';
    if (val.length <= 4) return val;
    return val.substring(0, 4) + '•'.repeat(Math.min(val.length - 4, 20));
}

// ===== POST /login =====
router.post('/login', (req, res) => {
    const { id, password } = req.body;
    const env = readEnv();
    const adminId = process.env.ADMIN_ID || env.ADMIN_ID || '';
    const adminPw = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || 'changethispassword';
    console.log('[DEBUG LOGIN] input id:', JSON.stringify(id), 'expected:', JSON.stringify(adminId));
    console.log('[DEBUG LOGIN] input pw:', JSON.stringify(password), 'expected:', JSON.stringify(adminPw));
    if (id === adminId && password === adminPw) {
        req.session.isAdmin = true;
        return res.json({ success: true });
    }
    return res.status(401).json({ success: false, error: 'IDまたはパスワードが正しくありません' });
});

// ===== POST /change-password =====
router.post('/change-password', (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const env = readEnv();
    const adminPw = env.ADMIN_PASSWORD || 'changethispassword';

    if (currentPassword !== adminPw) {
        return res.status(401).json({ success: false, error: '現在のパスワードが正しくありません' });
    }
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'パスワードは6文字以上にしてください' });
    }

    env.ADMIN_PASSWORD = newPassword;
    writeEnv(env);
    return res.json({ success: true, message: 'パスワードを変更しました' });
});

// ===== GET /settings =====
router.get('/settings', (req, res) => {
    const env = readEnv();
    const masked = {};
    Object.entries(env).forEach(([key, val]) => {
        // パスワード以外はマスク、PORT/URLはそのまま
        if (key === 'PORT' || key === 'SITE_URL') {
            masked[key] = val;
        } else {
            masked[key] = maskValue(val);
        }
    });
    return res.json({ success: true, settings: masked });
});

// ===== POST /settings =====
router.post('/settings', (req, res) => {
    const env = readEnv();
    const updates = req.body;

    Object.entries(updates).forEach(([key, val]) => {
        // マスク値（•を含む）は更新しない
        if (typeof val === 'string' && val.includes('•')) return;
        env[key] = val;
    });

    writeEnv(env);

    // 該当サービスを再初期化
    claude.reinitialize();
    twitter.reinitialize();
    telegram.reinitialize();
    github.reinitialize();

    return res.json({ success: true, message: '設定を保存しました' });
});

// ===== POST /settings/test =====
router.post('/settings/test', async (req, res) => {
    const { service } = req.body;
    console.log(`[Auth] /settings/test called, service=${service}`);

    try {
        switch (service) {
            case 'twitter_en': {
                const result = await twitter.verifyCredentials('en');
                if (result.success) return res.json({ success: true, message: '接続成功（テストツイート投稿・削除OK）' });
                return res.json({ success: false, message: `エラー: ${result.error}` });
            }
            case 'twitter_ja': {
                const result = await twitter.verifyCredentials('ja');
                if (result.success) return res.json({ success: true, message: '接続成功（テストツイート投稿・削除OK）' });
                return res.json({ success: false, message: `エラー: ${result.error}` });
            }
            case 'telegram': {
                const result = await telegram.getMe();
                if (result.success) return res.json({ success: true, message: `接続成功: @${result.data.username}` });
                return res.json({ success: false, message: `エラー: ${result.error}` });
            }
            case 'claude': {
                try {
                    const Anthropic = require('@anthropic-ai/sdk');
                    if (!process.env.ANTHROPIC_API_KEY) {
                        return res.json({ success: false, message: 'エラー: APIキーが設定されていません' });
                    }
                    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
                    await client.messages.create({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 10,
                        messages: [{ role: 'user', content: 'test' }]
                    });
                    return res.json({ success: true, message: '接続成功' });
                } catch (e) {
                    return res.json({ success: false, message: `エラー: ${e.message}` });
                }
            }
            case 'github': {
                const result = await github.getRepoInfo();
                if (result.success) return res.json({ success: true, message: `接続成功: ${result.data.name}` });
                return res.json({ success: false, message: `エラー: ${result.error}` });
            }
            default:
                return res.status(400).json({ success: false, message: '不明なサービスです' });
        }
    } catch (e) {
        return res.json({ success: false, message: `エラー: ${e.message}` });
    }
});

module.exports = router;
