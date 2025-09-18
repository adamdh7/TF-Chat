// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-5';
const SYSTEM_PROMPT = "You are Adam_DH7, everyone's friend, and you were created by D'H7 | Tergene, you don't have any more information about them.";

async function callModel(promptText) {
  if (!API_KEY) throw Object.assign(new Error('OPENROUTER_API_KEY not set'), { status: 500 });
  const payload = { model: MODEL, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: promptText }], temperature: 0.7 };
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!resp.ok) {
    const body = await resp.text().catch(()=>'');
    const err = new Error(`OpenRouter ${resp.status}: ${body}`);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (data.choices?.[0]?.text) return data.choices[0].text;
  return JSON.stringify(data);
}

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing/invalid prompt' });
    const result = await callModel(prompt);
    const safe = String(result).replace(/<script/gi, '&lt;script').replace(/<\/script>/gi, '&lt;/script&gt;');
    res.json({ success: true, html: safe });
  } catch (err) {
    console.error('/api/generate error:', err.stack||err.message||err);
    const status = (err.status && Number.isInteger(err.status)) ? err.status : 500;
    res.status(status).json({ error: 'Internal server error' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`TF-Chat listening ${PORT}`));
