/**
 * Sends a WhatsApp message via the Meta WhatsApp Business API.
 */
export async function sendWhatsAppMessage(
    to: string,
    message: string
): Promise<boolean> {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
        console.error("WhatsApp API credentials not configured");
        return false;
    }

    try {
        const res = await fetch(
            `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to,
                    type: "text",
                    text: { body: message },
                }),
            }
        );

        return res.ok;
    } catch (error) {
        console.error("Failed to send WhatsApp message:", error);
        return false;
    }
}

/**
 * Sends a booking confirmation template message via WhatsApp.
 */
export async function sendBookingConfirmation(
    to: string,
    bookingDetails: {
        bookingId: string;
        castName: string;
        date: string;
        time: string;
        hotel: string;
        courseName: string;
        total: number;
    }
): Promise<boolean> {
    const message = [
        `✅ Booking Confirmed!`,
        ``,
        `Booking ID: ${bookingDetails.bookingId}`,
        `Date: ${bookingDetails.date}`,
        `Time: ${bookingDetails.time}`,
        `Lady: ${bookingDetails.castName}`,
        `Course: ${bookingDetails.courseName}`,
        `Location: ${bookingDetails.hotel}`,
        `Total: ¥${bookingDetails.total.toLocaleString()}`,
        ``,
        `Your companion will arrive at the scheduled time.`,
        `For any changes, please message us here.`,
    ].join("\n");

    return sendWhatsAppMessage(to, message);
}

/**
 * Auto-reply handler for incoming WhatsApp messages.
 * Returns the response message based on message content.
 */
export function getAutoReply(
    incomingMessage: string,
    locale: string = "en"
): string {
    const msg = incomingMessage.toLowerCase().trim();

    if (locale === "zh") {
        if (msg.includes("预约") || msg.includes("booking") || msg.includes("book")) {
            return `感谢您的咨询！\n\n请通过我们的网站完成预约：\n${process.env.NEXT_PUBLIC_BASE_URL}/zh/booking\n\n或回复以下信息：\n1. 希望的日期和时间\n2. 偏好的方案（60/90/120/180分钟）\n3. 酒店名和房间号`;
        }
        if (msg.includes("价格") || msg.includes("price") || msg.includes("费用")) {
            return `我们的价格方案如下：\n\n💎 标准60分 — ¥30,000\n💎 标准90分 — ¥42,000\n💎 尊享120分 — ¥55,000\n💎 VIP 180分 — ¥80,000\n\n详情请访问：${process.env.NEXT_PUBLIC_BASE_URL}/zh/system`;
        }
        return `感谢您联系 TOKYO ROZE！\n\n我们是东京高端外派服务。\n\n🔹 查看佳丽：回复「佳丽」\n🔹 查看价格：回复「价格」\n🔹 预约：回复「预约」\n\n或直接访问我们的网站：${process.env.NEXT_PUBLIC_BASE_URL}/zh`;
    }

    // English default
    if (msg.includes("book") || msg.includes("reservation") || msg.includes("reserve")) {
        return `Thank you for your interest!\n\nPlease complete your booking on our website:\n${process.env.NEXT_PUBLIC_BASE_URL}/en/booking\n\nOr reply with:\n1. Preferred date and time\n2. Course preference (60/90/120/180 min)\n3. Hotel name and room number`;
    }
    if (msg.includes("price") || msg.includes("rate") || msg.includes("cost") || msg.includes("how much")) {
        return `Our courses:\n\n💎 Standard 60min — ¥30,000\n💎 Standard 90min — ¥42,000\n💎 Premium 120min — ¥55,000\n💎 VIP 180min — ¥80,000\n\nDetails: ${process.env.NEXT_PUBLIC_BASE_URL}/en/system`;
    }
    return `Thank you for contacting TOKYO ROZE!\n\nWe are Tokyo's premium outcall escort service.\n\n🔹 View ladies: Reply "ladies"\n🔹 See prices: Reply "prices"\n🔹 Book now: Reply "book"\n\nOr visit our website: ${process.env.NEXT_PUBLIC_BASE_URL}/en`;
}
