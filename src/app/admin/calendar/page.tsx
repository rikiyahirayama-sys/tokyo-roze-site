"use client";

import { useState } from "react";

interface CalendarCastEntry {
    castId: string;
    castName: string;
    calendarId: string;
    lastSynced: string | null;
    status: "synced" | "pending" | "error";
    todaySchedule: { start: string; end: string }[];
}

const calendarCasts: CalendarCastEntry[] = [
    {
        castId: "yui",
        castName: "Yui",
        calendarId: "yui@tokyoroze.com",
        lastSynced: "2026-03-22T14:30:00",
        status: "synced",
        todaySchedule: [{ start: "18:00", end: "05:00" }],
    },
    {
        castId: "hana",
        castName: "Hana",
        calendarId: "hana@tokyoroze.com",
        lastSynced: "2026-03-22T14:30:00",
        status: "synced",
        todaySchedule: [{ start: "20:00", end: "03:00" }],
    },
    {
        castId: "rina",
        castName: "Rina",
        calendarId: "",
        lastSynced: null,
        status: "pending",
        todaySchedule: [],
    },
];

export default function AdminCalendarPage() {
    const [casts, setCasts] = useState(calendarCasts);
    const [syncing, setSyncing] = useState(false);
    const [mainCalendarId, setMainCalendarId] = useState(
        process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID || ""
    );

    async function handleSync() {
        setSyncing(true);
        try {
            const castsWithCalendar = casts.filter((c) => c.calendarId);
            const res = await fetch("/api/admin/calendar/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    casts: castsWithCalendar.map((c) => ({
                        castId: c.castId,
                        castName: c.castName,
                        calendarId: c.calendarId,
                    })),
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const now = new Date().toISOString();
                setCasts((prev) =>
                    prev.map((c) => {
                        const result = data.results?.find(
                            (r: { castId: string }) => r.castId === c.castId
                        );
                        if (result) {
                            return {
                                ...c,
                                status: result.status as "synced" | "error",
                                lastSynced: now,
                                todaySchedule: result.events.map(
                                    (e: { start: string; end: string }) => ({
                                        start: new Date(e.start).toLocaleTimeString("ja-JP", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }),
                                        end: new Date(e.end).toLocaleTimeString("ja-JP", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }),
                                    })
                                ),
                            };
                        }
                        return c;
                    })
                );
                alert(`同期完了: ${data.synced || 0}名のキャストを同期しました`);
            }
        } catch {
            alert("同期に失敗しました");
        } finally {
            setSyncing(false);
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Googleカレンダー連携</h1>
                    <p className="text-dark-400 text-sm mt-1">
                        キャストがGoogleカレンダーを更新すると、出勤情報が自動的に反映されます
                    </p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="btn-primary text-sm"
                >
                    {syncing ? "同期中..." : "今すぐ同期"}
                </button>
            </div>

            {/* Main Calendar Config */}
            <div className="card p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">メインカレンダー設定</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">Google Calendar ID</label>
                        <input
                            type="text"
                            value={mainCalendarId}
                            onChange={(e) => setMainCalendarId(e.target.value)}
                            className="input-field w-full"
                            placeholder="xxxxx@group.calendar.google.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">同期間隔</label>
                        <select className="input-field w-full">
                            <option value="5">5分ごと</option>
                            <option value="10">10分ごと</option>
                            <option value="15" selected>15分ごと</option>
                            <option value="30">30分ごと</option>
                        </select>
                    </div>
                </div>
                <p className="text-dark-500 text-xs mt-3">
                    ※ キャストがカレンダーに「名前 - Available」形式でイベントを追加すると出勤として認識します
                </p>
            </div>

            {/* Sync Rules */}
            <div className="card p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">同期ルール</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-dark-800/30 rounded-lg">
                        <div>
                            <p className="text-sm text-white">カレンダー更新 → 出勤情報を自動反映</p>
                            <p className="text-xs text-dark-500">キャストがカレンダーを編集すると即座にサイトに反映</p>
                        </div>
                        <span className="text-green-400 text-sm">有効</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dark-800/30 rounded-lg">
                        <div>
                            <p className="text-sm text-white">予約確定 → カレンダーに自動ブロック</p>
                            <p className="text-xs text-dark-500">予約が入ると該当時間をカレンダーでブロック</p>
                        </div>
                        <span className="text-green-400 text-sm">有効</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dark-800/30 rounded-lg">
                        <div>
                            <p className="text-sm text-white">出勤なし → サイト上で非表示</p>
                            <p className="text-xs text-dark-500">カレンダーにイベントがないキャストは一覧で非表示</p>
                        </div>
                        <span className="text-green-400 text-sm">有効</span>
                    </div>
                </div>
            </div>

            {/* Per-Cast Calendar Links */}
            <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-dark-800/50">
                    <h2 className="text-lg font-semibold text-white">キャスト別カレンダー連携</h2>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dark-800/50">
                            <th className="text-left text-dark-400 text-sm font-medium px-6 py-3">キャスト</th>
                            <th className="text-left text-dark-400 text-sm font-medium px-6 py-3">Calendar ID</th>
                            <th className="text-left text-dark-400 text-sm font-medium px-6 py-3">本日出勤</th>
                            <th className="text-left text-dark-400 text-sm font-medium px-6 py-3">最終同期</th>
                            <th className="text-left text-dark-400 text-sm font-medium px-6 py-3">状態</th>
                        </tr>
                    </thead>
                    <tbody>
                        {casts.map((cast) => (
                            <tr key={cast.castId} className="border-b border-dark-800/30">
                                <td className="px-6 py-4 text-white font-medium">{cast.castName}</td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        value={cast.calendarId}
                                        onChange={(e) =>
                                            setCasts((prev) =>
                                                prev.map((c) =>
                                                    c.castId === cast.castId
                                                        ? { ...c, calendarId: e.target.value }
                                                        : c
                                                )
                                            )
                                        }
                                        className="input-field text-sm w-full"
                                        placeholder="email@calendar.google.com"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    {cast.todaySchedule.length > 0 ? (
                                        cast.todaySchedule.map((s, i) => (
                                            <span key={i} className="text-sm text-green-400">
                                                {s.start}〜{s.end}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-dark-500">お休み</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-dark-400 text-sm">
                                    {cast.lastSynced
                                        ? new Date(cast.lastSynced).toLocaleTimeString("ja-JP", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })
                                        : "—"}
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`px-2 py-1 rounded text-xs ${cast.status === "synced"
                                            ? "bg-green-500/20 text-green-400"
                                            : cast.status === "error"
                                                ? "bg-red-500/20 text-red-400"
                                                : "bg-dark-700 text-dark-400"
                                            }`}
                                    >
                                        {cast.status === "synced"
                                            ? "同期済"
                                            : cast.status === "error"
                                                ? "エラー"
                                                : "未設定"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
