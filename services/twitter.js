// ============================================
// Twitter(X) 投稿サービス
// 英語アカウント・日本語アカウントの2系統
// ============================================
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

let clientEN = null;
let clientJA = null;

// クライアント初期化
function initClients() {
    // 英語アカウント
    const enKey = (process.env.TWITTER_API_KEY || '').trim();
    const enSecret = (process.env.TWITTER_API_SECRET || '').trim();
    const enAccessToken = (process.env.TWITTER_ACCESS_TOKEN || '').trim();
    const enAccessSecret = (process.env.TWITTER_ACCESS_SECRET || '').trim();

    console.log('[Twitter] ENV check EN:', {
        TWITTER_API_KEY: enKey ? enKey.substring(0, 4) + '****(' + enKey.length + ')' : 'NOT SET',
        TWITTER_API_SECRET: enSecret ? enSecret.substring(0, 4) + '****(' + enSecret.length + ')' : 'NOT SET',
        TWITTER_ACCESS_TOKEN: enAccessToken ? enAccessToken.substring(0, 4) + '****(' + enAccessToken.length + ')' : 'NOT SET',
        TWITTER_ACCESS_SECRET: enAccessSecret ? enAccessSecret.substring(0, 4) + '****(' + enAccessSecret.length + ')' : 'NOT SET',
    });

    if (enKey && enSecret && enAccessToken && enAccessSecret) {
        clientEN = new TwitterApi({
            appKey: enKey,
            appSecret: enSecret,
            accessToken: enAccessToken,
            accessSecret: enAccessSecret,
        });
        console.log('[Twitter] ENクライアント初期化完了');
    } else {
        console.warn('[Twitter] ENクライアント: 環境変数不足のため初期化スキップ');
    }

    // 日本語アカウント
    const jaKey = (process.env.TWITTER_API_KEY_JA || '').trim();
    const jaSecret = (process.env.TWITTER_API_SECRET_JA || '').trim();
    const jaAccessToken = (process.env.TWITTER_ACCESS_TOKEN_JA || '').trim();
    const jaAccessSecret = (process.env.TWITTER_ACCESS_SECRET_JA || '').trim();

    console.log('[Twitter] ENV check JA:', {
        TWITTER_API_KEY_JA: jaKey ? jaKey.substring(0, 4) + '****(' + jaKey.length + ')' : 'NOT SET',
        TWITTER_API_SECRET_JA: jaSecret ? jaSecret.substring(0, 4) + '****(' + jaSecret.length + ')' : 'NOT SET',
        TWITTER_ACCESS_TOKEN_JA: jaAccessToken ? jaAccessToken.substring(0, 4) + '****(' + jaAccessToken.length + ')' : 'NOT SET',
        TWITTER_ACCESS_SECRET_JA: jaAccessSecret ? jaAccessSecret.substring(0, 4) + '****(' + jaAccessSecret.length + ')' : 'NOT SET',
    });

    if (jaKey && jaSecret && jaAccessToken && jaAccessSecret) {
        clientJA = new TwitterApi({
            appKey: jaKey,
            appSecret: jaSecret,
            accessToken: jaAccessToken,
            accessSecret: jaAccessSecret,
        });
        console.log('[Twitter] JAクライアント初期化完了');
    } else {
        console.warn('[Twitter] JAクライアント: 環境変数不足のため初期化スキップ');
    }
}
initClients();

// 再初期化
function reinitialize() {
    clientEN = null;
    clientJA = null;
    initClients();
}

// アカウント選択
function getClient(account) {
    if (account === 'ja') return clientJA;
    return clientEN;
}

// ツイート投稿
async function postTweet(text, imagePath, account = 'en') {
    try {
        // テキストの正規化
        if (text && typeof text === 'object') {
            text = text.text || text.caption || JSON.stringify(text);
        }
        text = String(text || '').trim();
        console.log(`[Twitter] 投稿開始 account=${account} text=${text.substring(0, 50)}...`);
        const tw = getClient(account);
        if (!tw) {
            console.error(`[Twitter] ${account}アカウント未設定`);
            return { success: false, error: `Twitter ${account}アカウントが設定されていません` };
        }

        let mediaId = null;
        if (imagePath) {
            const fullPath = path.resolve(imagePath);
            if (fs.existsSync(fullPath)) {
                console.log(`[Twitter] 画像アップロード: ${fullPath}`);
                mediaId = await tw.v1.uploadMedia(fullPath);
            }
        }

        const params = mediaId ? { media: { media_ids: [mediaId] } } : {};
        const result = await tw.v2.tweet(text, params);
        console.log(`[Twitter] 投稿成功 account=${account} tweetId=${result.data.id}`);
        return { success: true, tweetId: result.data.id };
    } catch (e) {
        // X APIエラーの詳細を出力
        const code = e.code || e.statusCode || '';
        const data = e.data ? JSON.stringify(e.data) : '';
        const rateLimit = e.rateLimit ? JSON.stringify(e.rateLimit) : '';
        console.error(`[Twitter] 投稿失敗 account=${account}:`, e.message);
        if (code) console.error(`[Twitter] エラーコード: ${code}`);
        if (data) console.error(`[Twitter] レスポンスデータ: ${data}`);
        if (rateLimit) console.error(`[Twitter] レートリミット: ${rateLimit}`);
        // よくあるエラーの日本語説明を付加
        let detail = e.message;
        if (e.code === 403 || e.statusCode === 403) {
            detail += ' （権限エラー: X Developer PortalでApp permissionsがRead and Writeになっているか確認し、Access Tokenを再生成してください）';
        } else if (e.code === 429 || e.statusCode === 429) {
            detail += ' （レートリミット: しばらく待ってから再試行してください）';
        } else if (e.code === 401 || e.statusCode === 401) {
            detail += ' （認証エラー: API Key/Secretが正しいか確認してください）';
        }
        return { success: false, error: detail };
    }
}

// ツイート削除
async function deleteTweet(tweetId, account = 'en') {
    try {
        const tw = getClient(account);
        if (!tw) {
            return { success: false, error: `Twitter ${account}アカウントが設定されていません` };
        }
        await tw.v2.deleteTweet(tweetId);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// 接続確認
async function verifyCredentials(account = 'en') {
    try {
        const tw = getClient(account);
        if (!tw) {
            return { success: false, error: `Twitter ${account}アカウントが設定されていません` };
        }
        const me = await tw.v2.me();
        return { success: true, data: me.data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { postTweet, deleteTweet, verifyCredentials, reinitialize };
