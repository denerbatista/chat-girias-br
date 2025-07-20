import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import gTTS from "gtts";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const cache = {}; // memória temporária para evitar requisições duplicadas

// 🔹 ROTA /api/chat
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  console.log("📩 [CHAT] Prompt recebido:", prompt);

  // Verifica se já existe resposta no cache
  if (cache[prompt]) {
    console.log("📦 [CHAT] Cache HIT - reutilizando resposta");
    return res.json({ message: cache[prompt] });
  }

  try {
    console.log("📤 [CHAT] Enviando requisição para OpenAI...");
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
    console.log("📥 [CHAT] Resposta recebida da OpenAI:", data);

    const message = data?.choices?.[0]?.message?.content;
    if (!message) {
      console.warn("⚠️ [CHAT] Nenhuma mensagem válida retornada.");
      return res.status(500).json({ error: "Resposta inválida da OpenAI." });
    }

    // Salva no cache
    cache[prompt] = message;

    console.log("✅ [CHAT] Enviando resposta ao cliente.");
    return res.json({ message });
  } catch (error) {
    console.error("❌ [CHAT] Erro:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 🔊 ROTA /api/audio (streaming direto)
app.post("/api/audio", (req, res) => {
  const { text } = req.body;
  console.log("🎤 [AUDIO] Texto recebido para áudio:", text);

  try {
    const gtts = new gTTS(text, "pt");

    // Configura cabeçalhos
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": "inline; filename=audio.mp3",
    });

    console.log("🎧 [AUDIO] Iniciando stream de áudio para o cliente...");

    const stream = gtts.stream();

    // Logs de eventos do stream
    stream.on("error", (err) => {
      console.error("❌ [AUDIO] Erro durante o stream:", err);
      res.status(500).json({ error: "Erro ao gerar áudio." });
    });

    stream.on("end", () => {
      console.log("✅ [AUDIO] Stream de áudio finalizado com sucesso.");
    });

    stream.pipe(res); // Envia direto sem salvar
  } catch (error) {
    console.error("❌ [AUDIO] Erro ao processar áudio:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`);
});
