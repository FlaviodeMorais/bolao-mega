import { createWriteStream, mkdirSync } from 'fs'
import { pipeline } from 'stream/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TMP = path.join(__dirname, '..', 'public', 'logos', '_tmp')
mkdirSync(TMP, { recursive: true })

// Searching for remaining South American clubs
// Peru confirmed at 2539+, need Chile/Uruguay/Paraguay/Bolivia/Venezuela/Ecuador
const ranges = [
  ...Array.from({length: 60}, (_, i) => 2550 + i),   // 2550-2609 (more Peru/South America?)
  ...Array.from({length: 60}, (_, i) => 1140 + i),   // 1140-1199 (more Colombia/Venezuela?)
  ...Array.from({length: 60}, (_, i) => 1200 + i),   // 1200-1259 (Paraguay/Uruguay/Bolivia?)
  ...Array.from({length: 60}, (_, i) => 2270 + i),   // 2270-2329 (Chile? Mexico confirmed 2279-2289)
  ...Array.from({length: 60}, (_, i) => 2610 + i),   // 2610-2669
]

const candidatos = ranges.map(id => ({ id, nome: `id-${id}` }))

for (const c of candidatos) {
  const url  = `https://media.api-sports.io/football/teams/${c.id}.png`
  const dest = path.join(TMP, `${c.nome}.png`)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      await pipeline(res.body, createWriteStream(dest))
      process.stdout.write(`✅ ${c.id} `)
    } else {
      process.stdout.write(`✗${c.id} `)
    }
  } catch {
    process.stdout.write(`E${c.id} `)
  }
}
console.log('\nPronto — verifique public/logos/_tmp/')
