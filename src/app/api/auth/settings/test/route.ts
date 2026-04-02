import { NextRequest, NextResponse } from "next/server";
import { validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// POST /api/auth/settings/test — test external service connection
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, message: "セッション切れです。再ログインしてください", error: "Unauthorized" }, { status: 401 });
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
                const enKey = (process.env.TWITTER_API_KEY || "").trim();
                const enSecret = (process.env.TWITTER_API_SECRET || "").trim();
                const enAccToken = (process.env.TWITTER_ACCESS_TOKEN || "").trim();
                const enAccSecret = (process.env.TWITTER_ACCESS_SECRET || "").trim();
                console.log("[Twitter Test EN] ENV:", {
                    API_KEY: enKey ? enKey.substring(0, 4) + "**(" + enKey.length + ")" : "NOT SET",
                    API_SECRET: enSecret ? enSecret.substring(0, 4) + "**(" + enSecret.length + ")" : "NOT SET",
                    ACCESS_TOKEN: enAccToken ? enAccToken.substring(0, 4) + "**(" + enAccToken.length + ")" : "NOT SET",
                    ACCESS_SECRET: enAccSecret ? enAccSecret.substring(0, 4) + "**(" + enAccSecret.length + ")" : "NOT SET",
                });
                if (!enKey || !enSecret || !enAccToken || !enAccSecret) {
                    return NextResponse.json({ success: false, message: "エラー: Twitter(EN) APIキーが設定されていません" });
                }
                const { TwitterApi } = await import("twitter-api-v2");
                const tw = new TwitterApi({
                    appKey: enKey,
                    appSecret: enSecret,
                    accessToken: enAccToken,
                    accessSecret: enAccSecret,
                });
                console.log("[Twitter Test EN] Client created, calling v2.me()...");
                const me = await tw.v2.me();
                console.log("[Twitter Test EN] Success:", me.data.username);
                return NextResponse.json({ success: true, message: `接続成功: @${me.data.username}` });
            }
            case "twitter_ja": {
                const jaKey = (process.env.TWITTER_API_KEY_JA || "").trim();
                const jaSecret = (process.env.TWITTER_API_SECRET_JA || "").trim();
                const jaAccToken = (process.env.TWITTER_ACCESS_TOKEN_JA || "").trim();
                const jaAccSecret = (process.env.TWITTER_ACCESS_SECRET_JA || "").trim();
                console.log("[Twitter Test JA] ENV:", {
                    API_KEY_JA: jaKey ? jaKey.substring(0, 4) + "**(" + jaKey.length + ")" : "NOT SET",
                    API_SECRET_JA: jaSecret ? jaSecret.substring(0, 4) + "**(" + jaSecret.length + ")" : "NOT SET",
                    ACCESS_TOKEN_JA: jaAccToken ? jaAccToken.substring(0, 4) + "**(" + jaAccToken.length + ")" : "NOT SET",
                    ACCESS_SECRET_JA: jaAccSecret ? jaAccSecret.substring(0, 4) + "**(" + jaAccSecret.length + ")" : "NOT SET",
                });
                if (!jaKey || !jaSecret || !jaAccToken || !jaAccSecret) {
                    return NextResponse.json({ success: false, message: "エラー: Twitter(JA) APIキーが設定されていません" });
                }
                const { TwitterApi: TwitterApiJA } = await import("twitter-api-v2");
                const twJa = new TwitterApiJA({
                    appKey: jaKey,
                    appSecret: jaSecret,
                    accessToken: jaAccToken,
                    accessSecret: jaAccSecret,
                });
                console.log("[Twitter Test JA] Client created, calling v2.me()...");
                const meJa = await twJa.v2.me();
                console.log("[Twitter Test JA] Success:", meJa.data.username);
                return NextResponse.json({ success: true, message: `接続成功: @${meJa.data.username}` });
            }
            case "telegram": {
                const tgToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
                const tgChannel = (process.env.TELEGRAM_CHANNEL_ID || "").trim();
                console.log("[Telegram Test] ENV:", {
                    BOT_TOKEN: tgToken ? tgToken.substring(0, 4) + "**(" + tgToken.length + ")" : "NOT SET",
                    CHANNEL_ID: tgChannel ? tgChannel.substring(0, 4) + "**(" + tgChannel.length + ")" : "NOT SET",
                });
                if (!tgToken) {
                    return NextResponse.json({ success: false, message: "エラー: Telegram Bot Tokenが設定されていません" });
                }
                const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`);
                const tgData = await tgRes.json();
                if (!tgData.ok) {
                    return NextResponse.json({ success: false, message: `エラー: ${tgData.description}` });
                }
                console.log("[Telegram Test] Success:", tgData.result.username);
                return NextResponse.json({ success: true, message: `接続成功: @${tgData.result.username}` });
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
