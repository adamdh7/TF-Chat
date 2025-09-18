// pages/api/generate.js
import fs from 'fs'
import path from 'path'
import axios from 'axios'

const MODELS = [
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  'openrouter/cypher-alpha:free'
]

// Li kle yo soti nan .env
const PRIMARY_KEY = process.env.OPENROUTER_API_KEY
const FALLBACK_KEY = process.env.OPENROUTER_FALLBACK_KEY // optional

async function callModel(prompt, model, key) {
  if (!key) return null
  try {
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
              "Ne dis jamais tout sur toi si on ne te l'a pas demandé."
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
        timeout: 60_000
      }
    )

    // Plusieurs formats de réponse possibles selon l'API
    const data = res.data || {}
    // 1) Format type OpenAI-like: choices[0].message.content
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content
    }
    // 2) Format alternatif: choices[0].text
    if (data.choices?.[0]?.text) {
      return data.choices[0].text
    }
    // 3) Output array style
    if (data.output?.[0]?.content) {
      // content peut être chaîne ou tableau d'obj
      if (typeof data.output[0].content === 'string') return data.output[0].content
      if (Array.isArray(data.output[0].content)) {
        // concatene tout text ki la
        return data.output[0].content.map(c => c.text || c).join('\n')
      }
    }
    // 4) fallback: tout string nan data si anyen pa mache
    if (typeof data === 'string') return data
    return null
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

  const keys = [PRIMARY_KEY, FALLBACK_KEY].filter(Boolean)
  if (keys.length === 0) {
    return res.status(500).json({
      error:
        'Aucun API key trouvé. Mettez OPENROUTER_API_KEY (et optionnel OPENROUTER_FALLBACK_KEY) dans .env'
    })
  }

  let output = null
  // Eseye chak kle epi chak modèl jiskaske ou jwenn rezilta
  for (const key of keys) {
    for (const model of MODELS) {
      output = await callModel(prompt, model, key)
      if (output) {
        console.log(`✅ Réponse obtenue avec model=${model} key=${key === PRIMARY_KEY ? 'PRIMARY' : 'FALLBACK'}`)
        break
      }
    }
    if (output) break
  }

  if (!output) {
    return res.status(500).json({ error: 'Impossible de générer la réponse AI après plusieurs essais.' })
  }

  // Sécuriser le HTML – on échappe les balises <script> (ouverture et fermeture)
  const safeHTML = String(output)
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')

  // Ecrire dans public/output.html (créé dossier public si pa egziste)
  try {
    const publicDir = path.join(process.cwd(), 'public')
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
    const outPath = path.join(publicDir, 'output.html')
    fs.writeFileSync(outPath, safeHTML, 'utf8')
  } catch (err) {
    console.error('❌ Erreur écriture fichier public/output.html:', err.message)
    // Nou pa fail totalman si ekriti echwe — retounen repons kèlkeswa sa
  }

  return res.status(200).json({ success: true, html: safeHTML })
  }
