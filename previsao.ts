// Referência para a tela (não vai para o teleprompter)
// previsao.ts
import { tool } from '@strands-agents/sdk'
import { z } from 'zod'

const API = 'https://brasilapi.com.br/api/cptec/v1'

type Cidade = { nome: string; id: number; estado: string }
type Dia = { data: string; condicao_desc: string; min: number; max: number }

// Compara nomes sem acentos e sem diferença entre maiúsculas e minúsculas
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const diaDaSemana = (data: string) =>
  new Date(`${data}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })

export const previsaoDoTempo = tool({
  name: 'previsao_do_tempo',
  description:
    'Busca a previsão do tempo do CPTEC/INPE para uma cidade brasileira, de 1 a 6 dias. ' +
    'Devolve a data, o dia da semana, a condição e as temperaturas mínima e máxima de cada dia. ' +
    'Se houver mais de uma cidade com esse nome, devolve as opções para você perguntar qual é.',
  inputSchema: z.object({
    cidade: z.string().describe('Nome da cidade, por exemplo "Recife"'),
    uf: z.string().length(2).optional().describe('Sigla do estado, por exemplo "PE"'),
    dias: z.number().int().min(1).max(6).default(6).describe('Quantos dias de previsão, de 1 a 6'),
  }),
  callback: async ({ cidade, uf, dias }) => {
    try {
      const busca = await fetch(`${API}/cidade/${encodeURIComponent(cidade)}`)
      if (busca.status === 404) return `Não encontrei a cidade "${cidade}". Peça para a pessoa conferir o nome.`
      if (!busca.ok) throw new Error(`a busca da cidade respondeu ${busca.status}`)

      const encontradas: Cidade[] = await busca.json()
      const mesmoNome = encontradas.filter((c) => normalizar(c.nome) === normalizar(cidade))
      const candidatas = (mesmoNome.length > 0 ? mesmoNome : encontradas).filter(
        (c) => !uf || c.estado === uf.toUpperCase(),
      )
      if (candidatas.length === 0) return `Não encontrei "${cidade}" em ${uf}. Peça para a pessoa conferir a cidade e a UF.`
      if (candidatas.length > 1) {
        return { pergunte_qual_cidade: candidatas.slice(0, 5).map((c) => `${c.nome} (${c.estado})`) }
      }

      const resposta = await fetch(`${API}/clima/previsao/${candidatas[0].id}/${dias}`)
      if (!resposta.ok) throw new Error(`a previsão respondeu ${resposta.status}`)
      const previsao: { cidade: string; estado: string; clima: Dia[] } = await resposta.json()

      return {
        cidade: previsao.cidade,
        uf: previsao.estado,
        dias: previsao.clima.map((d) => ({
          data: d.data,
          dia_da_semana: diaDaSemana(d.data),
          condicao: d.condicao_desc,
          min: d.min,
          max: d.max,
        })),
      }
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro)
      return `Não consegui consultar a BrasilAPI agora (${motivo}). Avise a pessoa e sugira tentar de novo em alguns minutos.`
    }
  },
})