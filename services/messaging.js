// ============================================
// メッセージング送信サービス (Express版)
// WhatsApp, LINE, Telegram 送信 + オーナー通知
// ============================================

// --- WhatsApp Business API ---
async function sendWhatsAppMessage(to, message) {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
        console.error('[WhatsApp] API credentials not configured');
        return false;
    }
    try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } }),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('[WhatsApp] Send failed:', err);
        }
        return res.ok;
    } catch (e) {
        console.error('[WhatsApp] Send error:', e.message);
        return false;
    }
}

// --- LINE Messaging API ---
async function sendLINEReply(replyToken, message) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
        console.error('[LINE] LINE_CHANNEL_ACCESS_TOKEN not configured');
        return false;
    }
    try {
        const res = await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: message }] }),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('[LINE] Reply failed:', err);
        }
        return res.ok;
    } catch (e) {
        console.error('[LINE] Reply error:', e.message);
        return false;
    }
}

// --- Telegram Bot API ---
async function sendTelegramMessage(chatId, message) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.error('[Telegram] TELEGRAM_BOT_TOKEN not configured');
        return false;
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message }),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('[Telegram] Send failed:', err);
        }
        return res.ok;
    } catch (e) {
        console.error('[Telegram] Send error:', e.message);
        return false;
    }
}

// --- オーナー通知 ---
async function notifyOwner(type, details) {
    const ownerPhone = process.env.OWNER_WHATSAPP_NUMBER;
    if (!ownerPhone) {
        console.log('[Notify] OWNER_WHATSAPP_NUMBER not configured, skipping notification');
        return;
    }

    let message = '';
    switch (type) {
        case 'new_booking':
            message = `🔔 NEW BOOKING via ${details.platform}\nFrom: ${details.from}\nDate: ${details.date} ${details.time}\nArea: ${details.area}\nCourse: ${details.courseId}\nCast: ${details.castName || 'Any'}`;
            break;
        case 'new_message':
            message = `💬 New ${details.platform} message\nFrom: ${details.from}\nMessage: ${details.message}`;
            break;
        default:
            message = `📢 ${type}: ${JSON.stringify(details)}`;
    }

    await sendWhatsAppMessage(ownerPhone, message);
}

module.exports = {
    sendWhatsAppMessage,
    sendLINEReply,
    sendTelegramMessage,
    notifyOwner,
};
