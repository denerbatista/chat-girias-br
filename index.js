import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pkg from "uuid";
const { v4: uuidv4 } = pkg;
import gTTS from "gtts";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Para funcionar com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🧠 Rota de geração de texto (sem alterações)
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  console.log("🔹 [CHAT] Prompt recebido:", prompt);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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
      console.warn("⚠️ [CHAT] Nenhuma mensagem encontrada.");
      return res.status(500).json({ error: "Resposta inválida da OpenAI." });
    }

    return res.json({ message });
  } catch (error) {
    console.error("❌ [CHAT] Erro:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 🔊 Rota de geração de áudio com GTTS
app.post("/api/audio", async (req, res) => {
  const { text } = req.body;
  console.log("🔹 [AUDIO] Texto recebido para áudio:", text);

  try {
    const fileName = `audio-${uuidv4()}.mp3`;
    const audioDir = path.join(__dirname, "audios");
    const filePath = path.join(audioDir, fileName);

    fs.mkdirSync(audioDir, { recursive: true });

    const gtts = new gTTS(text, "pt");
    gtts.save(filePath, (err) => {
      if (err) {
        console.error("❌ [AUDIO] Erro ao salvar MP3:", err);
        return res.status(500).json({ error: "Erro ao salvar áudio." });
      }
      console.log("✅ [AUDIO] Áudio salvo:", filePath);
      return res.json({ audioUrl: `/audios/${fileName}` });
    });
  } catch (error) {
    console.error("❌ [AUDIO] Erro ao gerar áudio:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 🗂 Servir os áudios salvos
app.use("/audios", express.static(path.join(__dirname, "audios")));

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
