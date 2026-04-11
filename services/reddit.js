// ============================================
// Reddit 投稿サービス
// サブレディットへの自動投稿（集客用）
// ============================================

let _fetch;
try {
    _fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
    _fetch = globalThis.fetch;
}

// 環境変数
function getClientId() { return process.env.REDDIT_CLIENT_ID || ''; }
function getClientSecret() { return process.env.REDDIT_CLIENT_SECRET || ''; }
function getUsername() { return process.env.REDDIT_USERNAME || ''; }
function getPassword() { return process.env.REDDIT_PASSWORD || ''; }
function getUserAgent() { return process.env.REDDIT_USER_AGENT || 'TokyoRoze/1.0'; }

// アクセストークン管理
let accessToken = null;
let tokenExpiry = 0;

// OAuth2トークン取得
async function getAccessToken() {
    const now = Date.now();
    if (accessToken && now < tokenExpiry) return accessToken;

    const clientId = getClientId();
    const clientSecret = getClientSecret();
    const username = getUsername();
    const password = getPassword();

    if (!clientId || !clientSecret || !username || !password) {
        throw new Error('Reddit API認証情報が設定されていません（REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD）');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await _fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': getUserAgent()
        },
        body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    });

    const data = await res.json();
    if (data.error) {
        throw new Error(`Reddit認証エラー: ${data.error} - ${data.message || ''}`);
    }

    accessToken = data.access_token;
    tokenExpiry = now + (data.expires_in - 60) * 1000; // 1分前に失効扱い
    return accessToken;
}

// サブレディットにテキスト投稿
async function postToSubreddit(subreddit, title, text) {
    try {
        const token = await getAccessToken();

        console.log(`[Reddit] 投稿開始 r/${subreddit}: ${title.substring(0, 50)}...`);

        const res = await _fetch('https://oauth.reddit.com/api/submit', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': getUserAgent()
            },
            body: new URLSearchParams({
                api_type: 'json',
                kind: 'self',
                sr: subreddit,
                title: title,
                text: text,
                resubmit: 'true'
            }).toString()
        });

        const data = await res.json();
        const result = data.json;

        if (result && result.errors && result.errors.length > 0) {
            const errMsg = result.errors.map(e => e.join(': ')).join(', ');
            console.error(`[Reddit] 投稿エラー r/${subreddit}:`, errMsg);
            return { success: false, error: errMsg };
        }

        const postUrl = result && result.data ? result.data.url : '';
        console.log(`[Reddit] 投稿成功 r/${subreddit}: ${postUrl}`);
        return { success: true, url: postUrl, id: result?.data?.id || '' };
    } catch (e) {
        console.error(`[Reddit] 投稿失敗 r/${subreddit}:`, e.message);
        return { success: false, error: e.message };
    }
}

// リンク投稿（URL共有）
async function postLink(subreddit, title, url) {
    try {
        const token = await getAccessToken();

        console.log(`[Reddit] リンク投稿 r/${subreddit}: ${title.substring(0, 50)}...`);

        const res = await _fetch('https://oauth.reddit.com/api/submit', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': getUserAgent()
            },
            body: new URLSearchParams({
                api_type: 'json',
                kind: 'link',
                sr: subreddit,
                title: title,
                url: url,
                resubmit: 'true'
            }).toString()
        });

        const data = await res.json();
        const result = data.json;

        if (result && result.errors && result.errors.length > 0) {
            const errMsg = result.errors.map(e => e.join(': ')).join(', ');
            console.error(`[Reddit] リンク投稿エラー r/${subreddit}:`, errMsg);
            return { success: false, error: errMsg };
        }

        const postUrl = result && result.data ? result.data.url : '';
        console.log(`[Reddit] リンク投稿成功 r/${subreddit}: ${postUrl}`);
        return { success: true, url: postUrl, id: result?.data?.id || '' };
    } catch (e) {
        console.error(`[Reddit] リンク投稿失敗 r/${subreddit}:`, e.message);
        return { success: false, error: e.message };
    }
}

// 接続テスト
async function testConnection() {
    try {
        const token = await getAccessToken();
        const res = await _fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': getUserAgent()
            }
        });
        const data = await res.json();
        if (data.name) {
            return { success: true, username: data.name, karma: data.link_karma };
        }
        return { success: false, error: 'アカウント情報取得失敗' };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { postToSubreddit, postLink, testConnection };
