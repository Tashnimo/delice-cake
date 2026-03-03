export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // 1. CHATBOT API PROXY
        if (url.pathname === "/api/chat" && request.method === "POST") {
            const HF_API_KEY = env.HF_API_KEY;
            if (!HF_API_KEY) return new Response(JSON.stringify({ error: "HF_API_KEY missing" }), { status: 500, headers: corsHeaders });

            const HF_API_URL = "https://router.huggingface.co/hf-inference/models/meta-llama/Llama-3.2-3B-Instruct/v1/chat/completions";

            try {
                const body = await request.json();
                const response = await fetch(HF_API_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${HF_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body)
                });

                if (response.status === 503) {
                    return new Response(JSON.stringify({ error: "Loading", message: "IA en préparation..." }), { status: 503, headers: corsHeaders });
                }

                const data = await response.json();
                return new Response(JSON.stringify(data), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
            }
        }

        // 2. TELEGRAM NOTIFICATION PROXY
        if (url.pathname === "/api/notify" && request.method === "POST") {
            const botToken = env.TELEGRAM_BOT_TOKEN;
            const chatIdsRaw = env.TELEGRAM_CHAT_IDS; // Attendue sous forme "ID1,ID2"

            if (!botToken || !chatIdsRaw) return new Response(JSON.stringify({ error: "Telegram config missing" }), { status: 500, headers: corsHeaders });

            try {
                const { message } = await request.json();
                const ids = chatIdsRaw.split(",").map(id => id.trim());

                const results = await Promise.all(ids.map(id =>
                    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chat_id: id, text: message, parse_mode: "HTML" })
                    })
                ));

                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
            }
        }

        try {
            return await env.ASSETS.fetch(request);
        } catch (e) {
            return new Response("Not Found", { status: 404 });
        }
    }
};
