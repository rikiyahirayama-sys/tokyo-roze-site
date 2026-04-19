import { NextRequest, NextResponse } from "next/server";
import { castsPath, historyPath, readJSON, writeJSON, validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// POST /api/cast/[id]/announce — new cast announcement
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const casts = readJSON(castsPath) as { id: number; photos?: string[];[k: string]: unknown }[];
        const cast = casts.find((c) => String(c.id) === params.id);
        if (!cast) return NextResponse.json({ success: false, error: "キャストが見つかりません" }, { status: 404 });

        // Dynamically load services
        const claude = require("../../../../../../services/claude");
        const telegram = require("../../../../../../services/telegram");

        const posts = await claude.generateNewCastAnnouncement(cast);
        if (posts.error) return NextResponse.json({ success: false, error: posts.error });

        const imagePath = cast.photos && cast.photos.length > 0 ? cast.photos[0] : null;
        const results: { platform: string;[k: string]: unknown }[] = [];

        if (posts.telegram) {
            const r = await telegram.postToChannel(posts.telegram, imagePath);
            results.push({ platform: "telegram", ...r });
        }

        const history = readJSON(historyPath) as unknown[];
        history.push({
            id: Date.now(),
            type: "new_cast_announce",
            castId: cast.id,
            results,
            createdAt: new Date().toISOString(),
        });
        writeJSON(historyPath, history);

        return NextResponse.json({ success: true, results });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}
