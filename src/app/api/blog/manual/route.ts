import { NextRequest, NextResponse } from "next/server";
import { blogDir, validateLegacySession } from "@/lib/legacy-helpers";
import fs from "fs";
import path from "path";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// POST /api/blog/manual
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { title, slug, meta, body } = await request.json();
        if (!title || !slug || !body) {
            return NextResponse.json({ success: false, error: "タイトル、slug、本文は必須です" }, { status: 400 });
        }

        const safeSlug = slug.replace(/[^a-zA-Z0-9-]/g, "");

        function escapeHtml(str: string): string {
            if (!str) return "";
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        }

        const siteUrl = process.env.SITE_URL || "https://tokyoroze.com";
        const date = new Date().toISOString().split("T")[0];
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)} | Tokyo Rendaire Blog</title>
<meta name="description" content="${escapeHtml(meta || "")}">
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">Published: ${date}</div>
${body}
</body>
</html>`;

        if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
        fs.writeFileSync(path.join(blogDir, `${safeSlug}.html`), html, "utf-8");

        if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
            const github = require("../../../../../services/github");
            await github.pushFile(`blog/${safeSlug}.html`, html, `Add blog: ${title}`);
        }

        return NextResponse.json({ success: true, url: `${siteUrl}/blog/${safeSlug}.html` });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}
