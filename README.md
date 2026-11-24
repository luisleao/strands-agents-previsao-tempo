![Strands logo](assets/strands.png)

# Previsão do tempo com Strands Agents

Agente de linha de comando que responde perguntas sobre a previsão do tempo em cidades brasileiras. Ele é feito com o [Strands harness](https://github.com/strands-agents/harness-sdk/tree/main/harness-ts), usa o modelo Amazon Nova 2 Lite no Amazon Bedrock e busca os dados do CPTEC/INPE na [BrasilAPI](https://brasilapi.com.br/docs#tag/CPTEC).

```bash
npx tsx agent.ts "Vai chover em Recife amanhã?"
```

```text
  ⏳ previsao_do_tempo
🔧 Tool #1: previsao_do_tempo
✓ Tool completed
A previsão para Recife, PE, amanhã (quarta-feira, 25 de novembro) é de **Parcialmente Nublado**, com temperatura mínima de 25°C e máxima de 33°C. A previsão não menciona chuva, então não está previsto para chover.
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 22 ou mais recente, a versão mínima do `@strands-agents/harness` e do `@strands-agents/sdk`.
- Credenciais da AWS com permissão para invocar modelos no Amazon Bedrock (`bedrock:InvokeModelWithResponseStream`). As chamadas ao modelo são cobradas na sua conta.

A BrasilAPI é pública e não precisa de chave.

## Como rodar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure as credenciais da AWS. Para desenvolvimento local, use o [`aws login`](https://docs.aws.amazon.com/signin/latest/userguide/command-line-sign-in.html?trk=6ac81577-2c30-4287-a906-3e10c4cf7625&sc_channel=el), que gera credenciais temporárias renovadas automaticamente. Ele precisa do [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html?trk=6ac81577-2c30-4287-a906-3e10c4cf7625&sc_channel=el) 2.32.0 ou mais recente.

   ```bash
   aws login
   ```

   O agente usa a cadeia de credenciais padrão do SDK da AWS, então um perfil em `AWS_PROFILE` também funciona. A região vem de `AWS_REGION` ou do perfil. Se nenhuma região estiver configurada, o Strands usa `us-west-2`.

3. Faça uma pergunta entre aspas:

   ```bash
   npx tsx agent.ts "Qual a previsão para Curitiba no sábado?"
   ```

   O script lê só o primeiro argumento. Sem argumento, ele envia "Olá!".

No início da saída aparecem dois avisos do Strands, um sobre o `web_fetch` e outro sobre `cache_config`. Eles não afetam a resposta.

## Como funciona

O código tem dois arquivos:

- [`agent.ts`](agent.ts) cria o agente com `createHarness`, define as instruções e envia a pergunta recebida na linha de comando.
- [`previsao.ts`](previsao.ts) define a ferramenta `previsao_do_tempo`, que consulta a BrasilAPI.

A cada pergunta:

1. O modelo chama `previsao_do_tempo` com a cidade, a UF (opcional) e o número de dias, de 1 a 6.
2. A ferramenta busca a cidade em `/api/cptec/v1/cidade/{nome}`. Ela prefere os resultados com o nome igual ao pedido, sem diferenciar acentos nem maiúsculas, e filtra pela UF quando ela é informada.
3. Se sobrar mais de uma cidade, a ferramenta devolve até 5 opções com a UF, e o agente pergunta qual é. Por exemplo, existe Santa Maria no RN e no RS.
4. Com uma cidade só, a ferramenta busca a previsão em `/api/cptec/v1/clima/previsao/{id}/{dias}` e devolve, para cada dia, a data, o dia da semana, a condição e as temperaturas mínima e máxima.
5. O agente responde em português, de forma curta, com a cidade, a UF, o dia, a condição e as temperaturas.

Quando a cidade não existe ou a BrasilAPI falha, a ferramenta devolve uma mensagem para o modelo em vez de lançar um erro. Assim o agente pede para a pessoa conferir o nome ou tentar de novo mais tarde.

As instruções em `agent.ts` também orientam o agente a:

- não inventar a chance de chuva em porcentagem, porque o CPTEC informa só a condição do tempo;
- usar a cidade onde a pessoa disse que mora quando ela não citar outra;
- recusar com educação pedidos que não sejam sobre o tempo.

### Configuração do harness

O agente usa o harness com poucos recursos ligados:

- `builtinTools: []` desliga as ferramentas embutidas do harness, como shell, arquivos e web. A única ferramenta do agente é `previsao_do_tempo`.
- `memory: false` desliga a memória de longo prazo.
- A opção `session` está comentada, então vale o padrão: cada execução começa uma conversa nova e a salva em `.agent/sessions/`. Essa pasta é ignorada pelo git.

## Continuar uma conversa

Como cada execução começa do zero, uma pergunta como "E no sábado?" chega sem contexto, e o agente pergunta de qual cidade você está falando. Para que as execuções continuem a mesma conversa, descomente esta linha em `agent.ts`:

```ts
session: { id: 'conversa-recife' }, // o mesmo id continua a mesma conversa
```

Com a sessão ligada, a segunda pergunta usa o contexto da primeira:

```bash
npx tsx agent.ts "Vai chover em Recife amanhã?"
npx tsx agent.ts "E no sábado?"
```

A conversa fica salva em `.agent/sessions/conversa-recife/`. Troque o id para começar outra conversa. A sessão também permite responder quando o agente pergunta de qual estado é a cidade.

## Trocar o modelo

O modelo fica em `agent.ts`, no formato `provedor/modelo`:

```ts
model: 'bedrock/global.amazon.nova-2-lite-v1:0',
```

O prefixo `global.` indica um [perfil de inferência global](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html?trk=6ac81577-2c30-4287-a906-3e10c4cf7625&sc_channel=el) do Bedrock, que pode enviar a requisição para outras regiões comerciais da AWS. Para usar outro modelo do Bedrock, troque o id. O harness também aceita outros provedores, como OpenAI e Google, que precisam de um pacote extra e de credenciais próprias. Veja [como escolher o modelo](https://github.com/strands-agents/harness-sdk/tree/main/harness-ts#choosing-a-model) na documentação do harness.

## Links

- [Strands Agents](https://strandsagents.com/?trk=6ac81577-2c30-4287-a906-3e10c4cf7625&sc_channel=el)
- [Strands harness](https://github.com/strands-agents/harness-sdk/tree/main/harness-ts)
- [BrasilAPI: CPTEC](https://brasilapi.com.br/docs#tag/CPTEC)
- [CPTEC/INPE](https://www.cptec.inpe.br/)

## License

This project is licensed under the MIT-0 License. See the [LICENSE](LICENSE) file.

Copyright Amazon.
