// ============================================
// Claude AI サービス（Anthropic SDK）
// 投稿文生成・翻訳・ブログ記事生成
// ============================================
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-20250514';
let client = null;

// クライアント初期化
function initClient() {
    if (process.env.ANTHROPIC_API_KEY) {
        client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
}
initClient();

// 再初期化（設定変更時に呼ぶ）
function reinitialize() {
    client = null;
    initClient();
}

// Claude APIにリクエストを送る共通関数
async function ask(prompt, maxTokens = 4096) {
    if (!client) {
        throw new Error('Claude APIキーが設定されていません');
    }
    const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
    });
    return response.content[0].text;
}

// ===== X投稿コンテンツ安全ルール =====
const CONTENT_RULES = `
■ コンテンツ安全ルール（必ず遵守）:
- 「escort」「デリヘル」「風俗」「ソープ」「ヘルス」「性的」等のNGワードは絶対に使用禁止
- サービス内容の直接的な描写は禁止
- 身体的な特徴（3サイズ等）は記載しない
- 表現は「高級コンシェルジュ」「プレミアムホスピタリティ」「おもてなし」等の間接的な表現を使う
- ハッシュタグに業界用語は使わない（#デリヘル #風俗 #escort 等は禁止）
- 英語では「premium hospitality」「concierge」「companion service」「nightlife」等を使用
- 日本語では「おもてなし」「プレミアムサービス」「ナイトコンシェルジュ」等を使用
- 投稿はラグジュアリーライフスタイルブランドのトーンで書く
- URL掲載時はtokyoroze.comのみ使用
`;

// JSONレスポンスをパースする共通関数
async function askJSON(prompt, maxTokens = 4096) {
    const text = await ask(prompt, maxTokens);
    // JSON部分を抽出（ネストされた{}に対応）
    let depth = 0, start = -1, end = -1;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') { if (depth === 0) start = i; depth++; }
        else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (start === -1 || end === -1) throw new Error('JSON形式のレスポンスが取得できませんでした');
    return JSON.parse(text.substring(start, end + 1));
}

// ===== プロフィール翻訳 =====
async function translateProfile(japaneseText) {
    try {
        return await askJSON(`
以下の日本語プロフィール文を英語と中国語に翻訳してください。
自然で魅力的な表現にしてください。
JSON形式で返してください: { "en": "...", "zh": "..." }

日本語テキスト:
${japaneseText}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== 新人入店お知らせ =====
async function generateNewCastAnnouncement(castData) {
    try {
        return await askJSON(`
新しいスタッフ加入のSNS投稿文を生成してください。

スタッフ情報:
名前: ${castData.name}
年齢: ${castData.age}歳
身長: ${castData.height}cm
説明(日本語): ${castData.description_ja || ''}
説明(英語): ${castData.description_en || ''}

${CONTENT_RULES}

以下の3つの投稿文をJSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）。🌸 [name] joins our team! #TokyoRoze #Roppongi #Tokyo",
  "twitter_ja": "日本語ツイート（280字以内）。新メンバー🌹[name] #六本木 #東京",
  "telegram": "Telegram用（500〜800字）Markdown形式の詳細プロフィール"
}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== 本日の出勤一覧 =====
async function generateDailySchedule(onDutyCasts) {
    try {
        const castList = onDutyCasts.map(c => `${c.name}（${c.age}歳）`).join('\n');
        return await askJSON(`
本日出勤中のスタッフ一覧からSNS投稿文を生成してください。

出勤中スタッフ:
${castList || '（出勤スタッフなし）'}

${CONTENT_RULES}

以下の3つの投稿文をJSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）。Tonight's available members... #TokyoRoze #Roppongi",
  "twitter_ja": "日本語ツイート（280字以内）。本日ご案内可能なメンバー #六本木 #東京",
  "telegram": "Telegram用（500〜800字）Markdown形式"
}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== キャンペーン告知 =====
async function generateCampaign({ name, discount, period, description }) {
    try {
        return await askJSON(`
キャンペーン告知のSNS投稿文を生成してください。

キャンペーン名: ${name}
特典: ${discount}
期間: ${period}
説明: ${description}

${CONTENT_RULES}

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRoze #Tokyo",
  "twitter_ja": "日本語ツイート（280字以内）#六本木 #東京",
  "telegram": "Telegram用（500〜800字）Markdown形式"
}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== 口コミ紹介 =====
async function generateReviewPost({ reviewText, castName, rating }) {
    try {
        return await askJSON(`
匿名レビュー紹介のSNS投稿文を生成してください。
レビューは匿名化して紹介してください。

レビュー内容: ${reviewText}
スタッフ名: ${castName}
星数: ${rating}/5

${CONTENT_RULES}

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRoze #GuestReview #Tokyo",
  "twitter_ja": "日本語ツイート（280字以内）#六本木 #お客様の声",
  "telegram": "Telegram用（500〜800字）Markdown形式"
}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== 週末の空き状況 =====
async function generateWeekendAvailability({ availableCasts, notes }) {
    try {
        const castList = (availableCasts || []).map(c => `${c.name}`).join(', ');
        return await askJSON(`
週末の空き状況のSNS投稿文を生成してください。

ご案内可能なメンバー: ${castList || '情報なし'}
備考: ${notes || '特になし'}

${CONTENT_RULES}

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRoze #Weekend #Roppongi",
  "twitter_ja": "日本語ツイート（280字以内）#六本木 #週末",
  "telegram": "Telegram用（500〜800字）Markdown形式"
}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== メンバー復帰お知らせ =====
async function generateCastReturn(castData, message) {
    try {
        return await askJSON(`
メンバー復帰お知らせのSNS投稿文を生成してください。

名前: ${castData.name}
メッセージ: ${message || ''}

${CONTENT_RULES}

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRoze #Roppongi",
  "twitter_ja": "日本語ツイート（280字以内）#六本木 #東京",
  "telegram": "Telegram用（500〜800字）Markdown形式"
}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== 月間ランキング =====
async function generateMonthlyRanking(castRankingData) {
    try {
        const rankList = (castRankingData || []).map((c, i) => `${i + 1}位: ${c.name}`).join('\n');
        return await askJSON(`
月間人気ランキングのSNS投稿文を生成してください。

ランキング:
${rankList || '（データなし）'}

${CONTENT_RULES}

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRoze #Ranking #Tokyo",
  "twitter_ja": "日本語ツイート（280字以内）#六本木 #ランキング",
  "telegram": "Telegram用（500〜800字）Markdown形式"
}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== 営業告知 =====
async function generateAnnouncement({ title, content, period }) {
    try {
        return await askJSON(`
営業に関するお知らせのSNS投稿文を生成してください。

タイトル: ${title}
内容: ${content}
期間: ${period || ''}

${CONTENT_RULES}

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRoze #Tokyo",
  "twitter_ja": "日本語ツイート（280字以内）#六本木 #東京",
  "telegram": "Telegram用（500〜800字）Markdown形式"
}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== 週間投稿生成 =====
async function generateWeeklyPosts(topics) {
    try {
        const topicPrompt = topics
            ? `以下のトピックを使って: ${topics}`
            : 'TOKYO ROZE（六本木のラグジュアリーホスピタリティサービス）に関連するトピックを7つ自動生成して使ってください';

        return await askJSON(`
${topicPrompt}

1週間分（月〜日、毎日1本ずつ）のSNS投稿をJSON形式で生成してください:
{
  "telegram_en": [
    {"day": "月曜", "time": "07:00", "text": "英語Telegram投稿（500〜800字、Markdown形式）"},
    {"day": "火曜", "time": "12:00", "text": "..."},
    {"day": "水曜", "time": "07:00", "text": "..."},
    {"day": "木曜", "time": "21:00", "text": "..."},
    {"day": "金曜", "time": "12:00", "text": "..."},
    {"day": "土曜", "time": "09:00", "text": "..."},
    {"day": "日曜", "time": "18:00", "text": "..."}
  ],
  "telegram_ja": [
    {"day": "月曜", "time": "19:00", "type": "recruit", "text": "日本語求人Telegram投稿（500〜800字、Markdown形式）"},
    {"day": "火曜", "time": "19:00", "type": "recruit", "text": "..."},
    {"day": "水曜", "time": "19:00", "type": "recruit", "text": "..."},
    {"day": "木曜", "time": "19:00", "type": "recruit", "text": "..."},
    {"day": "金曜", "time": "19:00", "type": "recruit", "text": "..."},
    {"day": "土曜", "time": "19:00", "type": "recruit", "text": "..."},
    {"day": "日曜", "time": "19:00", "type": "customer", "text": "お客様向けTelegram投稿（500〜800字）"}
  ],
  "telegram": [
    {"day": "月曜", "time": "10:00", "text": "Telegram一般チャンネル投稿（500〜800字、Markdown形式）"},
    {"day": "火曜", "time": "14:00", "text": "..."},
    {"day": "水曜", "time": "10:00", "text": "..."},
    {"day": "木曜", "time": "14:00", "text": "..."},
    {"day": "金曜", "time": "10:00", "text": "..."},
    {"day": "土曜", "time": "10:00", "text": "..."},
    {"day": "日曜", "time": "14:00", "text": "..."}
  ],
  "reddit": [
    {"day": "月曜", "time": "08:00", "subreddit": "Tokyo", "title": "投稿タイトル（英語）", "text": "Reddit投稿本文（英語、200〜500字）"},
    {"day": "火曜", "time": "13:00", "subreddit": "JapanTravel", "title": "...", "text": "..."},
    {"day": "水曜", "time": "08:00", "subreddit": "japanlife", "title": "...", "text": "..."},
    {"day": "木曜", "time": "20:00", "subreddit": "Tokyo", "title": "...", "text": "..."},
    {"day": "金曜", "time": "13:00", "subreddit": "JapanTravel", "title": "...", "text": "..."},
    {"day": "土曜", "time": "11:00", "subreddit": "japanlife", "title": "...", "text": "..."},
    {"day": "日曜", "time": "16:00", "subreddit": "Tokyo", "title": "...", "text": "..."}
  ]
}

${CONTENT_RULES}

■ Telegram EN（telegram_en）の投稿ルール:
- 外国人のお客様向け。東京・六本木のナイトライフ、ラグジュアリー体験、おもてなし文化の紹介
- 英語で500〜800字、Markdown形式
- ホテルコンシェルジュが推薦するような上品なトーンで
- 「premium hospitality」「luxury concierge」「nightlife experience」等の安全な表現を使用
- tokyoroze.com へのリンクを適宜含める
- 「escort」「adult」「companion」等のNGワードは絶対に使わない

■ Telegram JA（telegram_ja）の投稿ルール:
- 7本中6本（月〜土）はスタッフ募集向け:
  内容：高報酬（業界トップクラスの還元率70〜80%）、自宅待機OK、翌日払い、罰金なし
  表現は「ナイトワーク」「高収入」「自由出勤」等を使う
  ⚠️ 禁止ワード：「デリヘル」「風俗」「ソープ」「ヘルス」「本番」
  type: "recruit"
- 7本中1本（日曜）は日本人のお客様向け:
  内容：六本木のラグジュアリーな夜、上質なおもてなし、特別な体験
  type: "customer"
- 500〜800字、Markdown形式

■ Telegram 一般チャンネル（telegram）の投稿ルール:
- 外国人のお客様向け。英語でTOKYO ROZEの詳細な紹介
- Markdown形式、500〜800字
- 「premium hospitality」「luxury concierge」等の安全な表現のみ使用

■ Reddit の投稿ルール:
- 外国人のお客様向け。英語で東京のナイトライフ・グルメ・文化の情報提供型投稿
- 各投稿にsubreddit（Tokyo, JapanTravel, japanlifeを巡回）、title、textフィールドが必須
- Redditのルール厳守: 宣伝色を極力抑え、有益な情報提供をメインにする
- 投稿本文の最後にさりげなくtokyoroze.comに触れる程度（例: "I found this through a local concierge service"）
- 直接的な広告・スパム的表現は絶対に使わない
- 「escort」「adult」等のNGワードは絶対に使わない
- タイトルは質問形式やTips形式が望ましい（例: "Best late-night experiences in Roppongi?"）
- 200〜500字

各プラットフォーム必ず7本（毎日1本）生成してください。
TOKYO ROZEは東京・六本木のプレミアムホスピタリティサービスです。
`, 16384);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== ブログ記事生成 =====
async function generateBlogArticle(topic) {
    try {
        const topicPrompt = topic
            ? `トピック: ${topic}`
            : 'TOKYO ROZE / 東京のナイトライフ / 六本木に関するSEOに強いトピックを自動提案して使ってください';

        console.log('[Claude] ブログ記事生成開始 topic:', topic || '(自動)');
        const result = await askJSON(`
${topicPrompt}

英語のSEOブログ記事をJSON形式で生成してください:
{
  "title": "記事タイトル（英語）",
  "slug": "url-friendly-slug",
  "meta": "メタディスクリプション（英語、160字以内）",
  "body": "HTML形式の記事本文（1500〜2500語、h2/h3見出し付き）"
}

${CONTENT_RULES}

記事の要件:
- 英語で執筆
- SEO最適化（キーワード自然配置）
- h2, h3タグで適切に構造化
- 本文中に自然な形でTOKYO ROZE（tokyoroze.com）への誘導を1〜2回含める
- 読者に価値のある情報を提供（東京旅行ガイド、六本木ナイトライフ、ラグジュアリー体験等）
- 「escort」「adult service」等のNGワードは使用禁止
- JSONのbody内のHTMLは1行にまとめてください（改行コードは使わず、pタグやbrタグで区切る）
`, 16384);
        console.log('[Claude] ブログ記事生成成功 title:', result.title);
        return result;
    } catch (e) {
        console.error('[Claude] ブログ記事生成エラー:', e.message);
        return { error: e.message };
    }
}

// ===== Googleしごと検索用 JobPosting JSON-LD 生成 =====
async function generateJobPosting(options = {}) {
    try {
        const hints = options.hints
            ? `以下のポイントを反映してください: ${options.hints}`
            : '効果的な求人内容を自動提案してください';

        console.log('[Claude] JobPosting生成開始');
        const result = await askJSON(`
${hints}

TOKYO ROZE（六本木のプレミアムホスピタリティサービス）のGoogleしごと検索向け求人データをJSON形式で生成してください。

以下のJSON形式で返してください:
{
  "title": "求人タイトル（日本語、20〜40文字）",
  "description": "求人の詳細説明（日本語、200〜500文字。仕事内容、魅力、待遇を含む。HTMLタグ不可）",
  "datePosted": "${new Date().toISOString().split('T')[0]}",
  "validThrough": "${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
  "employmentType": "PART_TIME",
  "minSalary": 30000,
  "maxSalary": 100000,
  "salaryUnit": "DAY",
  "qualifications": "応募資格（日本語）",
  "jobBenefits": "福利厚生・待遇をカンマ区切りで（日本語）",
  "workHours": "勤務時間の説明（日本語）"
}

■ ルール:
- TOKYO ROZEは六本木のプレミアムホスピタリティサービス（ナイトコンシェルジュ）
- 「デリヘル」「風俗」「ソープ」「ヘルス」「本番」「性的」等のNGワードは絶対に使用禁止
- 「ナイトワーク」「高収入」「コンシェルジュ」「おもてなし」「ホスピタリティ」等の安全な表現を使用
- 待遇の魅力: 還元率70〜80%（業界トップクラス）、完全自由出勤、自宅待機OK、翌日払い対応、罰金・ノルマなし、交通費支給
- 応募資格: 18歳以上（高校生不可）
- 勤務地: 東京都港区（六本木エリア）
- 勤務時間: 17:00〜05:00の間で自由
- 説明文は求職者に響く内容で、具体的なメリットを盛り込んでください
`);
        console.log('[Claude] JobPosting生成成功:', result.title);
        return result;
    } catch (e) {
        console.error('[Claude] JobPosting生成エラー:', e.message);
        return { error: e.message };
    }
}

module.exports = {
    translateProfile,
    generateNewCastAnnouncement,
    generateDailySchedule,
    generateCampaign,
    generateReviewPost,
    generateWeekendAvailability,
    generateCastReturn,
    generateMonthlyRanking,
    generateAnnouncement,
    generateWeeklyPosts,
    generateBlogArticle,
    generateJobPosting,
    reinitialize
};
