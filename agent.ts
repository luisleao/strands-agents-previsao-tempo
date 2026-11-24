import { createHarness } from '@strands-agents/harness'
import { previsaoDoTempo } from './previsao'

const instrucoes = `Você é um assistente de previsão do tempo para cidades brasileiras.
Responda sempre em português do Brasil, de forma curta.
Na resposta, informe a cidade e a UF, o dia (dia da semana e data), a condição e as temperaturas mínima e máxima em °C.
A previsão informa a condição do tempo, não a chance de chuva em porcentagem: não invente números.
Se houver mais de uma cidade com o nome pedido e a pessoa não disse o estado, pergunte qual é, mostrando até 5 opções com a UF.
Se a pessoa disser onde mora, use essa cidade quando ela não citar outra.
Se o pedido não for sobre o tempo, diga com educação que você só responde sobre previsão do tempo.`

const agent = await createHarness({
  model: 'bedrock/global.amazon.nova-2-lite-v1:0',
  instructions: instrucoes,
  builtinTools: [], // sem as ferramentas que já temos prontas
  tools: [ previsaoDoTempo ],
  // session: { id: 'conversa-recife' }, // o mesmo id continua a mesma conversa
  memory: false,

})

await agent.invoke(process.argv[2] ?? 'Olá!')
await agent.shutdown() // espera a memória ser salva antes de o script terminar
