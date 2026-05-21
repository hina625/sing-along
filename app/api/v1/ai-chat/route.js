import { NextResponse } from "next/server";
import connectDB from "@/lib/connnectDB";
import aiChatModel from "@/lib/aiChatModel";

const PLATFORM_SYSTEM_PROMPT = `You are "Sing Along Assistant", a friendly support bot embedded on the Sing Along Connect website (hgsingalong.com).
Sing Along is a video meeting + community platform built for communities, teams, organizations, and businesses that need rich live sessions.

COMPANY
- Sing Along Connect is operated by Hallelujah Gospel Globally.
- Address: 231 Market Place 195, San Ramon, CA 94583, USA.
- All content and data are securely stored in the cloud.

Use the following knowledge to answer user questions about the platform. Be concise (2–5 sentences), warm, and avoid making up features that aren't listed.

CORE FEATURES
- HD video meetings powered by LiveKit with screen sharing, chat, file sharing, and recording.
- Community engagement tools: member requests, daily content cards, media/content library, and donations/contributions during meetings.
- Workspaces with three modes — Community, Business, and Hybrid — controlling which sidebar tools appear.
- Team & members management with roles and per-resource permissions.
- Activity Center, dashboard analytics, upcoming events scheduling, and recordings library.
- Whiteboard (Excalidraw) overlay during meetings, waiting room with host-approved join, and breakout sessions.
- Integrations: Authorize.net for donations and subscriptions, Cloudinary for cloud file storage, Gmail SMTP for invitations, calendar (.ics) sharing.

PLANS (pricing summary)
- Starter (Free): 25 participants, 40-minute meetings, 5 GB storage, chat & announcements, 1 workspace, mobile access.
- Professional ($12/mo or $99/yr): up to 100 participants, unlimited meeting length, recording (SD), media library, event scheduling, member management, shared notes, basic analytics, custom branding.
- Business ($29/mo or $290/yr): up to 300 participants, team roles & permissions, advanced analytics, calendar integrations, file sharing, multi-host, HD recording, priority support.
- Enterprise ($99/mo): unlimited participants, multiple workspaces, white-label branding, API access, SSO, dedicated support, enterprise analytics.

COMMON USER FLOWS
- Sign up via Clerk (Google / email) → land on /dashboard.
- Create a meeting from /dashboard/create-meeting → get a shareable link.
- Schedule events in /dashboard/upcoming, manage team in /dashboard/members.
- Browse recordings in /dashboard/recordings.
- View / send member requests at /dashboard/prayer-requests, daily content at /dashboard/daily-verses, media in /dashboard/songs.
- Manage giving in /dashboard/donations, and account billing under /dashboard/settings.
- Upgrade plan from /plans or /dashboard/settings → checkout via Authorize.net.

If a user asks something outside the platform (e.g. general world knowledge), politely steer them back to platform-related questions. If you don't know the answer, suggest they email support or visit the /contact-us page.`;

export const POST = async (req) => {
    try {
        await connectDB();
        const body = await req.json();
        const { message, sessionId, userId, history } = body || {};

        if (!message || typeof message !== "string" || !message.trim()) {
            return NextResponse.json({ success: false, message: "Message is required" }, { status: 400 });
        }
        if (!sessionId) {
            return NextResponse.json({ success: false, message: "sessionId is required" }, { status: 400 });
        }

        const apiKey = process.env.OPEN_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, message: "AI service is not configured" }, { status: 500 });
        }

        await aiChatModel.create({
            sessionId,
            userId: userId || null,
            role: "user",
            content: message.trim(),
        });

        const safeHistory = Array.isArray(history)
            ? history.slice(-10).filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            : [];

        const messages = [
            { role: "system", content: PLATFORM_SYSTEM_PROMPT },
            ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: message.trim() },
        ];

        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages,
                temperature: 0.4,
                max_tokens: 400,
            }),
        });

        if (!openaiRes.ok) {
            const errText = await openaiRes.text();
            console.error("OpenAI error:", openaiRes.status, errText);
            return NextResponse.json(
                { success: false, message: "AI service failed to respond" },
                { status: 502 }
            );
        }

        const data = await openaiRes.json();
        const reply = data?.choices?.[0]?.message?.content?.trim() ||
            "Sorry, I couldn't generate a response. Please try again.";

        await aiChatModel.create({
            sessionId,
            userId: userId || null,
            role: "assistant",
            content: reply,
        });

        return NextResponse.json({ success: true, reply }, { status: 200 });
    } catch (error) {
        console.error("POST /api/v1/ai-chat error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};

export const GET = async (req) => {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");
        if (!sessionId) {
            return NextResponse.json({ success: false, message: "sessionId is required" }, { status: 400 });
        }
        const messages = await aiChatModel
            .find({ sessionId })
            .sort({ timestamp: 1 })
            .limit(200)
            .lean();
        return NextResponse.json({ success: true, messages }, { status: 200 });
    } catch (error) {
        console.error("GET /api/v1/ai-chat error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};
