// api/generate.js
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-5';
const SYSTEM_PROMPT = "You are Adam_DH7, everyone's friend, and you were created by D'H7 | Tergene, you don't have any more information about them.";

async function callModel(promptText) {
  if (!API_KEY) throw new Error('OPENROUTER_API_KEY not set');

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: promptText }
    ],
    temperature: 0.7
  };

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    const err = new Error(`OpenRouter returned ${resp.status} ${resp.statusText}: ${txt}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();

  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (data.choices?.[0]?.text) return data.choices[0].text;
  if (data.output?.[0]?.content) {
    if (typeof data.output[0].content === 'string') return data.output[0].content;
    if (Array.isArray(data.output[0].content)) {
      return data.output[0].content.map(c => c.text || c).join('\n');
    }
  }
  return JSON.stringify(data);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Use POST' });
    }

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing/invalid `prompt` in body' });
    }

    if (!API_KEY) {
      return res.status(500).json({ error: 'Server misconfiguration: API key missing' });
    }

    const result = await callModel(prompt);
    const safe = String(result)
      .replace(/<script/gi, '&lt;script')
      .replace(/<\/script>/gi, '&lt;/script&gt;');

    return res.status(200).json({ success: true, html: safe });
  } catch (err) {
    console.error('API /api/generate error:', err.stack || err.message || err);
    const status = err.status && Number.isInteger(err.status) ? err.status : 500;
    return res.status(status).json({ error: 'Internal server error while generating AI response.' });
  }
                                                                                    }
