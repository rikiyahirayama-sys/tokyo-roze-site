// ============================================
// 繝悶Ο繧ｰ邂｡逅・API
// 險倅ｺ狗函謌舌・蜈ｬ髢九・荳隕ｧ繝ｻ蜑企勁
// ============================================
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const claude = require('../services/claude');
const github = require('../services/github');

const blogDir = path.join(__dirname, '..', 'blog');

// 繝悶Ο繧ｰ險倅ｺ稀TML繝・Φ繝励Ξ繝ｼ繝・
function generateBlogHTML({ title, meta, body, slug }) {
    const siteUrl = process.env.SITE_URL || 'https://tokyoroze.com';
    const articleUrl = `${siteUrl}/blog/${slug}.html`;
    const date = new Date().toISOString().split('T')[0];

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)} | Tokyo Rendaire Blog</title>
<meta name="description" content="${escapeHtml(meta)}">
<link rel="canonical" href="${articleUrl}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(meta)}">
<meta property="og:url" content="${articleUrl}">
<meta property="og:type" content="article">
<meta property="og:image" content="${siteUrl}/images/logo.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"Article",
  "headline":"${escapeJSON(title)}",
  "description":"${escapeJSON(meta)}",
  "url":"${articleUrl}",
  "datePublished":"${date}",
  "publisher":{"@type":"Organization","name":"Tokyo Rendaire","url":"${siteUrl}"}
}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Noto+Sans+JP:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans JP',sans-serif;background:#0f0f12;color:#e8e6e3;line-height:1.8}
.blog-header{background:linear-gradient(135deg,#1a0a0e,#0f0f12);padding:20px 40px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #C9A96E33}
.blog-header a{color:#C9A96E;text-decoration:none;font-family:'Cormorant Garamond',serif}
.blog-header .logo{font-size:24px;font-weight:700;letter-spacing:2px}
.blog-header nav a{margin-left:24px;font-size:14px;opacity:.8}
.blog-header nav a:hover{opacity:1}
.blog-body{max-width:800px;margin:60px auto;padding:0 24px}
.blog-body h1{font-family:'Cormorant Garamond',serif;font-size:2.4em;color:#C9A96E;margin-bottom:16px;line-height:1.3}
.blog-body .meta{color:#8a8890;font-size:14px;margin-bottom:40px}
.blog-body h2{font-family:'Cormorant Garamond',serif;font-size:1.6em;color:#DFC494;margin:40px 0 16px;padding-bottom:8px;border-bottom:1px solid #2a2a38}
.blog-body h3{font-size:1.2em;color:#C9A96E;margin:28px 0 12px}
.blog-body p{margin-bottom:20px;font-size:16px;color:#ccc}
.blog-body a{color:#C9A96E}
.cta{background:linear-gradient(135deg,#5B1A2A,#1a0a0e);border:1px solid #C9A96E33;border-radius:12px;padding:40px;text-align:center;margin:60px 0}
.cta h2{color:#C9A96E;font-family:'Cormorant Garamond',serif;margin-bottom:16px}
.cta a{display:inline-block;background:#C9A96E;color:#0f0f12;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px}
.blog-footer{text-align:center;padding:40px;color:#8a8890;font-size:13px;border-top:1px solid #2a2a38}
</style>
</head>
<body>
<header class="blog-header">
  <a href="${siteUrl}" class="logo">TOKYO RENDAIRE</a>
  <nav>
    <a href="${siteUrl}">Home</a>
    <a href="${siteUrl}/blog/">Blog</a>
  </nav>
</header>
<main class="blog-body">
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Published: ${date}</div>
  ${body}
  <div class="cta">
    <h2>Experience Tokyo Rendaire</h2>
    <p style="color:#ccc">Discover premium companionship in Tokyo's finest district.</p>
    <a href="${siteUrl}/#contact">Book Now</a>
  </div>
</main>
<footer class="blog-footer">
  &copy; ${new Date().getFullYear()} Tokyo Rendaire. All rights reserved.
</footer>
</body>
</html>`;
}

// 繝悶Ο繧ｰ荳隕ｧ繝壹・繧ｸHTML
function generateBlogIndexHTML(articles) {
    const siteUrl = process.env.SITE_URL || 'https://tokyoroze.com';
    const articleList = articles.map(a => `
  <article class="article-card">
    <a href="${siteUrl}/blog/${a.slug}.html">
      <h2>${escapeHtml(a.title)}</h2>
      <p>${escapeHtml(a.meta || '')}</p>
      <span class="date">${a.date || ''}</span>
    </a>
  </article>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Blog | Tokyo Rendaire</title>
<meta name="description" content="Tokyo Rendaire Blog - Nightlife, lifestyle and culture in Tokyo.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Noto+Sans+JP:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans JP',sans-serif;background:#0f0f12;color:#e8e6e3;line-height:1.8}
.blog-header{background:linear-gradient(135deg,#1a0a0e,#0f0f12);padding:20px 40px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #C9A96E33}
.blog-header a{color:#C9A96E;text-decoration:none;font-family:'Cormorant Garamond',serif}
.blog-header .logo{font-size:24px;font-weight:700;letter-spacing:2px}
h1{font-family:'Cormorant Garamond',serif;font-size:2.4em;color:#C9A96E;text-align:center;margin:60px 0 40px}
.articles{max-width:800px;margin:0 auto;padding:0 24px}
.article-card{border:1px solid #2a2a38;border-radius:12px;padding:24px;margin-bottom:20px;transition:border-color .3s}
.article-card:hover{border-color:#C9A96E}
.article-card a{text-decoration:none;color:inherit}
.article-card h2{color:#DFC494;font-size:1.2em;margin-bottom:8px}
.article-card p{color:#8a8890;font-size:14px}
.article-card .date{color:#555;font-size:12px}
</style>
</head>
<body>
<header class="blog-header">
  <a href="${siteUrl}" class="logo">TOKYO RENDAIRE</a>
  <nav><a href="${siteUrl}">Home</a></nav>
</header>
<h1>Blog</h1>
<div class="articles">${articleList}</div>
</body>
</html>`;
}

// HTML繧ｨ繧ｹ繧ｱ繝ｼ繝・
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeJSON(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// 繝ｭ繝ｼ繧ｫ繝ｫ縺ｮblog/繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ險倅ｺ倶ｸ隕ｧ繧貞叙蠕・
function getLocalArticles() {
    if (!fs.existsSync(blogDir)) return [];
    return fs.readdirSync(blogDir)
        .filter(f => f.endsWith('.html') && f !== 'index.html')
        .map(f => {
            const content = fs.readFileSync(path.join(blogDir, f), 'utf-8');
            const titleMatch = content.match(/<h1>(.*?)<\/h1>/);
            const metaMatch = content.match(/<meta name="description" content="(.*?)">/);
            const dateMatch = content.match(/Published: (\d{4}-\d{2}-\d{2})/);
            return {
                slug: f.replace('.html', ''),
                title: titleMatch ? titleMatch[1] : f,
                meta: metaMatch ? metaMatch[1] : '',
                date: dateMatch ? dateMatch[1] : ''
            };
        });
}

// ===== POST /generate 窶・險倅ｺ玖・蜍慕函謌・=====
router.post('/generate', async (req, res) => {
    try {
        const { topic } = req.body;
        console.log('[Blog] 險倅ｺ狗函謌宣幕蟋・topic:', topic || '(閾ｪ蜍・');
        const result = await claude.generateBlogArticle(topic);
        if (result.error) {
            console.error('[Blog] 逕滓・繧ｨ繝ｩ繝ｼ:', result.error);
            return res.json({ success: false, error: result.error });
        }
        console.log('[Blog] 險倅ｺ狗函謌先・蜉・title:', result.title, 'slug:', result.slug);
        return res.json({ success: true, article: result });
    } catch (e) {
        console.error('[Blog] 險倅ｺ狗函謌蝉ｾ句､・', e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /publish 窶・險倅ｺ句・髢・=====
router.post('/publish', async (req, res) => {
    try {
        const { title, slug, meta, body } = req.body;
        if (!title || !slug || !body) {
            return res.status(400).json({ success: false, error: '繧ｿ繧､繝医Ν縲《lug縲∵悽譁・・蠢・医〒縺・ });
        }

        const safeSlug = slug.replace(/[^a-zA-Z0-9-]/g, '');
        const html = generateBlogHTML({ title, meta, body, slug: safeSlug });

        // 繝ｭ繝ｼ繧ｫ繝ｫ縺ｫ菫晏ｭ・
        if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
        fs.writeFileSync(path.join(blogDir, `${safeSlug}.html`), html, 'utf-8');

        // 繝悶Ο繧ｰ荳隕ｧ繝壹・繧ｸ繧呈峩譁ｰ
        const articles = getLocalArticles();
        const indexHtml = generateBlogIndexHTML(articles);
        fs.writeFileSync(path.join(blogDir, 'index.html'), indexHtml, 'utf-8');

        // GitHub縺ｫ繝励ャ繧ｷ繝･・医ヨ繝ｼ繧ｯ繝ｳ縺後≠繧後・・・
        let githubResult = null;
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
            githubResult = await github.pushFile(`blog/${safeSlug}.html`, html, `Add blog: ${title}`);
            await github.pushFile('blog/index.html', indexHtml, 'Update blog index');
        }

        const siteUrl = process.env.SITE_URL || 'https://tokyoroze.com';
        return res.json({
            success: true,
            url: `${siteUrl}/blog/${safeSlug}.html`,
            github: githubResult
        });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== POST /manual 窶・謇句虚險倅ｺ句・髢・=====
router.post('/manual', async (req, res) => {
    try {
        const { title, slug, meta, body } = req.body;
        if (!title || !slug || !body) {
            return res.status(400).json({ success: false, error: '繧ｿ繧､繝医Ν縲《lug縲∵悽譁・・蠢・医〒縺・ });
        }

        const safeSlug = slug.replace(/[^a-zA-Z0-9-]/g, '');
        const html = generateBlogHTML({ title, meta, body, slug: safeSlug });

        if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
        fs.writeFileSync(path.join(blogDir, `${safeSlug}.html`), html, 'utf-8');

        // 繝悶Ο繧ｰ荳隕ｧ繝壹・繧ｸ繧呈峩譁ｰ
        const articles = getLocalArticles();
        const indexHtml = generateBlogIndexHTML(articles);
        fs.writeFileSync(path.join(blogDir, 'index.html'), indexHtml, 'utf-8');

        // GitHub縺ｫ繝励ャ繧ｷ繝･・医ヨ繝ｼ繧ｯ繝ｳ縺後≠繧後・・・
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
            await github.pushFile(`blog/${safeSlug}.html`, html, `Add blog: ${title}`);
            await github.pushFile('blog/index.html', indexHtml, 'Update blog index');
        }

        const siteUrl = process.env.SITE_URL || 'https://tokyoroze.com';
        return res.json({ success: true, url: `${siteUrl}/blog/${safeSlug}.html` });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== GET /list 窶・險倅ｺ倶ｸ隕ｧ =====
router.get('/list', (req, res) => {
    try {
        const articles = getLocalArticles();
        return res.json({ success: true, articles });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ===== DELETE /:slug 窶・險倅ｺ句炎髯､ =====
router.delete('/:slug', async (req, res) => {
    try {
        const safeSlug = req.params.slug.replace(/[^a-zA-Z0-9-]/g, '');
        const filePath = path.join(blogDir, `${safeSlug}.html`);

        // 繝ｭ繝ｼ繧ｫ繝ｫ蜑企勁
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // 繝悶Ο繧ｰ荳隕ｧ繝壹・繧ｸ繧呈峩譁ｰ
        const articles = getLocalArticles();
        const indexHtml = generateBlogIndexHTML(articles);
        fs.writeFileSync(path.join(blogDir, 'index.html'), indexHtml, 'utf-8');

        // GitHub縺九ｉ繧ょ炎髯､・医ヨ繝ｼ繧ｯ繝ｳ縺後≠繧後・・・
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
            await github.deleteFile(`blog/${safeSlug}.html`, `Delete blog: ${safeSlug}`);
            await github.pushFile('blog/index.html', indexHtml, 'Update blog index');
        }

        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
