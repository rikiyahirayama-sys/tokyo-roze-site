// ============================================
// 分析 API ルート
// ダッシュボードデータ・イベント記録
// ============================================
const express = require('express');
const router = express.Router();
const analytics = require('../services/analytics');

// ===== POST /event — イベント記録（LP側からのビーコン） =====
router.post('/event', (req, res) => {
    try {
        const event = req.body;
        if (!event || !event.event) {
            return res.status(400).json({ success: false, error: 'event is required' });
        }
        // IPアドレスを取得（UU計算用）
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        // IPをハッシュ化してプライバシー保護
        const crypto = require('crypto');
        const hashedIp = crypto.createHash('sha256').update(ip + new Date().toISOString().slice(0, 10)).digest('hex').slice(0, 16);
        analytics.recordEvent({ ...event, ip: hashedIp });
        return res.json({ success: true });
    } catch (e) {
        console.error('[Analytics] イベント記録エラー:', e.message);
        return res.json({ success: true }); // LP側にエラーは返さない
    }
});

// ===== GET /dashboard — ダッシュボードデータ取得 =====
router.get('/dashboard', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const clampedDays = Math.min(Math.max(days, 1), 3650);
        const data = analytics.getDashboard(clampedDays);
        return res.json({ success: true, ...data });
    } catch (e) {
        console.error('[Analytics] ダッシュボード取得エラー:', e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== GET /job-dashboard — 求人アナリティクス =====
router.get('/job-dashboard', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const clampedDays = Math.min(Math.max(days, 1), 3650);
        const data = analytics.getJobDashboard(clampedDays);
        return res.json({ success: true, ...data });
    } catch (e) {
        console.error('[Analytics] 求人ダッシュボード取得エラー:', e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
