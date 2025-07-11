// api/generate.js

import fs from 'fs';
import path from 'path';
import axios from 'axios';

const key1 = process.env.KEY1;
const key2 = process.env.KEY2;

console.log('🔑 KEY1 present?', !!key1);
console.log('🔑 KEY2 present?', !!key2);

async function callModel(prompt, model, key) {
  try {
    console.log(`→ callModel: model=${model}`);
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content:
              "Tu es Adam_DH7, un assistant haïtien de 15 ans, membre du groupe TF. " +
              "Tu es intelligent, snob, patient. Tu réponds seulement si on te demande. " +
              "Tu peux répondre en HTML/CSS/JS si nécessaire. " +
              "Tu as -7 secondes pour réfléchir." 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    console.log('✅ model response received');
    return res.data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('❌ callModel error:', err.response?.data || err.message);
    return null;
  }
}

export default async function handler(req, res) {
  console.log('--- /api/generate invoked ---');
  try {
    if (req.method !== 'POST') {
      console.warn('Method not allowed:', req.method);
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Only POST allowed' });
    }

    const { prompt } = req.body || {};
    console.log('Prompt:', prompt?.slice(0, 100));

    if (!prompt || typeof prompt !== 'string') {
      console.warn('Invalid prompt');
      return res.status(400).json({ error: 'Missing or invalid `prompt`' });
    }
    if (!key1 && !key2) {
      console.error('No API keys set');
      return res.status(500).json({ error: 'Server misconfiguration: missing keys' });
    }

    // 1) Dolphin
    let output = key1
      ? await callModel(prompt, 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', key1)
      : null;

    // 2) Fallback Cypher
    if (!output && key2) {
      console.log('Falling back to Cypher');
      output = await callModel(prompt, 'openrouter/cypher-alpha:free', key2);
    }

    if (!output) {
      console.error('No output from any model');
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    // Write safe HTML
    const safeHTML = output.replace(/<script/gi, '&lt;script');
    const outPath = path.join(process.cwd(), 'public', 'output.html');
    fs.writeFileSync(outPath, safeHTML, 'utf8');
    console.log('Wrote output.html');

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Handler unexpected error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
              }
