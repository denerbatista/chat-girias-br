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

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt é obrigatório." });
  }

  try {
    // Etapa 1: Obter explicação da OpenAI
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const aiData = await openaiResponse.json();
    const explanation = aiData.choices?.[0]?.message?.content || "Não foi possível gerar explicação.";

    // Etapa 2: Criar vídeo com D-ID
    const didResponse = await fetch("https://api.d-id.com/talks", {
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
            voice_id: "brazilian_portuguese_male" // ou use outro voice_id válido
          },
        },
        source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle.jpg"
      }),
    });

    const videoData = await didResponse.json();
    const videoUrl = `https://studio.d-id.com/player/${videoData.id}`;

    // Retornar texto e link do vídeo
    return res.json({
      message: explanation,
      videoUrl,
    });

  } catch (err) {
    console.error("Erro no backend:", err);
    return res.status(500).json({ error: "Erro no servidor", detail: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
