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

// JSONレスポンスをパースする共通関数
async function askJSON(prompt, maxTokens = 4096) {
    const text = await ask(prompt, maxTokens);
    // JSON部分を抽出
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON形式のレスポンスが取得できませんでした');
    return JSON.parse(match[0]);
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
新しいキャスト入店のSNS投稿文を生成してください。

キャスト情報:
名前: ${castData.name}
年齢: ${castData.age}歳
身長: ${castData.height}cm
バスト: ${castData.bust}
ウエスト: ${castData.waist}
ヒップ: ${castData.hip}
説明(日本語): ${castData.description_ja || ''}
説明(英語): ${castData.description_en || ''}

以下の3つの投稿文をJSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）。🌸 NEW — [name] has joined Tokyo Rendaire! [specs]. [description]. Book → tokyorendaire.com #TokyoRendaire #Roppongi #TokyoEscort",
  "twitter_ja": "日本語ツイート（280字以内）。新人入店🌹[name]（[age]歳・[height]cm）[description] #六本木 #デリヘル #新人",
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
        const castList = onDutyCasts.map(c => `${c.name}（${c.age}歳・${c.height}cm）`).join('\n');
        return await askJSON(`
本日出勤中のキャスト一覧からSNS投稿文を生成してください。

出勤中キャスト:
${castList || '（出勤キャストなし）'}

以下の3つの投稿文をJSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）。Today's lineup at Tokyo Rendaire... #TokyoRendaire",
  "twitter_ja": "日本語ツイート（280字以内）。本日の出勤キャスト一覧...",
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
割引: ${discount}
期間: ${period}
説明: ${description}

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRendaire",
  "twitter_ja": "日本語ツイート（280字以内）",
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
キャスト名: ${castName}
星数: ${rating}/5

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRendaire #Review",
  "twitter_ja": "日本語ツイート（280字以内）",
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
        const castList = (availableCasts || []).map(c => `${c.name}（${c.age}歳）`).join(', ');
        return await askJSON(`
週末の空き状況のSNS投稿文を生成してください。

空きのあるキャスト: ${castList || '情報なし'}
備考: ${notes || '特になし'}

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRendaire #Weekend",
  "twitter_ja": "日本語ツイート（280字以内）",
  "telegram": "Telegram用（500〜800字）Markdown形式"
}
`);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== キャスト復帰お知らせ =====
async function generateCastReturn(castData, message) {
    try {
        return await askJSON(`
キャスト復帰お知らせのSNS投稿文を生成してください。

キャスト名: ${castData.name}
年齢: ${castData.age}歳
身長: ${castData.height}cm
復帰メッセージ: ${message || ''}

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRendaire",
  "twitter_ja": "日本語ツイート（280字以内）",
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

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRendaire #Ranking",
  "twitter_ja": "日本語ツイート（280字以内）",
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

JSON形式で返してください:
{
  "twitter_en": "英語ツイート（280字以内）#TokyoRendaire",
  "twitter_ja": "日本語ツイート（280字以内）",
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
            : 'Tokyo Rendaire（六本木の高級デリヘル）に関連するトピックを7つ自動生成して使ってください';

        return await askJSON(`
${topicPrompt}

1週間分（月〜日、毎日1本ずつ）のSNS投稿をJSON形式で生成してください:
{
  "twitter_en": [
    {"day": "月曜", "time": "07:00", "text": "英語ツイート（280字以内）"},
    {"day": "火曜", "time": "12:00", "text": "..."},
    {"day": "水曜", "time": "07:00", "text": "..."},
    {"day": "木曜", "time": "21:00", "text": "..."},
    {"day": "金曜", "time": "12:00", "text": "..."},
    {"day": "土曜", "time": "09:00", "text": "..."},
    {"day": "日曜", "time": "18:00", "text": "..."}
  ],
  "twitter_ja": [
    {"day": "月曜", "time": "19:00", "text": "日本語ツイート（280字以内）"},
    {"day": "火曜", "time": "19:00", "text": "..."},
    {"day": "水曜", "time": "19:00", "text": "..."},
    {"day": "木曜", "time": "19:00", "text": "..."},
    {"day": "金曜", "time": "19:00", "text": "..."},
    {"day": "土曜", "time": "19:00", "text": "..."},
    {"day": "日曜", "time": "19:00", "text": "..."}
  ],
  "telegram": [
    {"day": "月曜", "time": "10:00", "text": "Telegram投稿（500〜800字、Markdown形式）"},
    {"day": "火曜", "time": "14:00", "text": "..."},
    {"day": "水曜", "time": "10:00", "text": "..."},
    {"day": "木曜", "time": "14:00", "text": "..."},
    {"day": "金曜", "time": "10:00", "text": "..."},
    {"day": "土曜", "time": "10:00", "text": "..."},
    {"day": "日曜", "time": "14:00", "text": "..."}
  ]
}

各プラットフォーム必ず7本（毎日1本）生成してください。
必ず #TokyoRendaire をツイートに含めてください。
Tokyo Rendaireは東京・六本木の高級デリバリーサービスです。
tokyorendaire.com へのリンクを適宜含めてください。
`, 8192);
    } catch (e) {
        return { error: e.message };
    }
}

// ===== ブログ記事生成 =====
async function generateBlogArticle(topic) {
    try {
        const topicPrompt = topic
            ? `トピック: ${topic}`
            : 'Tokyo Rendaire / 東京のナイトライフ / 六本木に関するSEOに強いトピックを自動提案して使ってください';

        return await askJSON(`
${topicPrompt}

英語のSEOブログ記事をJSON形式で生成してください:
{
  "title": "記事タイトル（英語）",
  "slug": "url-friendly-slug",
  "meta": "メタディスクリプション（英語、160字以内）",
  "body": "HTML形式の記事本文（2000〜3000語、h2/h3見出し付き）"
}

記事の要件:
- 英語で執筆
- SEO最適化（キーワード自然配置）
- h2, h3タグで適切に構造化
- 本文中に自然な形でTokyo Rendaire（tokyorendaire.com）への誘導を1〜2回含める
- 読者に価値のある情報を提供
`, 8192);
    } catch (e) {
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
    reinitialize
};
