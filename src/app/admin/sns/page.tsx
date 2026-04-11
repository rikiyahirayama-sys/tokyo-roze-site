"use client";

import { useState, useEffect } from "react";

interface SNSPlatform {
    enabled: boolean;
    accountId: string;
    webhookUrl?: string;
}

interface SNSConfig {
    whatsapp: SNSPlatform;
    wechat: SNSPlatform;
    line: SNSPlatform;
    telegram: SNSPlatform;
}

interface WebhookStatus {
    [key: string]: { url: string;[k: string]: string };
}

const defaultSNS: SNSConfig = {
    whatsapp: { enabled: false, accountId: "" },
    wechat: { enabled: false, accountId: "" },
    line: { enabled: false, accountId: "" },
    telegram: { enabled: false, accountId: "" },
};

const platformInfo = [
    {
        key: "whatsapp" as const, name: "WhatsApp", color: "bg-green-500", icon: "📱",
        guide: "1. Meta Business Suite → WhatsApp → API設定\n2. 電話番号IDとアクセストークンを.envに設定\n3. Webhook URLを下記に設定\n4. Verify Tokenは .env の WHATSAPP_VERIFY_TOKEN を使用",
        envVars: ["WHATSAPP_API_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "NEXT_PUBLIC_WHATSAPP_PHONE"],
    },
    {
        key: "line" as const, name: "LINE", color: "bg-lime-500", icon: "🟢",
        guide: "1. LINE Developers Console → Messaging API チャネル\n2. チャネルシークレットとアクセストークンを.envに設定\n3. Webhook URLを下記に設定、Webhookを有効化",
        envVars: ["LINE_CHANNEL_SECRET", "LINE_CHANNEL_ACCESS_TOKEN", "NEXT_PUBLIC_LINE_ID"],
    },
    {
        key: "telegram" as const, name: "Telegram", color: "bg-blue-500", icon: "✈️",
        guide: "1. @BotFather でBotを作成\n2. Bot Tokenを.envに設定\n3. setWebhook APIでWebhook URLを登録:\ncurl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WEBHOOK_URL>",
        envVars: ["TELEGRAM_BOT_TOKEN", "NEXT_PUBLIC_TELEGRAM_ID"],
    },
    {
        key: "wechat" as const, name: "WeChat", color: "bg-emerald-500", icon: "💬",
        guide: "1. WeChat Official Account → 基本設定\n2. AppIDとTokenを.envに設定\n3. サーバー設定でWebhook URLを登録",
        envVars: ["WECHAT_APP_ID", "WECHAT_APP_SECRET", "WECHAT_TOKEN"],
    },
];

export default function SNSPage() {
    const [sns, setSNS] = useState<SNSConfig>(defaultSNS);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
    const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/data")
            .then((r) => r.json())
            .then((d) => d.sns && setSNS(d.sns))
            .catch(() => setMessage("データの読み込みに失敗しました"));

        fetch("/api/webhook/status")
            .then((r) => r.json())
            .then((d) => d.webhooks && setWebhookStatus(d.webhooks))
            .catch(() => { });
    }, []);

    async function handleSave() {
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/admin/data", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sns }),
            });
            if (res.ok) {
                setMessage("保存しました");
            } else {
                setMessage("保存に失敗しました");
            }
        } catch {
            setMessage("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    }

    function updatePlatform(key: keyof SNSConfig, field: string, value: string | boolean) {
        setSNS((prev) => ({
            ...prev,
            [key]: { ...prev[key], [field]: value },
        }));
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        setMessage("コピーしました");
        setTimeout(() => setMessage(""), 2000);
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">SNS連携設定</h1>
                    <p className="text-dark-400 text-sm mt-1">メッセージプラットフォームの予約受付設定</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-6 py-2">
                    {saving ? "保存中..." : "設定を保存"}
                </button>
            </div>

            {message && (
                <div className={`mb-6 p-3 rounded-lg text-sm ${message.includes("失敗") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {message}
                </div>
            )}

            <div className="space-y-4">
                {platformInfo.map((p) => {
                    const status = webhookStatus?.[p.key];
                    return (
                        <div key={p.key} className="card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{p.icon}</span>
                                    <span className="text-white font-semibold text-lg">{p.name}</span>
                                    {status && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-300">
                                            {Object.entries(status).filter(([k]) => k !== 'url').every(([, v]) => v === '✓ set')
                                                ? '✅ 設定済み' : '⚠️ 環境変数が未設定'}
                                        </span>
                                    )}
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={sns[p.key].enabled}
                                        onChange={(e) => updatePlatform(p.key, "enabled", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dark-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:bg-white"></div>
                                </label>
                            </div>
                            {sns[p.key].enabled && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-dark-300 mb-1">アカウントID</label>
                                            <input
                                                type="text"
                                                value={sns[p.key].accountId}
                                                onChange={(e) => updatePlatform(p.key, "accountId", e.target.value)}
                                                className="input-field w-full"
                                                placeholder={`${p.name}のアカウントID`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-dark-300 mb-1">Webhook URL（各プラットフォームに設定）</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={status?.url || `https://tokyoroze.com/api/webhook/${p.key}`}
                                                    readOnly
                                                    className="input-field w-full text-dark-400 bg-dark-800"
                                                />
                                                <button
                                                    onClick={() => copyToClipboard(status?.url || `https://tokyoroze.com/api/webhook/${p.key}`)}
                                                    className="px-3 py-1 text-xs bg-dark-700 hover:bg-dark-600 text-dark-300 rounded"
                                                >
                                                    コピー
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 環境変数ステータス */}
                                    {status && (
                                        <div className="bg-dark-800/50 rounded p-3">
                                            <p className="text-xs text-dark-400 mb-2">環境変数ステータス:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(status).filter(([k]) => k !== 'url').map(([key, val]) => (
                                                    <span key={key} className={`text-xs px-2 py-0.5 rounded ${val === '✓ set' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        {key}: {val}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* セットアップガイド */}
                                    <button
                                        onClick={() => setExpandedGuide(expandedGuide === p.key ? null : p.key)}
                                        className="text-xs text-primary-400 hover:text-primary-300"
                                    >
                                        {expandedGuide === p.key ? '▼ セットアップガイドを閉じる' : '▶ セットアップガイドを表示'}
                                    </button>
                                    {expandedGuide === p.key && (
                                        <div className="bg-dark-800/50 rounded p-3 text-xs text-dark-300 whitespace-pre-line">
                                            <p className="font-semibold text-dark-200 mb-2">{p.name} セットアップ手順:</p>
                                            <p>{p.guide}</p>
                                            <p className="mt-2 font-semibold text-dark-200">必要な環境変数 (.env):</p>
                                            <ul className="list-disc list-inside mt-1">
                                                {p.envVars.map(v => <li key={v}>{v}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Telegramセットアップヘルパー */}
            <div className="mt-8 card p-5">
                <h2 className="text-lg font-bold text-white mb-3">🔧 Telegram Webhook 登録コマンド</h2>
                <p className="text-sm text-dark-400 mb-2">BotのWebhookを登録するには、以下を実行してください:</p>
                <div className="bg-dark-800 rounded p-3 font-mono text-xs text-dark-300 break-all">
                    curl -X POST &quot;https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://tokyoroze.com/api/webhook/telegram&quot;
                </div>
            </div>
        </div>
    );
}
