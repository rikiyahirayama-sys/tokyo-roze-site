"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

function AdminSidebar({ onLogout }: { onLogout: () => void }) {
    const pathname = usePathname();

    const navItems = [
        { href: "/admin", label: "ダッシュボード", icon: "📊" },
        { href: "/admin/cast", label: "キャスト管理", icon: "👤" },
        { href: "/admin/courses", label: "コース・エリア", icon: "🗺️" },
        { href: "/admin/calendar", label: "カレンダー連携", icon: "📅" },
        { href: "/admin/sns", label: "SNS連携", icon: "💬" },
        { href: "/admin/sns-post", label: "SNS投稿", icon: "📝" },
        { href: "/admin/blog", label: "ブログ管理", icon: "📰" },
        { href: "/admin/bookings", label: "予約管理", icon: "📋" },
        { href: "/admin/settings", label: "設定", icon: "⚙️" },
        { href: "/admin/api-settings", label: "API設定", icon: "🔑" },
    ];

    return (
        <aside className="w-64 bg-dark-950 border-r border-dark-800/30 min-h-screen flex flex-col">
            <div className="p-6 border-b border-dark-800/30">
                <h1 className="font-display text-xl font-bold gold-accent">管理パネル</h1>
                <p className="text-dark-500 text-xs mt-1">TOKYO ROZE</p>
            </div>
            <nav className="flex-1 py-4">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${pathname === item.href
                            ? "text-white bg-dark-800/50 border-r-2 border-primary-500"
                            : "text-dark-400 hover:text-white hover:bg-dark-900/50"
                            }`}
                    >
                        <span>{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t border-dark-800/30">
                <button
                    onClick={onLogout}
                    className="w-full text-sm text-dark-400 hover:text-red-400 transition-colors py-2"
                >
                    ログアウト
                </button>
            </div>
        </aside>
    );
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                onLogin();
            } else {
                setError("メールアドレスまたはパスワードが正しくありません");
            }
        } catch {
            setError("ログインに失敗しました");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center">
            <div className="card p-8 w-full max-w-md">
                <h1 className="font-display text-2xl font-bold gold-accent text-center mb-2">管理パネル</h1>
                <p className="text-dark-400 text-center text-sm mb-8">TOKYO ROZE</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-2">メールアドレス</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field w-full"
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-2">パスワード</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field w-full"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading ? "ログイン中..." : "ログイン"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Check if admin session cookie exists by trying a protected endpoint
        fetch("/api/admin/calendar/sync", { method: "GET" })
            .then((res) => setAuthenticated(res.status !== 401))
            .catch(() => setAuthenticated(false));
    }, []);

    async function handleLogout() {
        await fetch("/api/admin/logout", { method: "POST" });
        setAuthenticated(false);
    }

    if (authenticated === null) {
        return (
            <html lang="ja">
                <head>
                    <meta charSet="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </head>
                <body className="min-h-screen bg-dark-950 flex items-center justify-center">
                    <div className="text-dark-400">読み込み中...</div>
                </body>
            </html>
        );
    }

    if (!authenticated) {
        return (
            <html lang="ja">
                <head>
                    <meta charSet="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </head>
                <body className="bg-dark-950">
                    <AdminLogin onLogin={() => setAuthenticated(true)} />
                </body>
            </html>
        );
    }

    return (
        <html lang="ja">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body className="bg-dark-900">
                <div className="flex min-h-screen">
                    <AdminSidebar onLogout={handleLogout} />
                    <main className="flex-1 p-8 max-w-5xl">{children}</main>
                </div>
            </body>
        </html>
    );
}
