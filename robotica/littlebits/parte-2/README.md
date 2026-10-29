# Parte 2 — Energia para Cidades

Entrega inicial: Missão 1 — O caminho da energia.

## Abrir e jogar
Abra `../partes/index.html` para escolher a parte ou `missao-1/index.html` para jogar.
Salve a pasta com `index.html` e `app.js` juntos: a missão não usa rede, CDN, fontes remotas, bibliotecas ou servidor.
Abrir um endereço web sem internet antes de baixar os arquivos não é suportado por esta entrega.

Selecione ou arraste os componentes para os quatro espaços. As peças são únicas; mover para um espaço ocupado troca as peças. Clique nos três elos para conectar. Teste a cadeia:
usina → transmissão → transformador → lâmpada.
Clique numa peça montada para movê-la ou removê-la. Mudanças nas peças desconectam os elos adjacentes e apagam a lâmpada até um novo teste.

A atividade representa uma cadeia simplificada. Redes reais incluem outras etapas, inclusive transformação da tensão antes da transmissão.
As missões 2–9 estão planejadas e identificadas como em preparação; seus números levam à lista de planejamento.

## Progresso
A chave `labpc-littlebits-parte2-v1` guarda a conclusão da Missão 1. Reiniciar limpa a montagem, preservando a conclusão. Bloqueio ou falha no armazenamento não impede jogar.
Nenhum arquivo das nove missões da Parte 1 é modificado e sua chave de progresso permanece intacta.

## Referência visual
Logo SVG, slogan, cabeçalho, barra de evolução centralizada, painel de desafio e layout compacto derivados de `../../simulacao/missao-3/index.html`.
Em telas pequenas, a página permite rolagem para preservar acesso aos controles.

## Verificação
`node robotica/littlebits/parte-2/tests/mission-1.test.cjs`

18 verificações de lógica e eventos com DOM simulado: cadeia vazia/incorreta/correta, elos, luz, movimentação/troca/remoção, reinício, arraste por mouse e toque, progresso isolado e falhas no armazenamento.
Não equivale a teste real de gesto ou renderização em navegador.
