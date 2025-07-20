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

// 🔁 Suporte para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 📦 Arquivo de cache
const CACHE_FILE = path.join(__dirname, "cache", "responses.json");

// 🔧 Inicializa pasta e cache se não existir
fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
if (!fs.existsSync(CACHE_FILE)) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({}));
}

// 📂 Funções de leitura e escrita no cache
function loadCache() {
  const data = fs.readFileSync(CACHE_FILE);
  return JSON.parse(data);
}

function saveToCache(prompt, message, fileName) {
  const cache = loadCache();
  cache[prompt] = { message, fileName };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// 🧠 Geração de texto com OpenAI
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  console.log("🔹 [CHAT] Prompt recebido:", prompt);

  const cache = loadCache();
  if (cache[prompt]?.message) {
    console.log("♻️ [CHAT] Resposta encontrada no cache.");
    return res.json({ message: cache[prompt].message });
  }

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

// 🔊 Geração de áudio com GTTS e cache
app.post("/api/audio", async (req, res) => {
  const { text } = req.body;
  console.log("🔹 [AUDIO] Texto recebido para áudio:", text);

  const cache = loadCache();
  const prompt = Object.keys(cache).find((key) => cache[key].message === text);
  if (prompt && cache[prompt]?.fileName) {
    console.log("♻️ [AUDIO] Áudio encontrado no cache:", cache[prompt].fileName);
    return res.json({ audioUrl: `/audios/${cache[prompt].fileName}` });
  }

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

      if (prompt) {
        saveToCache(prompt, text, fileName);
      }

      console.log("✅ [AUDIO] Áudio gerado e salvo:", fileName);
      return res.json({ audioUrl: `/audios/${fileName}` });
    });
  } catch (error) {
    console.error("❌ [AUDIO] Erro:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 🌐 Servir arquivos estáticos de áudio
app.use("/audios", express.static(path.join(__dirname, "audios")));

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
