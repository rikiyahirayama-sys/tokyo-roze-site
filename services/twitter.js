// ============================================
// Twitter(X) 投稿サービス
// 英語アカウント・日本語アカウントの2系統
// ⚠️ アカウント凍結時は自動スキップ
// ============================================
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

// アカウント凍結フラグ — trueの間は全投稿をスキップ
let suspended = true; // 2026-04-08: @Tokyo_Rendaire アカウント凍結により無効化

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

// アカウント選択（未初期化の場合は再初期化を試みる）
function getClient(account) {
    // Next.js環境ではモジュールキャッシュが効かない場合がある。
    // クライアントがnullなら再初期化を試みる
    if (!clientEN && !clientJA) {
        console.log('[Twitter] getClient: clients not initialized, re-initializing...');
        initClients();
    }
    if (account === 'ja') return clientJA;
    return clientEN;
}

// ツイート投稿
async function postTweet(text, imagePath, account = 'en') {
    if (suspended) {
        console.log(`[Twitter] ⚠️ アカウント凍結中のためスキップ account=${account}`);
        return { success: false, error: 'X(Twitter)アカウントが凍結中です。投稿をスキップしました。', suspended: true };
    }
    try {
        // テキストの正規化
        if (Array.isArray(text)) {
            text = text.map(t => (t && typeof t === 'object') ? String(t.text || t.caption || JSON.stringify(t)) : String(t || '')).join('\n');
        } else if (text && typeof text === 'object') {
            const extracted = text.text || text.caption;
            text = (extracted && typeof extracted === 'string') ? extracted : JSON.stringify(text);
        }
        if (typeof text !== 'string') {
            text = (text !== null && text !== undefined) ? JSON.stringify(text) : '';
        }
        text = String(text).trim();
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
        return { success: true, tweetId: result.data.id, account };
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
        if (e.code === 402 || e.statusCode === 402) {
            detail += ' （課金エラー: X API Free planではツイート投稿に制限があります。Developer PortalでBasicプラン以上にアップグレードしてください）';
        } else if (e.code === 403 || e.statusCode === 403) {
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
    if (suspended) {
        return { success: false, error: 'X(Twitter)アカウントが凍結中です', suspended: true };
    }
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

// 接続確認（Freeプラン対応: v2.me()が使えないためtweet投稿→即削除で検証）
async function verifyCredentials(account = 'en') {
    if (suspended) {
        return { success: false, error: 'X(Twitter)アカウントが凍結中です', suspended: true };
    }
    try {
        const tw = getClient(account);
        if (!tw) {
            return { success: false, error: `Twitter ${account}アカウントが設定されていません` };
        }
        console.log(`[Twitter] verifyCredentials(${account}): posting test tweet...`);
        const testText = `🔧 API connection test - ${Date.now()}`;
        const result = await tw.v2.tweet(testText);
        const tweetId = result.data.id;
        console.log(`[Twitter] verifyCredentials(${account}): test tweet posted id=${tweetId}, deleting...`);
        await tw.v2.deleteTweet(tweetId);
        console.log(`[Twitter] verifyCredentials(${account}): test tweet deleted. Auth OK.`);
        return { success: true, data: { verified: true, account } };
    } catch (e) {
        console.error(`[Twitter] verifyCredentials(${account}) failed:`, e.message);
        return { success: false, error: e.message };
    }
}

// ===== ツイート指標取得（Twitter API v2） =====
async function fetchMetrics(tweetIds, account = 'en') {
    if (suspended) return { success: false, error: 'アカウント凍結中', suspended: true };
    try {
        const tw = getClient(account);
        if (!tw) return { success: false, error: `${account}アカウント未設定` };

        // 最大100件ずつ取得
        const ids = Array.isArray(tweetIds) ? tweetIds : [tweetIds];
        if (ids.length === 0) return { success: true, tweets: [] };

        const chunks = [];
        for (let i = 0; i < ids.length; i += 100) {
            chunks.push(ids.slice(i, i + 100));
        }

        const allTweets = [];
        for (const chunk of chunks) {
            const result = await tw.v2.tweets(chunk, {
                'tweet.fields': 'public_metrics,created_at',
            });
            if (result.data) {
                for (const tweet of result.data) {
                    const m = tweet.public_metrics || {};
                    allTweets.push({
                        id: tweet.id,
                        text: tweet.text,
                        createdAt: tweet.created_at,
                        impressions: m.impression_count || 0,
                        likes: m.like_count || 0,
                        retweets: m.retweet_count || 0,
                        replies: m.reply_count || 0,
                        quotes: m.quote_count || 0,
                        bookmarks: m.bookmark_count || 0,
                    });
                }
            }
        }
        return { success: true, tweets: allTweets };
    } catch (e) {
        console.error(`[Twitter] fetchMetrics(${account}) エラー:`, e.message);
        return { success: false, error: e.message };
    }
}

// ===== アカウント情報取得（フォロワー数等） =====
async function fetchAccountInfo(account = 'en') {
    if (suspended) return { success: false, error: 'アカウント凍結中', suspended: true };
    try {
        const tw = getClient(account);
        if (!tw) return { success: false, error: `${account}アカウント未設定` };

        const me = await tw.v2.me({ 'user.fields': 'public_metrics,created_at,description,profile_image_url' });
        const m = me.data.public_metrics || {};
        return {
            success: true,
            data: {
                id: me.data.id,
                username: me.data.username,
                name: me.data.name,
                followers: m.followers_count || 0,
                following: m.following_count || 0,
                tweets: m.tweet_count || 0,
                listed: m.listed_count || 0,
                createdAt: me.data.created_at,
                profileImage: me.data.profile_image_url,
            }
        };
    } catch (e) {
        console.error(`[Twitter] fetchAccountInfo(${account}) エラー:`, e.message);
        return { success: false, error: e.message };
    }
}

module.exports = { postTweet, deleteTweet, verifyCredentials, reinitialize, isSuspended: () => suspended, setSuspended: (v) => { suspended = !!v; }, fetchMetrics, fetchAccountInfo };
