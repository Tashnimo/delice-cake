export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS headers configuration
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        // Handle CORS Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // 1. ROUTE API CHATBOT (Secure Proxy)
        if (url.pathname === "/api/chat" && request.method === "POST") {
            // Using env.HF_API_KEY from Cloudflare Secrets
            const HF_API_KEY = env.HF_API_KEY || "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";
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

                // Handle Hugging Face "is currently loading" scenario (Status 503)
                if (response.status === 503) {
                    return new Response(JSON.stringify({
                        error: "Model is loading",
                        message: "Le cerveau de Délice AI s'échauffe... Réessayez dans quelques secondes."
                    }), {
                        status: 503,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                const data = await response.json();
                return new Response(JSON.stringify(data), {
                    status: response.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        // 2. SERVE STATIC ASSETS (Cloudflare Pages fallback)
        try {
            return await env.ASSETS.fetch(request);
        } catch (e) {
            return new Response("Not Found", { status: 404 });
        }
    }
};

