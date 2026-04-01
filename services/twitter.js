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
    if (process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET &&
        process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_ACCESS_SECRET) {
        clientEN = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_SECRET,
        });
    }

    // 日本語アカウント
    if (process.env.TWITTER_API_KEY_JA && process.env.TWITTER_API_SECRET_JA &&
        process.env.TWITTER_ACCESS_TOKEN_JA && process.env.TWITTER_ACCESS_SECRET_JA) {
        clientJA = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY_JA,
            appSecret: process.env.TWITTER_API_SECRET_JA,
            accessToken: process.env.TWITTER_ACCESS_TOKEN_JA,
            accessSecret: process.env.TWITTER_ACCESS_SECRET_JA,
        });
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
        console.error(`[Twitter] 投稿失敗 account=${account}:`, e.message);
        return { success: false, error: e.message };
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
