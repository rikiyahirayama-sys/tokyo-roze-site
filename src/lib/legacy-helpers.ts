import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const envPath = path.join(process.cwd(), ".env");

// ===== .env read/write =====
const ENV_KEYS = [
    "ADMIN_ID", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET", "PORT", "SITE_URL",
    "ANTHROPIC_API_KEY",
    "TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET",
    "TWITTER_API_KEY_JA", "TWITTER_API_SECRET_JA", "TWITTER_ACCESS_TOKEN_JA", "TWITTER_ACCESS_SECRET_JA",
    "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID",
    "GITHUB_TOKEN", "GITHUB_REPO",
];

export function readEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    // .envファイルから読む
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        content.split("\n").forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) return;
            const idx = trimmed.indexOf("=");
            if (idx === -1) return;
            env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
        });
    }
    // .envに無いキーはprocess.envから補完（Render.com等のホスティング環境対応）
    ENV_KEYS.forEach((key) => {
        if (!env[key] && process.env[key]) {
            env[key] = process.env[key]!;
        }
    });
    return env;
}

export function writeEnv(envObj: Record<string, string>) {
    const lines = Object.entries(envObj).map(([k, v]) => `${k}=${v}`);
    fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf-8");
    Object.entries(envObj).forEach(([k, v]) => {
        process.env[k] = v;
    });
}

export function maskValue(val: string): string {
    if (!val || val.length === 0) return "";
    if (val.length <= 4) return val;
    return val.substring(0, 4) + "•".repeat(Math.min(val.length - 4, 20));
}

// ===== JSON data helpers =====
export function readJSON(filePath: string): unknown[] {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function writeJSON(filePath: string, data: unknown) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ===== Data file paths =====
export const castsPath = path.join(dataDir, "casts.json");
export const historyPath = path.join(dataDir, "posts-history.json");
export const draftsPath = path.join(dataDir, "drafts.json");
export const blogDir = path.join(process.cwd(), "blog");

// ===== Session helpers =====
// Legacy admin uses express-session. For Next.js we use a simple cookie-based check.
const sessionStore = new Map<string, { isAdmin: boolean; expires: number }>();

export function createLegacySession(): string {
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    sessionStore.set(token, { isAdmin: true, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return token;
}

export function validateLegacySession(token: string | undefined): boolean {
    if (!token) return false;
    const session = sessionStore.get(token);
    if (!session) return false;
    if (Date.now() > session.expires) {
        sessionStore.delete(token);
        return false;
    }
    return session.isAdmin;
}
