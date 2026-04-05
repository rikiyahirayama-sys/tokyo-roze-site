// ============================================
// Telegram Bot サービス
// チャンネル投稿（テキスト・画像）
// Express / Next.js 両対応
// ============================================
const fs = require('fs');
const path = require('path');

// Next.js環境ではglobalThis.fetchを使用、Express環境ではnode-fetchにフォールバック
let _fetch;
try {
    _fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
    _fetch = globalThis.fetch;
}

// Next.js環境ではform-dataが不要な場合がある（画像投稿はfs.createReadStreamベースで行う）
let _FormData;
try {
    _FormData = require('form-data');
} catch (e) {
    _FormData = null;
}

// 環境変数を常に最新値で取得
function getToken() { return process.env.TELEGRAM_BOT_TOKEN || ''; }
function getChannelId() { return process.env.TELEGRAM_CHANNEL_ID || ''; }

// 再初期化（互換性用）
function reinitialize() { }

// Telegram API URL
function apiUrl(method) {
    return `https://api.telegram.org/bot${getToken()}/${method}`;
}

// チャンネルに投稿
async function postToChannel(text, imagePath) {
    try {
        // テキストの正規化（オブジェクト・配列・数値など文字列以外が渡された場合の対応）
        console.log(`[Telegram] postToChannel called, text type=${typeof text}, value=`, typeof text === 'string' ? text.substring(0, 30) : text);
        if (Array.isArray(text)) {
            text = text.map(t => {
                if (t && typeof t === 'object') return String(t.text || t.caption || JSON.stringify(t));
                return String(t || '');
            }).join('\n');
        } else if (text && typeof text === 'object') {
            const extracted = text.text || text.caption;
            text = (extracted && typeof extracted === 'string') ? extracted : JSON.stringify(text);
        }
        if (typeof text !== 'string') {
            text = (text !== null && text !== undefined) ? JSON.stringify(text) : '';
        }
        text = String(text).trim();
        console.log(`[Telegram] 投稿開始 text=${text.substring(0, 50)}...`);
        // 環境変数の読み込み確認
        const currentToken = getToken();
        const currentChannel = getChannelId();
        console.log(`[Telegram] Token=${currentToken ? currentToken.substring(0, 10) + '**(' + currentToken.length + ')' : 'NOT SET'}, Channel=${currentChannel || 'NOT SET'}`);
        if (!currentToken || !currentChannel) {
            console.error('[Telegram] Bot TokenまたはChannel ID未設定');
            return { success: false, error: 'Telegram Bot TokenまたはChannel IDが設定されていません' };
        }

        if (imagePath) {
            const fullPath = path.resolve(imagePath);
            if (fs.existsSync(fullPath) && _FormData) {
                // 画像付き投稿（form-dataが利用可能な場合のみ）
                const form = new _FormData();
                form.append('chat_id', currentChannel);
                form.append('caption', text);
                form.append('parse_mode', 'Markdown');
                form.append('photo', fs.createReadStream(fullPath));

                const res = await _fetch(apiUrl('sendPhoto'), { method: 'POST', body: form });
                const data = await res.json();
                if (!data.ok) {
                    console.error('[Telegram] 画像投稿エラー:', data.description);
                    return { success: false, error: data.description };
                }
                console.log(`[Telegram] 画像投稿成功 messageId=${data.result.message_id}`);
                return { success: true, messageId: String(data.result.message_id) };
            }
        }

        // テキストのみ投稿（Markdownパースエラー時はプレーンテキストで再試行）
        let res = await _fetch(apiUrl('sendMessage'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: currentChannel,
                text: text,
                parse_mode: 'Markdown'
            })
        });
        let data = await res.json();
        if (!data.ok && data.description && data.description.includes("can't parse")) {
            console.log('[Telegram] Markdownパースエラー、プレーンテキストで再試行');
            res = await _fetch(apiUrl('sendMessage'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: currentChannel,
                    text: text
                })
            });
            data = await res.json();
        }
        if (!data.ok) {
            console.error('[Telegram] API エラー:', data.error_code, data.description);
            return { success: false, error: `[${data.error_code}] ${data.description}` };
        }
        console.log(`[Telegram] 投稿成功 messageId=${data.result.message_id}`);
        return { success: true, messageId: String(data.result.message_id) };
    } catch (e) {
        console.error('[Telegram] 投稿失敗:', e.message);
        return { success: false, error: e.message };
    }
}

// Bot情報取得（接続テスト用）
async function getMe() {
    try {
        if (!getToken()) {
            return { success: false, error: 'Telegram Bot Tokenが設定されていません' };
        }
        const res = await _fetch(apiUrl('getMe'));
        const data = await res.json();
        if (!data.ok) return { success: false, error: data.description };
        return { success: true, data: data.result };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { postToChannel, getMe, reinitialize };
