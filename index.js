import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DID_API_KEY = process.env.DID_API_KEY;

const waitForVideoReady = async (id, maxRetries = 10, interval = 3000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const checkRes = await fetch(`https://api.d-id.com/talks/${id}`, {
      headers: {
        Authorization: `Bearer ${DID_API_KEY}`,
      },
    });

    const data = await checkRes.json();

    if (data?.status === "done") {
      return `https://studio.d-id.com/player/${id}`;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return null; // Falhou após N tentativas
};

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt é obrigatório." });
  }

  try {
    // 1. Obter explicação do GPT
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const openaiData = await openaiRes.json();
    const explanation = openaiData.choices?.[0]?.message?.content || "Não consegui gerar explicação.";

    // 2. Criar vídeo na D-ID
    const didRes = await fetch("https://api.d-id.com/talks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DID_API_KEY}`,
      },
      body: JSON.stringify({
        script: {
          type: "text",
          input: explanation,
          provider: {
            type: "builtin",
            voice_id: "brazilian_portuguese_male",
          },
        },
        source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle.jpg",
      }),
    });

    const didData = await didRes.json();
    const videoId = didData?.id;

    let videoUrl = null;

    if (videoId) {
      videoUrl = await waitForVideoReady(videoId);
    }

    res.json({
      message: explanation,
      videoUrl,
    });
  } catch (err) {
    console.error("Erro no backend:", err);
    res.status(500).json({ error: "Erro interno", detail: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
