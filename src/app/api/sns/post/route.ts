import { NextRequest, NextResponse } from "next/server";
import { historyPath, readJSON, writeJSON, validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// POST /api/sns/post — batch post to platforms
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { posts } = await request.json();
        const telegram = require("../../../../../services/telegram");
        const results: { platform: string; text: string;[k: string]: unknown }[] = [];

        if (posts.telegram && Array.isArray(posts.telegram)) {
            for (const post of posts.telegram) {
                const text = typeof post === "string" ? post : post.text;
                const r = await telegram.postToChannel(text);
                results.push({ platform: "telegram", text, ...r });
                await delay(3000);
            }
        }

        const history = readJSON(historyPath) as unknown[];
        history.push({
            id: Date.now(),
            type: "weekly_batch",
            results,
            createdAt: new Date().toISOString(),
        });
        writeJSON(historyPath, history);

        return NextResponse.json({ success: true, results });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}
