// pages/api/generate.js
import fs from 'fs'
import path from 'path'
import axios from 'axios'

const API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-5'

if (!API_KEY) {
  console.warn('⚠️ OPENROUTER_API_KEY pa defini nan .env')
}

const SYSTEM_PROMPT = "You are Adam_DH7, everyone's friend, and you were created by D'H7 | Tergene, you don't have any more information about them."

async function callModel(prompt) {
  if (!API_KEY) return null
  try {
    const resp = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60_000
      }
    )

    const data = resp.data || {}
    // Common OpenRouter/OpenAI-like response shapes
    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content
    if (data.choices?.[0]?.text) return data.choices[0].text
    if (typeof data === 'string') return data
    // Try to handle other shapes gracefully
    if (data.output?.[0]?.content) {
      if (typeof data.output[0].content === 'string') return data.output[0].content
      if (Array.isArray(data.output[0].content)) {
        return data.output[0].content.map(c => c.text || c).join('\n')
      }
    }
    return JSON.stringify(data)
  } catch (err) {
    console.error('❌ OpenRouter API error:', err.response?.data || err.message)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' })
  }

  const { prompt } = req.body
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Paramètre `prompt` manquant ou invalide.' })
  }

  if (!API_KEY) {
    return res.status(500).json({
      error:
        'OPENROUTER_API_KEY manke. Mete li nan .env (eg: OPENROUTER_API_KEY=sk-or-...) epi rekòmanse server la.'
    })
  }

  const output = await callModel(prompt)

  if (!output) {
    return res.status(500).json({ error: 'Impossible de générer la réponse AI.' })
  }

  // Sekirize HTML (escape <script> tags)
  const safeHTML = String(output)
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')

  // (Opsyonèl) ekri rezilta nan public/output.html si w vle
  try {
    const publicDir = path.join(process.cwd(), 'public')
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
    fs.writeFileSync(path.join(publicDir, 'output.html'), safeHTML, 'utf8')
  } catch (e) {
    // pa blokè si ekriti echwe
    console.warn('Pa kapab ekri public/output.html:', e.message)
  }

  return res.status(200).json({ success: true, html: safeHTML })
            }
