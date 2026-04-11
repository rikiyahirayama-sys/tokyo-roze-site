import { NextRequest, NextResponse } from "next/server";
import { blogDir, validateLegacySession } from "@/lib/legacy-helpers";
import fs from "fs";
import path from "path";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

function escapeHtml(str: string): string {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeJSON(str: string): string {
    if (!str) return "";
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function generateBlogHTML({ title, meta, body, slug }: { title: string; meta: string; body: string; slug: string }) {
    const siteUrl = process.env.SITE_URL || "https://tokyoroze.com";
    const articleUrl = `${siteUrl}/blog/${slug}.html`;
    const date = new Date().toISOString().split("T")[0];
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)} | Tokyo Rendaire Blog</title>
<meta name="description" content="${escapeHtml(meta)}">
<link rel="canonical" href="${articleUrl}">
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">Published: ${date}</div>
${body}
</body>
</html>`;
}

function getLocalArticles() {
    if (!fs.existsSync(blogDir)) return [];
    return fs.readdirSync(blogDir)
        .filter((f) => f.endsWith(".html") && f !== "index.html")
        .map((f) => {
            const content = fs.readFileSync(path.join(blogDir, f), "utf-8");
            const titleMatch = content.match(/<h1>(.*?)<\/h1>/);
            const metaMatch = content.match(/<meta name="description" content="(.*?)">/);
            const dateMatch = content.match(/Published: (\d{4}-\d{2}-\d{2})/);
            return {
                slug: f.replace(".html", ""),
                title: titleMatch ? titleMatch[1] : f,
                meta: metaMatch ? metaMatch[1] : "",
                date: dateMatch ? dateMatch[1] : "",
            };
        });
}

// POST /api/blog/publish
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { title, slug, meta, body } = await request.json();
        if (!title || !slug || !body) {
            return NextResponse.json({ success: false, error: "繧ｿ繧､繝医Ν縲《lug縲∵悽譁・・蠢・医〒縺・ }, { status: 400 });
        }

        const safeSlug = slug.replace(/[^a-zA-Z0-9-]/g, "");
        const html = generateBlogHTML({ title, meta, body, slug: safeSlug });

        if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
        fs.writeFileSync(path.join(blogDir, `${safeSlug}.html`), html, "utf-8");

        // Push to GitHub if configured
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
            const github = require("../../../../../services/github");
            await github.pushFile(`blog/${safeSlug}.html`, html, `Add blog: ${title}`);
        }

        const siteUrl = process.env.SITE_URL || "https://tokyoroze.com";
        return NextResponse.json({ success: true, url: `${siteUrl}/blog/${safeSlug}.html` });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}
