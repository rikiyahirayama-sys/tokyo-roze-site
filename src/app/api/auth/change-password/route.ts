import { NextRequest, NextResponse } from "next/server";
import { readEnv, writeEnv, validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// POST /api/auth/change-password
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { currentPassword, newPassword } = await request.json();
        const env = readEnv();
        const adminPw = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || "changethispassword";

        if (currentPassword !== adminPw) {
            return NextResponse.json({ success: false, error: "現在のパスワードが正しくありません" }, { status: 401 });
        }
        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ success: false, error: "パスワードは6文字以上にしてください" }, { status: 400 });
        }

        env.ADMIN_PASSWORD = newPassword;
        writeEnv(env);
        return NextResponse.json({ success: true, message: "パスワードを変更しました" });
    } catch {
        return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
    }
}
