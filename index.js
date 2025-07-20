import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;
const OPENAI_KEY = process.env.OPENAI_KEY;
const D_ID_API_KEY = process.env.DID_API_KEY;
const D_ID_URL = "https://api.d-id.com";
const D_ID_AUDIO_ENDPOINT = "/tts";

// 🧠 Rota de geração de texto
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  console.log("🔹 [CHAT] Prompt recebido:", prompt);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    console.log("✅ [CHAT] Resposta da OpenAI:", data);

    const message = data?.choices?.[0]?.message?.content;
    if (!message) {
      console.warn("⚠️ [CHAT] Nenhuma mensagem encontrada na resposta.");
      return res.status(500).json({ error: "Resposta inválida da OpenAI." });
    }

    return res.json({ message });
  } catch (error) {
    console.error("❌ [CHAT] Erro:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 🔊 Rota de geração de áudio
app.post("/api/audio", async (req, res) => {
  const { text } = req.body;
  console.log("🔹 [AUDIO] Texto recebido para áudio:", text);

  try {
    const response = await fetch(`${D_ID_URL}${D_ID_AUDIO_ENDPOINT}`, {
      method: "POST",
      headers: {
        "x-api-key": D_ID_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: "linda", // ou outra voz disponível
      }),
    });

    const result = await response.json();
    console.log("✅ [AUDIO] Resposta da D-ID:", result);

    if (result?.audioUrl) {
      return res.json({ audioUrl: result.audioUrl });
    } else {
      console.warn("⚠️ [AUDIO] Nenhum audioUrl encontrado.");
      return res.status(500).json({ error: "URL de áudio não recebida." });
    }
  } catch (error) {
    console.error("❌ [AUDIO] Erro ao gerar áudio:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
