// Baixa escudos e logos de competições de media.api-sports.io
// Execute: node scripts/baixar-escudos.mjs

import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { pipeline } from 'stream/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.join(__dirname, '..', 'public')

mkdirSync(path.join(PUBLIC, 'logos', 'times'), { recursive: true })
mkdirSync(path.join(PUBLIC, 'logos', 'competicoes'), { recursive: true })
mkdirSync(path.join(PUBLIC, 'logos', 'federacoes'), { recursive: true })

const BASE_TEAMS  = 'https://media.api-sports.io/football/teams'
const BASE_LEAGUE = 'https://media.api-sports.io/football/leagues'

// ── Times ────────────────────────────────────────────────────────────────────
const TIMES = [
  // ── Brasileirão Série A 2026 (20 clubes confirmados) ──
  { id: 'flamengo',      apiId: 127,  nome: 'Flamengo'                },
  { id: 'palmeiras',     apiId: 121,  nome: 'Palmeiras'               },
  { id: 'corinthians',   apiId: 131,  nome: 'Corinthians'             },
  { id: 'sao-paulo',     apiId: 126,  nome: 'São Paulo'               },
  { id: 'botafogo',      apiId: 130,  nome: 'Botafogo'                },
  { id: 'fluminense',    apiId: 124,  nome: 'Fluminense'              },
  { id: 'vasco',         apiId: 133,  nome: 'Vasco da Gama'           },
  { id: 'atletico-mg',   apiId: 128,  nome: 'Atlético Mineiro'        },
  { id: 'cruzeiro',      apiId: 123,  nome: 'Cruzeiro'                },
  { id: 'gremio',        apiId: 125,  nome: 'Grêmio'                  },
  { id: 'internacional', apiId: 119,  nome: 'Internacional'           },
  { id: 'athletico-pr',  apiId: 118,  nome: 'Athletico Paranaense'    },
  { id: 'bahia',         apiId: 132,  nome: 'Bahia'                   },
  { id: 'bragantino',    apiId: 138,  nome: 'RB Bragantino'           }, // TODO: 137=Figueirense, 138 a confirmar
  { id: 'santos',        apiId: 129,  nome: 'Santos'                  },
  { id: 'vitoria',       apiId: 143,  nome: 'Vitória'                 },
  { id: 'mirassol',      apiId: 2484, nome: 'Mirassol'                },
  { id: 'chapecoense',   apiId: 160,  nome: 'Chapecoense'             },
  { id: 'coritiba',      apiId: 122,  nome: 'Coritiba'                },
  { id: 'remo',          apiId: 1198, nome: 'Remo'                    },

  // ── Outros times brasileiros relevantes ──
  { id: 'fortaleza',     apiId: 154,  nome: 'Fortaleza'               },
  { id: 'sport',         apiId: 136,  nome: 'Sport Recife'            },
  { id: 'america-mg',    apiId: 134,  nome: 'América Mineiro'         },
  { id: 'juventude',     apiId: 157,  nome: 'Juventude'               },
  { id: 'ceara',         apiId: 152,  nome: 'Ceará'                   },
  { id: 'goias',         apiId: 135,  nome: 'Goiás'                   },
  { id: 'cuiaba',        apiId: 1193, nome: 'Cuiabá'                  },
  { id: 'csa',           apiId: 1199, nome: 'CSA'                     },
  { id: 'avai',          apiId: 139,  nome: 'Avaí'                    },

  // ── Mundial de Clubes 2025 — UEFA (12) ──
  { id: 'real-madrid',   apiId: 541,  nome: 'Real Madrid'             },
  { id: 'manchester-city',apiId: 50,  nome: 'Manchester City'         },
  { id: 'bayern',        apiId: 157,  nome: 'Bayern Munich'           },
  { id: 'psg',           apiId: 85,   nome: 'Paris Saint-Germain'     },
  { id: 'chelsea',       apiId: 49,   nome: 'Chelsea'                 },
  { id: 'inter-milan',   apiId: 505,  nome: 'Inter Milan'             },
  { id: 'juventus',      apiId: 496,  nome: 'Juventus'                },
  { id: 'porto',         apiId: 212,  nome: 'Porto'                   },
  { id: 'benfica',       apiId: 211,  nome: 'Benfica'                 },
  { id: 'atletico-madrid',apiId: 530, nome: 'Atlético Madrid'         },
  { id: 'dortmund',      apiId: 165,  nome: 'Borussia Dortmund'       },
  { id: 'rb-salzburg',   apiId: 322,  nome: 'RB Salzburg'             },

  // ── Mundial de Clubes 2025 — CONMEBOL (6) ──
  { id: 'river-plate',   apiId: 435,  nome: 'River Plate'             },
  { id: 'boca-juniors',  apiId: 451,  nome: 'Boca Juniors'            },

  // ── Mundial de Clubes 2025 — CONCACAF (4) ──
  { id: 'inter-miami',   apiId: 1896, nome: 'Inter Miami'             },
  { id: 'pachuca',       apiId: 2292, nome: 'CF Pachuca'              },
  { id: 'leon',          apiId: 1946, nome: 'Club León'               },
  { id: 'seattle',       apiId: 1601, nome: 'Seattle Sounders'        },

  // ── Mundial de Clubes 2025 — CAF (4) ──
  { id: 'al-ahly',       apiId: 1485, nome: 'Al Ahly'                 },
  { id: 'wydad',         apiId: 1487, nome: 'Wydad AC'                },
  { id: 'sundowns',      apiId: 3416, nome: 'Mamelodi Sundowns'       },
  { id: 'es-tunis',      apiId: 3413, nome: 'ES Tunis'                },

  // ── Mundial de Clubes 2025 — AFC (4) ──
  { id: 'al-hilal',      apiId: 2932, nome: 'Al Hilal'                },
  { id: 'al-ain',        apiId: 2934, nome: 'Al Ain'                  },
  { id: 'urawa',         apiId: 2308, nome: 'Urawa Red Diamonds'      },
  { id: 'ulsan',         apiId: 2302, nome: 'Ulsan HD'                },

  // ── Mundial de Clubes 2025 — OFC (1) ──
  { id: 'auckland-city', apiId: 3819, nome: 'Auckland City'           },

  // ── Libertadores 2026 — Argentina ──
  { id: 'racing',        apiId: 436,  nome: 'Racing Club'             },
  { id: 'independiente', apiId: 453,  nome: 'Independiente'           },
  { id: 'estudiantes',   apiId: 450,  nome: 'Estudiantes'             },
  { id: 'lanus',         apiId: 446,  nome: 'Lanús'                   },
  { id: 'rosario',       apiId: 437,  nome: 'Rosario Central'         },
  { id: 'platense',      apiId: 3426, nome: 'Platense'                },

  // ── Libertadores 2026 — Outros CONMEBOL ──
  { id: 'nacional-uy',   apiId: 2356, nome: 'Nacional (UY)'           },
  { id: 'penarol',       apiId: 1837, nome: 'Peñarol'                 },
  { id: 'olimpia',       apiId: 1182, nome: 'Olimpia'                 },
  { id: 'ldu-quito',     apiId: 1158, nome: 'LDU Quito'               },
  { id: 'always-ready',  apiId: 1837, nome: 'Always Ready'            }, // id a verificar
  { id: 'bolivar',       apiId: 1830, nome: 'Bolívar'                 },
  { id: 'colo-colo',     apiId: 2315, nome: 'Colo-Colo'               },
  { id: 'atletico-nacional',apiId: 1137, nome: 'Atlético Nacional'    },
  { id: 'barcelona-sc',  apiId: 1152, nome: 'Barcelona SC'            },
  { id: 'alianza-lima',  apiId: 2553, nome: 'Alianza Lima'            },
  { id: 'cerro-porteno', apiId: 1176, nome: 'Cerro Porteño'           },
  { id: 'caracas',       apiId: 2279, nome: 'Caracas FC'              },

  // ── Libertadores 2026 — Mirassol ──
  // (já listado acima como time do Brasileirão)
]

// ── Ligas / Competições ───────────────────────────────────────────────────────
const LIGAS = [
  // Brasil
  { id: 'brasileirao',    apiId: 71,  nome: 'Brasileirão Série A'        },
  { id: 'brasileirao-b',  apiId: 72,  nome: 'Brasileirão Série B'        },
  { id: 'brasileirao-c',  apiId: 74,  nome: 'Brasileirão Série C'        },
  { id: 'brasileirao-d',  apiId: 499, nome: 'Brasileirão Série D'        },
  { id: 'copa-brasil',    apiId: 73,  nome: 'Copa do Brasil'             },
  { id: 'carioca',        apiId: 75,  nome: 'Campeonato Carioca'         },
  { id: 'paulista',       apiId: 76,  nome: 'Campeonato Paulista'        },
  { id: 'gaucho',         apiId: 87,  nome: 'Campeonato Gaúcho'          },
  { id: 'mineiro',        apiId: 80,  nome: 'Campeonato Mineiro'         },
  { id: 'baiano',         apiId: 83,  nome: 'Campeonato Baiano'          },
  { id: 'nordeste',       apiId: 492, nome: 'Copa do Nordeste'           },
  // CONMEBOL
  { id: 'libertadores',   apiId: 13,  nome: 'CONMEBOL Libertadores'      },
  { id: 'sulamericana',   apiId: 11,  nome: 'CONMEBOL Sul-Americana'     },
  { id: 'recopa',         apiId: 14,  nome: 'Recopa Sul-Americana'       },
  { id: 'mundial-25',     apiId: 15,  nome: 'Mundial de Clubes 2025'     },
  // UEFA
  { id: 'champions',      apiId: 2,   nome: 'UEFA Champions League'      },
  { id: 'europa',         apiId: 3,   nome: 'UEFA Europa League'         },
  { id: 'conference',     apiId: 848, nome: 'UEFA Conference League'     },
  { id: 'premier',        apiId: 39,  nome: 'Premier League'             },
  { id: 'laliga',         apiId: 140, nome: 'La Liga'                    },
  { id: 'seriea-it',      apiId: 135, nome: 'Serie A Italiana'           },
  { id: 'bundesliga',     apiId: 78,  nome: 'Bundesliga'                 },
  { id: 'ligue1',         apiId: 61,  nome: 'Ligue 1'                    },
]

// ── Federações ────────────────────────────────────────────────────────────────
const FEDERACOES = [
  { id: 'cbf',      apiId: 6,    nome: 'CBF (Brasil)',   dir: 'federacoes' },
  { id: 'argentina',apiId: 6,    nome: 'AFA (Argentina)',dir: 'federacoes' }, // id seleção
]

async function baixar(url, destPath, forcar = false) {
  if (!forcar && existsSync(destPath)) {
    return 'skip'
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return false
    await pipeline(res.body, createWriteStream(destPath))
    return true
  } catch {
    return false
  }
}

async function main() {
  const forcar = process.argv.includes('--force')

  console.log('\n📥 Baixando escudos de times...\n')
  const falhas = []
  for (const t of TIMES) {
    const url  = `${BASE_TEAMS}/${t.apiId}.png`
    const dest = path.join(PUBLIC, 'logos', 'times', `${t.id}.png`)
    const r    = await baixar(url, dest, forcar)
    const icon = r === 'skip' ? '⏭️ ' : r ? '✅' : '❌'
    console.log(`${icon} ${t.nome.padEnd(30)} [id:${t.apiId}]`)
    if (!r || r === false) falhas.push(t)
  }

  console.log('\n📥 Baixando logos de ligas/competições...\n')
  for (const l of LIGAS) {
    const url  = `${BASE_LEAGUE}/${l.apiId}.png`
    const dest = path.join(PUBLIC, 'logos', 'competicoes', `${l.id}.png`)
    const r    = await baixar(url, dest, forcar)
    const icon = r === 'skip' ? '⏭️ ' : r ? '✅' : '❌'
    console.log(`${icon} ${l.nome.padEnd(35)} [id:${l.apiId}]`)
  }

  console.log('\n📥 Baixando logos de federações...\n')
  const cbf = await baixar(`${BASE_TEAMS}/6.png`, path.join(PUBLIC, 'logos', 'federacoes', 'cbf.png'), forcar)
  console.log(`${cbf === 'skip' ? '⏭️ ' : cbf ? '✅' : '❌'} CBF`)

  if (falhas.length > 0) {
    console.log(`\n⚠️  ${falhas.length} time(s) com erro — IDs possivelmente incorretos:`)
    falhas.forEach(t => console.log(`   ${t.nome} (apiId: ${t.apiId})`))
    console.log('\n   Rode com --force para forçar re-download de todos.')
  }

  console.log('\n✅ Concluído!\n')
}

main()
