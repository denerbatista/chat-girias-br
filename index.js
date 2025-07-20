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
    try {
      const res = await fetch(`https://api.d-id.com/talks/${id}`, {
        headers: { Authorization: `Bearer ${DID_API_KEY}` },
      });
      const data = await res.json();
      if (data?.status === "done") {
        return `https://studio.d-id.com/player/${id}`;
      }
    } catch (err) {
      console.warn("Erro ao verificar status:", err.message);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return null;
};

// 1. Explicação
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt ausente" });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || "Não consegui explicar.";

    res.json({ message: explanation });
  } catch (err) {
    console.error("Erro no /chat:", err.message);
    res.status(500).json({ error: "Erro na OpenAI", detail: err.message });
  }
});

// 2. Vídeo
app.post("/api/video", async (req, res) => {
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: "Script ausente" });

  try {
    const response = await fetch("https://api.d-id.com/talks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DID_API_KEY}`,
      },
      body: JSON.stringify({
        script: {
          type: "text",
          input: script,
          provider: {
            type: "builtin",
            voice_id: "brazilian_portuguese_male",
          },
        },
        source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle.jpg",
      }),
    });

    const data = await response.json();
    const videoId = data.id;

    const videoUrl = await waitForVideoReady(videoId);
    if (videoUrl) {
      res.json({ videoUrl });
    } else {
      res.status(504).json({ error: "Vídeo não ficou pronto a tempo." });
    }
  } catch (err) {
    console.error("Erro no /video:", err.message);
    res.status(500).json({ error: "Erro ao gerar vídeo", detail: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
