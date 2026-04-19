import { NextRequest, NextResponse } from "next/server";
import { historyPath, readJSON, writeJSON, validateLegacySession } from "@/lib/legacy-helpers";
import fs from "fs";
import path from "path";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// POST /api/sns/manual — manual post with optional image
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const formData = await request.formData();
        const text = formData.get("text") as string;
        const platformsRaw = formData.get("platforms") as string;
        const platformList: string[] = typeof platformsRaw === "string" ? JSON.parse(platformsRaw) : [];

        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        let imagePath: string | null = null;
        const imageFile = formData.get("images");
        if (imageFile instanceof File) {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const safeName = imageFile.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
            const filename = Date.now() + "_" + safeName;
            fs.writeFileSync(path.join(uploadDir, filename), buffer);
            imagePath = path.join("uploads", filename);
        }

        const telegram = require("../../../../../services/telegram");
        const results: { platform: string;[k: string]: unknown }[] = [];

        for (const platform of platformList) {
            switch (platform) {
                case "telegram": {
                    const r = await telegram.postToChannel(text, imagePath);
                    results.push({ platform: "telegram", ...r });
                    break;
                }
            }
            await delay(1000);
        }

        const history = readJSON(historyPath) as unknown[];
        history.push({
            id: Date.now(),
            type: "manual",
            text,
            platforms: platformList,
            results,
            createdAt: new Date().toISOString(),
        });
        writeJSON(historyPath, history);

        return NextResponse.json({ success: true, results });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}
