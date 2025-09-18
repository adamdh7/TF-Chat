// pages/api/generate.js

import fs from 'fs'
import path from 'path'
import axios from 'axios'

const key1 = process.env.KEY1
const key2 = process.env.KEY2

async function callModel(prompt, model, key) {
  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content:
              "You are Adam_D'H7, everyone's friend, you were created by D'H7 | Tergene, you don't have more information about them "
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      }
    )
    return res.data.choices[0].message.content
  } catch (err) {
    console.error('❌ Erreur API pour', model, ':', err.response?.data || err.message)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { prompt } = req.body
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Paramètre `prompt` manquant ou invalide.' })
  }

  // Premier essai avec Dolphin
  let output = await callModel(
    prompt,
    'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    key1
  )

  // Fallback sur Cypher si besoin
  if (!output) {
    output = await callModel(
      prompt,
      'openrouter/cypher-alpha:free',
      key2
    )
  }

  if (!output) {
    return res.status(500).json({ error: 'Impossible de générer la réponse AI.' })
  }

  // Sécuriser le HTML – on échappe seulement les <script>
  const safeHTML = output.replace(/<script/gi, '&lt;script')

  // Écrire dans public/output.html
  const outPath = path.join(process.cwd(), 'public', 'output.html')
  fs.writeFileSync(outPath, safeHTML, 'utf8')

  return res.status(200).json({ success: true })
        }
