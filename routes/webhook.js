// ============================================
// Webhook Routes — SNSメッセージ受信
// WhatsApp, LINE, Telegram, WeChat
// ============================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { generateAIReply, detectLocale } = require('../services/auto-response');
const { sendWhatsAppMessage, sendLINEReply, sendTelegramMessage, notifyOwner } = require('../services/messaging');

// =============================================
// WhatsApp Webhook
// =============================================

// GET — Meta webhook verification
router.get('/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log('[WhatsApp] Webhook verified');
        return res.status(200).send(challenge);
    }
    console.warn('[WhatsApp] Webhook verification failed');
    res.status(403).json({ error: 'Verification failed' });
});

// POST — Incoming messages
router.post('/whatsapp', async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value?.messages?.[0]) {
            return res.json({ status: 'no message' });
        }

        const message = value.messages[0];
        const from = message.from;       // phone number
        const text = message.text?.body || '';

        console.log(`[WhatsApp] Message from ${from}: ${text}`);

        const locale = detectLocale(text);
        const reply = generateAIReply(`whatsapp:${from}`, text, locale);
        const sent = await sendWhatsAppMessage(from, reply);

        // オーナー通知
        await notifyOwner('new_message', { platform: 'WhatsApp', from, message: text });

        res.json({ status: 'ok', sent });
    } catch (error) {
        console.error('[WhatsApp] Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// =============================================
// LINE Webhook
// =============================================

router.post('/line', async (req, res) => {
    try {
        // Signature verification
        const signature = req.headers['x-line-signature'];
        const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

        if (channelSecret && signature) {
            const bodyStr = JSON.stringify(req.body);
            const hash = crypto.createHmac('sha256', channelSecret).update(bodyStr).digest('base64');
            if (hash !== signature) {
                console.warn('[LINE] Invalid signature');
                return res.status(403).json({ error: 'Invalid signature' });
            }
        }

        const events = req.body.events || [];

        for (const event of events) {
            if (event.type !== 'message' || event.message.type !== 'text') continue;

            const userId = event.source.userId;
            const text = event.message.text;
            const replyToken = event.replyToken;

            console.log(`[LINE] Message from ${userId}: ${text}`);

            const locale = detectLocale(text);
            const reply = generateAIReply(`line:${userId}`, text, locale);
            await sendLINEReply(replyToken, reply);

            // オーナー通知
            await notifyOwner('new_message', { platform: 'LINE', from: userId, message: text });
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('[LINE] Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// =============================================
// Telegram Webhook
// =============================================

router.post('/telegram', async (req, res) => {
    try {
        const message = req.body.message;
        if (!message?.text) {
            return res.json({ status: 'no message' });
        }

        const chatId = message.chat.id;
        const text = message.text;

        console.log(`[Telegram] Message from ${chatId}: ${text}`);

        const locale = detectLocale(text);
        const reply = generateAIReply(`telegram:${chatId}`, text, locale);
        await sendTelegramMessage(chatId, reply);

        // オーナー通知
        await notifyOwner('new_message', { platform: 'Telegram', from: String(chatId), message: text });

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('[Telegram] Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// =============================================
// WeChat Webhook
// =============================================

// GET — WeChat server verification
router.get('/wechat', (req, res) => {
    const { signature, timestamp, nonce, echostr } = req.query;
    const token = process.env.WECHAT_TOKEN || '';

    const arr = [token, timestamp, nonce].sort();
    const hash = crypto.createHash('sha1').update(arr.join('')).digest('hex');

    if (hash === signature) {
        console.log('[WeChat] Webhook verified');
        return res.status(200).send(echostr);
    }
    console.warn('[WeChat] Webhook verification failed');
    res.status(403).json({ error: 'Verification failed' });
});

// POST — Incoming messages (XML format)
router.post('/wechat', express.text({ type: ['text/xml', 'application/xml'] }), async (req, res) => {
    try {
        const text = typeof req.body === 'string' ? req.body : '';
        const fromMatch = text.match(/<FromUserName><!\[CDATA\[(.*?)\]\]>/);
        const contentMatch = text.match(/<Content><!\[CDATA\[(.*?)\]\]>/);
        const toMatch = text.match(/<ToUserName><!\[CDATA\[(.*?)\]\]>/);

        const fromUser = fromMatch?.[1] || 'unknown';
        const content = contentMatch?.[1] || '';
        const toUser = toMatch?.[1] || process.env.WECHAT_APP_ID || '';

        console.log(`[WeChat] Message from ${fromUser}: ${content}`);

        const locale = detectLocale(content);
        const reply = generateAIReply(`wechat:${fromUser}`, content, locale);

        // WeChat expects XML response
        const responseXml = `<xml>
  <ToUserName><![CDATA[${fromUser}]]></ToUserName>
  <FromUserName><![CDATA[${toUser}]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${reply}]]></Content>
</xml>`;

        res.set('Content-Type', 'application/xml');
        res.status(200).send(responseXml);

        // オーナー通知（レスポンス後）
        notifyOwner('new_message', { platform: 'WeChat', from: fromUser, message: content }).catch(() => { });
    } catch (error) {
        console.error('[WeChat] Webhook error:', error);
        res.status(200).send('success');
    }
});

// =============================================
// Webhook Status / Test
// =============================================

router.get('/status', (req, res) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    res.json({
        status: 'ok',
        webhooks: {
            whatsapp: {
                url: `${baseUrl}/api/webhook/whatsapp`,
                verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? '✓ set' : '✗ missing',
                apiToken: process.env.WHATSAPP_API_TOKEN ? '✓ set' : '✗ missing',
                phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? '✓ set' : '✗ missing',
            },
            line: {
                url: `${baseUrl}/api/webhook/line`,
                channelSecret: process.env.LINE_CHANNEL_SECRET ? '✓ set' : '✗ missing',
                accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✓ set' : '✗ missing',
            },
            telegram: {
                url: `${baseUrl}/api/webhook/telegram`,
                botToken: process.env.TELEGRAM_BOT_TOKEN ? '✓ set' : '✗ missing',
            },
            wechat: {
                url: `${baseUrl}/api/webhook/wechat`,
                token: process.env.WECHAT_TOKEN ? '✓ set' : '✗ missing',
                appId: process.env.WECHAT_APP_ID ? '✓ set' : '✗ missing',
            },
        },
    });
});

module.exports = router;
