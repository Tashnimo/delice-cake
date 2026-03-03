export default async function handler(req, res) {
    // 1. Gestion des requêtes OPTIONS (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const HF_API_KEY = process.env.HF_API_KEY;
    if (!HF_API_KEY) {
        console.error("ERREUR : HF_API_KEY manquante.");
        return res.status(500).json({ error: "Configuration manquante (API KEY)" });
    }

    const HF_API_URL = "https://router.huggingface.co/hf-inference/models/meta-llama/Llama-3.2-3B-Instruct/v1/chat/completions";

    try {
        const response = await fetch(HF_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body)
        });

        if (response.status === 503) {
            return res.status(503).json({ error: "Loading", message: "IA en préparation..." });
        }

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (err) {
        console.error("Erreur API Chat :", err.message);
        return res.status(500).json({ error: "Erreur de connexion", detail: err.message });
    }
}
