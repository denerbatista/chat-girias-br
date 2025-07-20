import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔊 Rota para gerar link de áudio com fala (TTS)
app.post("/api/audio", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Texto ausente" });

  try {
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=pt-BR&client=tw-ob`;

    res.json({ audioUrl });
  } catch (err) {
    console.error("Erro ao gerar áudio:", err.message);
    res.status(500).json({ error: "Erro ao gerar áudio", detail: err.message });
  }
});

// 🧠 Rota de chat com OpenAI
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt ausente" });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "Não consegui explicar.";
    res.json({ message });
  } catch (err) {
    console.error("Erro no /chat:", err.message);
    res.status(500).json({ error: "Erro na OpenAI", detail: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
