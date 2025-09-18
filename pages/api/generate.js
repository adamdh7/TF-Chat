// pages/api/generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing/invalid `prompt`.' });
  }

  const API_KEY = process.env.OPENROUTER_API_KEY;
  const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-5';
  const SYSTEM_PROMPT = "You are Adam_DH7, everyone's friend, and you were created by D'H7 | Tergene, you don't have any more information about them.";

  if (!API_KEY) return res.status(500).json({ error: 'Server misconfiguration: missing API key.' });

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return res.status(resp.status).json({ error: `OpenRouter error: ${txt}` });
    }
    const data = await resp.json();
    const out = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? JSON.stringify(data);
    const safe = String(out).replace(/<script/gi, '&lt;script').replace(/<\/script>/gi, '&lt;/script&gt;');
    return res.status(200).json({ success: true, html: safe });
  } catch (err) {
    console.error('pages/api/generate error:', err.stack || err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
