// ============================================
// 求人管理 API（Googleしごと検索用 JobPosting）
// 生成・プレビュー・公開・取得・削除
// ============================================
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const claude = require('../services/claude');
const { checkContent, sanitizeContent } = require('../services/content-filter');

const dataDir = path.join(__dirname, '..', 'data');
const jobPostingPath = path.join(dataDir, 'job-posting.json');

// HTML ファイルパス
const htmlFiles = [
    path.join(__dirname, '..', 'hostinger-upload', 'index.html'),
    path.join(__dirname, '..', 'public', 'index.html')
];

function readJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        return null;
    }
}

function writeJSON(filePath, data) {
    try {
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('[JobPosting] JSON書き込みエラー:', e.message);
    }
}

// JobPosting フォームデータから JSON-LD を生成
function buildJsonLd(data) {
    return {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": data.title,
        "description": data.description,
        "datePosted": data.datePosted,
        "validThrough": data.validThrough,
        "employmentType": data.employmentType || "PART_TIME",
        "hiringOrganization": {
            "@type": "Organization",
            "name": "TOKYO ROZE",
            "sameAs": "https://tokyoroze.com",
            "logo": "https://tokyoroze.com/images/logo.png"
        },
        "jobLocation": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Minato-ku",
                "addressRegion": "Tokyo",
                "addressCountry": "JP"
            }
        },
        "baseSalary": {
            "@type": "MonetaryAmount",
            "currency": "JPY",
            "value": {
                "@type": "QuantitativeValue",
                "minValue": data.minSalary || 30000,
                "maxValue": data.maxSalary || 100000,
                "unitText": data.salaryUnit || "DAY"
            }
        },
        "qualifications": data.qualifications,
        "jobBenefits": data.jobBenefits,
        "workHours": data.workHours
    };
}

// HTMLファイル内のJobPosting JSON-LDを差し替え
function updateHtmlFiles(jsonLd) {
    const jsonLdStr = JSON.stringify(jsonLd);
    const scriptTag = `<script type="application/ld+json">\n${jsonLdStr}\n</script>`;
    let updated = 0;

    for (const htmlPath of htmlFiles) {
        if (!fs.existsSync(htmlPath)) continue;
        let html = fs.readFileSync(htmlPath, 'utf-8');

        // 既存のJobPosting JSON-LDを検索して差し替え
        const regex = /<script type="application\/ld\+json">\s*\{[^}]*"@type"\s*:\s*"JobPosting"[^]*?\}\s*<\/script>/;
        if (regex.test(html)) {
            html = html.replace(regex, scriptTag);
        } else {
            // 既存がなければ LocalBusiness の後に挿入
            const lbRegex = /(<script type="application\/ld\+json">\s*\{[^}]*"@type"\s*:\s*"LocalBusiness"[^]*?<\/script>)/;
            if (lbRegex.test(html)) {
                html = html.replace(lbRegex, `$1\n    ${scriptTag}`);
            }
        }

        fs.writeFileSync(htmlPath, html, 'utf-8');
        updated++;
    }
    return updated;
}

// HTMLファイルからJobPosting JSON-LDを削除
function removeFromHtmlFiles() {
    let removed = 0;
    for (const htmlPath of htmlFiles) {
        if (!fs.existsSync(htmlPath)) continue;
        let html = fs.readFileSync(htmlPath, 'utf-8');
        const regex = /\s*<script type="application\/ld\+json">\s*\{[^}]*"@type"\s*:\s*"JobPosting"[^]*?\}\s*<\/script>/;
        if (regex.test(html)) {
            html = html.replace(regex, '');
            fs.writeFileSync(htmlPath, html, 'utf-8');
            removed++;
        }
    }
    return removed;
}

// ===== POST /generate — AI自動生成 =====
router.post('/generate', async (req, res) => {
    try {
        const { hints } = req.body;
        const result = await claude.generateJobPosting({ hints });
        if (result.error) {
            return res.json({ success: false, error: result.error });
        }

        // コンテンツフィルター
        const check = checkContent(result.title + ' ' + result.description);
        if (!check.safe) {
            return res.status(400).json({
                success: false,
                error: 'NGワードが検出されました: ' + check.blocked.join(', ')
            });
        }

        return res.json({ success: true, jobPosting: result });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /publish — 掲載（HTML埋め込み） =====
router.post('/publish', (req, res) => {
    try {
        const data = req.body;
        if (!data.title || !data.description) {
            return res.status(400).json({ success: false, error: 'タイトルと説明は必須です' });
        }

        // コンテンツフィルター
        const check = checkContent(data.title + ' ' + data.description + ' ' + (data.jobBenefits || ''));
        if (!check.safe) {
            return res.status(400).json({
                success: false,
                error: 'NGワードが検出されました: ' + check.blocked.join(', ')
            });
        }

        const jsonLd = buildJsonLd(data);
        const updated = updateHtmlFiles(jsonLd);

        // データファイルにも保存
        writeJSON(jobPostingPath, {
            ...data,
            jsonLd,
            publishedAt: new Date().toISOString()
        });

        return res.json({
            success: true,
            updated,
            jsonLd,
            message: `${updated}件のHTMLファイルに反映しました`
        });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== GET /current — 現在の掲載内容を取得 =====
router.get('/current', (req, res) => {
    try {
        const data = readJSON(jobPostingPath);
        return res.json({ success: true, jobPosting: data });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== DELETE / — 掲載を削除（HTMLから除去） =====
router.delete('/', (req, res) => {
    try {
        const removed = removeFromHtmlFiles();

        // データファイルも削除
        if (fs.existsSync(jobPostingPath)) {
            fs.unlinkSync(jobPostingPath);
        }

        return res.json({
            success: true,
            removed,
            message: `${removed}件のHTMLファイルから削除しました`
        });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
