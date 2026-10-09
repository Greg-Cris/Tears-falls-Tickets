import crypto from "node:crypto";
import { gunzipSync } from "node:zlib";

function error(res, status, message) {
  return res.status(status).json({ error: message });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return error(res, 405, "Método não permitido.");

  const { c, m, sig } = req.query || {};
  if (!/^\d{17,20}$/.test(String(c || "")) || !/^\d{17,20}$/.test(String(m || "")) || !/^[a-f0-9]{64}$/i.test(String(sig || ""))) {
    return error(res, 400, "Link inválido.");
  }
  const secret = process.env.TRANSCRIPT_LINK_SECRET;
  if (!secret) return error(res, 500, "Transcript não configurado.");
  const raw = `transcript.v1.${c}.${m}`;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const provided = String(sig).toLowerCase();
  if (expected.length !== provided.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    return error(res, 401, "Link inválido.");
  }

  const token = process.env.DISCORD_READER_TOKEN;
  const botId = process.env.TRANSCRIPT_BOT_USER_ID;
  if (!token || !botId) return error(res, 500, "Leitor do Discord não configurado.");
  try {
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${c}/messages/${m}`, { headers: { Authorization: `Bot ${token}` } });
    if (msgRes.status === 404) return error(res, 404, "Transcript não encontrado.");
    if (msgRes.status === 429 || msgRes.status >= 500) return error(res, 503, "Discord temporariamente indisponível. Tente novamente.");
    if (!msgRes.ok) return error(res, 502, "Não foi possível consultar o Discord.");
    const discordMessage = await msgRes.json();
    if (String(discordMessage.author?.id) !== String(botId)) return error(res, 404, "Transcript não encontrado.");
    const attachment = (discordMessage.attachments || []).find(a => /^(?:SPOILER_)?transcript_[^/]+\.json(?:\.gz)?$/i.test(a.filename || ""));
    if (!attachment?.url) return error(res, 404, "Transcript não encontrado.");
    const fileRes = await fetch(attachment.url);
    if (!fileRes.ok) return error(res, 503, "Não foi possível baixar o transcript do Discord.");
    const bytes = Buffer.from(await fileRes.arrayBuffer());
    const rawFile = attachment.filename.toLowerCase().endsWith(".gz") ? gunzipSync(bytes) : bytes;
    return res.status(200).json(JSON.parse(rawFile.toString("utf8")));
  } catch (err) {
    console.error("Erro ao ler transcript:", err.name || "Error");
    return error(res, 502, "Não foi possível carregar o transcript.");
  }
}
