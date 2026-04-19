// ============================================
// GitHub サービス
// ブログ記事のデプロイ（REST API経由）
// ============================================
const fetch = require('node-fetch');

let GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
let GITHUB_REPO = process.env.GITHUB_REPO || '';

// 再初期化
function reinitialize() {
    GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
    GITHUB_REPO = process.env.GITHUB_REPO || '';
}

// GitHub API ベースURL
function apiUrl(filePath) {
    return `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
}

// 認証ヘッダー
function headers() {
    return {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Tokyo-Roze-Admin'
    };
}

// ファイルをリポジトリにプッシュ（作成 or 更新）
async function pushFile(filePath, content, commitMessage) {
    try {
        if (!GITHUB_TOKEN || !GITHUB_REPO) {
            return { success: false, error: 'GitHub TokenまたはRepo名が設定されていません' };
        }

        // 既存ファイルのSHAを取得（更新時に必要）
        let sha = null;
        try {
            const existing = await fetch(apiUrl(filePath), { headers: headers() });
            if (existing.ok) {
                const data = await existing.json();
                sha = data.sha;
            }
        } catch (_) {
            // ファイルが存在しない場合は新規作成
        }

        const body = {
            message: commitMessage || `Update ${filePath}`,
            content: Buffer.from(content, 'utf-8').toString('base64')
        };
        if (sha) body.sha = sha;

        const res = await fetch(apiUrl(filePath), {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.message };
        return { success: true, url: data.content.html_url };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ファイル削除
async function deleteFile(filePath, commitMessage) {
    try {
        if (!GITHUB_TOKEN || !GITHUB_REPO) {
            return { success: false, error: 'GitHub TokenまたはRepo名が設定されていません' };
        }

        // SHA取得
        const existing = await fetch(apiUrl(filePath), { headers: headers() });
        if (!existing.ok) return { success: false, error: 'ファイルが見つかりません' };
        const data = await existing.json();

        const res = await fetch(apiUrl(filePath), {
            method: 'DELETE',
            headers: headers(),
            body: JSON.stringify({
                message: commitMessage || `Delete ${filePath}`,
                sha: data.sha
            })
        });
        if (!res.ok) {
            const err = await res.json();
            return { success: false, error: err.message };
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// リポジトリ情報取得（接続テスト用）
async function getRepoInfo() {
    try {
        if (!GITHUB_TOKEN || !GITHUB_REPO) {
            return { success: false, error: 'GitHub TokenまたはRepo名が設定されていません' };
        }
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, { headers: headers() });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.message };
        return { success: true, data: { name: data.full_name, url: data.html_url } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { pushFile, deleteFile, getRepoInfo, reinitialize };
