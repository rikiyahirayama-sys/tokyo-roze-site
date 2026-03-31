import { NextRequest, NextResponse } from "next/server";
import { validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// POST /api/auth/settings/test — test external service connection
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { service } = await request.json();

        switch (service) {
            case "claude": {
                if (!process.env.ANTHROPIC_API_KEY) {
                    return NextResponse.json({ success: false, message: "エラー: APIキーが設定されていません" });
                }
                const Anthropic = (await import("@anthropic-ai/sdk")).default;
                const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
                await client.messages.create({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 10,
                    messages: [{ role: "user", content: "test" }],
                });
                return NextResponse.json({ success: true, message: "接続成功" });
            }
            case "twitter_en": {
                if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET ||
                    !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
                    return NextResponse.json({ success: false, message: "エラー: Twitter(EN) APIキーが設定されていません" });
                }
                const { TwitterApi } = await import("twitter-api-v2");
                const tw = new TwitterApi({
                    appKey: process.env.TWITTER_API_KEY,
                    appSecret: process.env.TWITTER_API_SECRET,
                    accessToken: process.env.TWITTER_ACCESS_TOKEN,
                    accessSecret: process.env.TWITTER_ACCESS_SECRET,
                });
                const me = await tw.v2.me();
                return NextResponse.json({ success: true, message: `接続成功: @${me.data.username}` });
            }
            case "twitter_ja": {
                if (!process.env.TWITTER_API_KEY_JA || !process.env.TWITTER_API_SECRET_JA ||
                    !process.env.TWITTER_ACCESS_TOKEN_JA || !process.env.TWITTER_ACCESS_SECRET_JA) {
                    return NextResponse.json({ success: false, message: "エラー: Twitter(JA) APIキーが設定されていません" });
                }
                const { TwitterApi } = await import("twitter-api-v2");
                const tw = new TwitterApi({
                    appKey: process.env.TWITTER_API_KEY_JA,
                    appSecret: process.env.TWITTER_API_SECRET_JA,
                    accessToken: process.env.TWITTER_ACCESS_TOKEN_JA,
                    accessSecret: process.env.TWITTER_ACCESS_SECRET_JA,
                });
                const me = await tw.v2.me();
                return NextResponse.json({ success: true, message: `接続成功: @${me.data.username}` });
            }
            case "telegram": {
                if (!process.env.TELEGRAM_BOT_TOKEN) {
                    return NextResponse.json({ success: false, message: "エラー: Telegram Bot Tokenが設定されていません" });
                }
                const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
                const data = await res.json();
                if (!data.ok) {
                    return NextResponse.json({ success: false, message: `エラー: ${data.description}` });
                }
                return NextResponse.json({ success: true, message: `接続成功: @${data.result.username}` });
            }
            case "github": {
                if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
                    return NextResponse.json({ success: false, message: "エラー: GitHub TokenまたはRepo名が設定されていません" });
                }
                const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}`, {
                    headers: {
                        "Authorization": `token ${process.env.GITHUB_TOKEN}`,
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "Tokyo-Rendaire-Admin",
                    },
                });
                const data = await res.json();
                if (!res.ok) {
                    return NextResponse.json({ success: false, message: `エラー: ${data.message}` });
                }
                return NextResponse.json({ success: true, message: `接続成功: ${data.name}` });
            }
            default:
                return NextResponse.json({ success: false, message: "不明なサービスです" }, { status: 400 });
        }
    } catch (e) {
        return NextResponse.json({ success: false, message: `エラー: ${(e as Error).message}` });
    }
}
