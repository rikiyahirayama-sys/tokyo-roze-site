// ============================================
// コンテンツフィルター — X凍結防止用
// 投稿前にNGワードを検出・置換する
// ============================================

// NGワードリスト（大文字小文字区別なし）
const BLOCKED_WORDS = [
    // 英語
    'escort', 'escorts', 'call girl', 'callgirl', 'prostitut', 'sex work',
    'sexual service', 'adult service', 'adult entertainment',
    'erotic', 'sensual massage', 'happy ending', 'full service',
    'GFE', 'girlfriend experience', 'outcall', 'incall',
    // 日本語
    'デリヘル', 'ソープ', 'ヘルス', 'ピンサロ', '風俗', 'オナクラ',
    '本番', 'NN', 'NS', 'AF', 'エロ', 'アダルト',
    'セクシー', '性的', '売春', '援交', '円光', 'パパ活',
    // ハッシュタグ系
    '#風俗求人', '#デリヘル求人', '#デリヘル', '#風俗',
    '#escort', '#tokyoescort', '#adultservice',
];

// 警告ワードリスト（ブロックはしないがログ警告を出す）
const WARN_WORDS = [
    'companion', 'lady', 'ladies', 'girl', 'beautiful girl',
    'キャスト', 'コンパニオン', '夜の仕事', 'ナイトワーク',
    'バック率', '日給', '高収入',
];

// 安全な置換マップ
const REPLACE_MAP = {
    'escort service': 'hospitality service',
    'escort': 'concierge',
    'デリヘル': 'プレミアムサービス',
    '風俗': 'ナイトコンシェルジュ',
    'ソープ': 'プレミアムサービス',
    'キャスト': 'メンバー',
    'outcall': 'visit',
    'incall': 'appointment',
    '#風俗求人': '#高収入求人',
    '#デリヘル求人': '#ナイトワーク求人',
    '#デリヘル': '#六本木',
    '#風俗': '#東京',
    '#TokyoEscort': '#TokyoRoze',
    '#tokyoescort': '#TokyoRoze',
};

/**
 * テキストにNGワードが含まれているかチェック
 * @returns {{ safe: boolean, blocked: string[], warnings: string[] }}
 */
function checkContent(text) {
    if (!text || typeof text !== 'string') return { safe: true, blocked: [], warnings: [] };

    const lower = text.toLowerCase();
    const blocked = [];
    const warnings = [];

    for (const word of BLOCKED_WORDS) {
        if (lower.includes(word.toLowerCase())) {
            blocked.push(word);
        }
    }

    for (const word of WARN_WORDS) {
        if (lower.includes(word.toLowerCase())) {
            warnings.push(word);
        }
    }

    return {
        safe: blocked.length === 0,
        blocked,
        warnings,
    };
}

/**
 * テキスト内のNGワードを安全な表現に自動置換
 * @returns {{ text: string, replacements: string[] }}
 */
function sanitizeContent(text) {
    if (!text || typeof text !== 'string') return { text: text || '', replacements: [] };

    let result = text;
    const replacements = [];

    // 置換マップを適用（長いキーから順に）
    const sortedKeys = Object.keys(REPLACE_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        const regex = new RegExp(escapeRegex(key), 'gi');
        if (regex.test(result)) {
            replacements.push(`"${key}" → "${REPLACE_MAP[key]}"`);
            result = result.replace(regex, REPLACE_MAP[key]);
        }
    }

    return { text: result, replacements };
}

/**
 * 投稿オブジェクト全体をフィルタリング
 * twitter_en, twitter_ja, telegram の各フィールドをチェック・修正
 * @returns {{ posts: object, report: object }}
 */
function filterPosts(posts) {
    const report = { blocked: [], sanitized: [], warnings: [] };

    function processField(platform, content) {
        if (typeof content === 'string') {
            const check = checkContent(content);
            if (!check.safe) {
                const { text, replacements } = sanitizeContent(content);
                report.sanitized.push({ platform, replacements });
                // 再チェック
                const recheck = checkContent(text);
                if (!recheck.safe) {
                    report.blocked.push({ platform, words: recheck.blocked });
                    console.warn(`[ContentFilter] ⚠️ ${platform}: 置換後もNGワードが残っています:`, recheck.blocked);
                }
                return text;
            }
            if (check.warnings.length > 0) {
                report.warnings.push({ platform, words: check.warnings });
            }
            return content;
        }
        if (Array.isArray(content)) {
            return content.map((item, i) => {
                if (typeof item === 'string') return processField(`${platform}[${i}]`, item);
                if (item && typeof item === 'object' && item.text) {
                    return { ...item, text: processField(`${platform}[${i}]`, item.text) };
                }
                return item;
            });
        }
        return content;
    }

    const filtered = {};
    for (const [key, value] of Object.entries(posts)) {
        filtered[key] = processField(key, value);
    }

    // レポートをログ出力
    if (report.sanitized.length > 0) {
        console.log('[ContentFilter] 🔄 NGワード置換:', JSON.stringify(report.sanitized));
    }
    if (report.blocked.length > 0) {
        console.error('[ContentFilter] 🚫 ブロック:', JSON.stringify(report.blocked));
    }

    return { posts: filtered, report };
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { checkContent, sanitizeContent, filterPosts, BLOCKED_WORDS };
