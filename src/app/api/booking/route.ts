import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { readSiteData } from "@/lib/store";
import { notifyOwner } from "@/lib/notify";

const bookingSchema = z.object({
    courseId: z.string(),
    castId: z.string().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    customerName: z.string().min(1).max(200),
    customerPhone: z.string().min(5).max(30),
    customerEmail: z.string().email().optional().or(z.literal("")),
    hotel: z.string().min(1).max(500),
    roomNumber: z.string().min(1).max(50),
    specialRequests: z.string().max(1000).optional(),
    locale: z.enum(["en", "zh", "ja", "fr", "es", "hi"]).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = bookingSchema.parse(body);

        const siteData = readSiteData();
        const course = siteData.courses.find((c) => c.id === validated.courseId);
        if (!course) {
            return NextResponse.json({ error: "Invalid course" }, { status: 400 });
        }

        // Validate cast if specified
        let castName = "Any";
        if (validated.castId) {
            const cast = siteData.casts.find((c) => c.id === validated.castId);
            if (!cast) {
                return NextResponse.json({ error: "Invalid cast" }, { status: 400 });
            }
            castName = cast.name;
        }

        // Calculate total (course price + potential nomination fee + transport)
        let total = course.price;
        if (validated.castId) {
            total += 2000; // Nomination fee
        }

        const bookingId = `BK-${Date.now().toString(36).toUpperCase()}`;

        // Create Stripe Checkout Session
        const locale = validated.locale || "en";
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const courseName = course.name[locale] ?? course.name.en;

        const session = await getStripe().checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "jpy",
                        product_data: {
                            name: `TOKYO ROZE — ${courseName} (${course.duration}min)`,
                            description: `${validated.date} ${validated.time} | ${castName} | ${validated.hotel}`,
                        },
                        unit_amount: total,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${baseUrl}/${locale}/booking?success=true&bookingId=${bookingId}`,
            cancel_url: `${baseUrl}/${locale}/booking?cancelled=true`,
            metadata: {
                bookingId,
                castId: validated.castId || "",
                castName,
                courseId: validated.courseId,
                date: validated.date,
                time: validated.time,
                customerName: validated.customerName,
                customerPhone: validated.customerPhone,
                hotel: validated.hotel,
                roomNumber: validated.roomNumber,
            },
        });

        // Notify owner about new booking
        await notifyOwner("new_booking", {
            bookingId,
            customerName: validated.customerName,
            customerPhone: validated.customerPhone,
            date: validated.date,
            time: validated.time,
            courseName,
            castName,
            hotel: validated.hotel,
            roomNumber: validated.roomNumber,
            total: total.toString(),
        });

        return NextResponse.json({
            paymentUrl: session.url,
            bookingId,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid request data", details: error.errors },
                { status: 400 }
            );
        }
        console.error("Booking error:", error);
        return NextResponse.json(
            { error: "Failed to create booking" },
            { status: 500 }
        );
    }
}
