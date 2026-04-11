// ============================================
// Google Business Profile 投稿サービス
// ビジネスプロフィールへの自動投稿
// Google Business Profile API v1 使用
// ============================================

let _fetch;
try {
    _fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
    _fetch = globalThis.fetch;
}

// 環境変数
function getAccessToken() { return process.env.GBP_ACCESS_TOKEN || ''; }
function getRefreshToken() { return process.env.GBP_REFRESH_TOKEN || ''; }
function getClientId() { return process.env.GBP_CLIENT_ID || ''; }
function getClientSecret() { return process.env.GBP_CLIENT_SECRET || ''; }
function getLocationId() { return process.env.GBP_LOCATION_ID || ''; }
// locationId format: "locations/XXXXXXXXXXXXXXXXXX" or "accounts/XXX/locations/XXX"

let cachedToken = null;
let tokenExpiry = 0;

// OAuth2トークンリフレッシュ
async function refreshAccessToken() {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) return cachedToken;

    const refreshToken = getRefreshToken();
    const clientId = getClientId();
    const clientSecret = getClientSecret();

    if (!refreshToken || !clientId || !clientSecret) {
        throw new Error('Google Business Profile認証情報が設定されていません（GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN）');
    }

    const res = await _fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret
        }).toString()
    });

    const data = await res.json();
    if (data.error) {
        throw new Error(`GBPトークンリフレッシュエラー: ${data.error} - ${data.error_description || ''}`);
    }

    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in - 60) * 1000;
    return cachedToken;
}

// 有効なアクセストークンを取得（直接設定 or リフレッシュ）
async function getValidToken() {
    const directToken = getAccessToken();
    if (directToken && !getRefreshToken()) return directToken;
    return await refreshAccessToken();
}

// ビジネスプロフィールにローカル投稿を作成
// topicType: "STANDARD", "EVENT", "OFFER"
async function createPost(text, topicType = 'STANDARD', callToAction = null) {
    try {
        const token = await getValidToken();
        const locationId = getLocationId();

        if (!locationId) {
            return { success: false, error: 'GBP_LOCATION_IDが設定されていません' };
        }

        console.log(`[GBP] 投稿開始 (${topicType}): ${text.substring(0, 50)}...`);

        const postBody = {
            languageCode: 'en',
            topicType: topicType,
            summary: text
        };

        // CTA（Call to Action）追加
        if (callToAction) {
            postBody.callToAction = callToAction;
        } else {
            // デフォルトCTA: サイトへ誘導
            postBody.callToAction = {
                actionType: 'LEARN_MORE',
                url: process.env.SITE_URL || 'https://tokyoroze.com'
            };
        }

        const apiUrl = `https://mybusiness.googleapis.com/v4/${locationId}/localPosts`;

        const res = await _fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postBody)
        });

        const data = await res.json();

        if (data.error) {
            console.error('[GBP] 投稿エラー:', data.error.message || data.error);
            return { success: false, error: data.error.message || JSON.stringify(data.error) };
        }

        console.log(`[GBP] 投稿成功 name=${data.name}`);
        return { success: true, postId: data.name, url: data.searchUrl || '' };
    } catch (e) {
        console.error('[GBP] 投稿失敗:', e.message);
        return { success: false, error: e.message };
    }
}

// イベント投稿（期間限定キャンペーン等）
async function createEventPost(title, text, startDate, endDate) {
    try {
        const token = await getValidToken();
        const locationId = getLocationId();

        if (!locationId) {
            return { success: false, error: 'GBP_LOCATION_IDが設定されていません' };
        }

        const postBody = {
            languageCode: 'en',
            topicType: 'EVENT',
            summary: text,
            event: {
                title: title,
                schedule: {
                    startDate: formatGBPDate(startDate),
                    endDate: formatGBPDate(endDate)
                }
            },
            callToAction: {
                actionType: 'LEARN_MORE',
                url: process.env.SITE_URL || 'https://tokyoroze.com'
            }
        };

        const apiUrl = `https://mybusiness.googleapis.com/v4/${locationId}/localPosts`;

        const res = await _fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postBody)
        });

        const data = await res.json();
        if (data.error) {
            return { success: false, error: data.error.message || JSON.stringify(data.error) };
        }
        return { success: true, postId: data.name };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// 日付をGBP API形式に変換
function formatGBPDate(dateStr) {
    const d = new Date(dateStr);
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate()
    };
}

// 接続テスト（ロケーション情報を取得）
async function testConnection() {
    try {
        const token = await getValidToken();
        const locationId = getLocationId();

        if (!locationId) {
            return { success: false, error: 'GBP_LOCATION_IDが設定されていません' };
        }

        const res = await _fetch(`https://mybusiness.googleapis.com/v4/${locationId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.error) {
            return { success: false, error: data.error.message || JSON.stringify(data.error) };
        }

        return {
            success: true,
            name: data.locationName || data.name,
            address: data.address?.formattedAddress || ''
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { createPost, createEventPost, testConnection };
