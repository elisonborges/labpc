# Parte 2 — Energia para Cidades

As nove missões estão disponíveis. Abra `index.html` para acompanhar a jornada ou `../partes/index.html` para escolher a parte. A barra central permite abrir qualquer missão; os cartões mostram as conclusões salvas neste navegador.

| Missão | Montagem e condição de conclusão |
| --- | --- |
| 1 — O caminho da energia | Usina → transmissão → transformador → lâmpada, com todos os elos conectados. |
| 2 — Sol que vira som | Painel → volume → alto-falante; luz solar ≥ 40% e volume ≥ 60%. Som sintetizado localmente após clicar em Testar. |
| 3 — Cozinhando com energia | Gás → válvula → fogão; abrir a válvula virtual. |
| 4 — Elétrico ou gasolina? | Duas redes completas: usina → carregador → carro elétrico e gasolina → bomba de combustível → carro a gasolina; carga e combustível ≥ 40%. |
| 5 — Uma cidade, muitas energias | Quatro redes independentes para lâmpada, escola, motor e fogão. As fontes e a passagem de gás estão disponíveis nesta missão. |
| 6 — Poste inteligente | Usina → transformador → sensor → poste; testar dia (luz ≥ 60%) e noite (luz ≤ 30%) na mesma montagem. |
| 7 — A força do vento | Vento → turbina → regulador → bomba; geração ≥ demanda. |
| 8 — Energia de reserva | Painel → controlador → bateria → lâmpada; simular carga com sol ≥ 40%, depois consumo com sol 0%. |
| 9 — Cidade inteligente | Redes da escola, hospital e rua; simular um dia atendido com carga da bateria e uma noite com consumo da reserva e sensor ativo. O hospital precisa de vento ≥ 50%. |

## Interação

- Clique numa peça e depois num espaço, ou arraste com mouse/toque.
- A biblioteca acumula os componentes das missões anteriores. É possível reutilizar uma peça em redes diferentes.
- Clique numa peça montada para selecioná-la; clique em outro espaço para mover ou trocar. Use **Remover selecionado** para retirá-la.
- Clique nos losangos entre as peças para conectar ou desconectar. Testar exige todos os elos da rede.
- Mover, remover ou reconectar reinicia os registros de dia/noite e a reserva da tentativa, evitando aproveitar evidências de outra montagem.
- **Simular etapa** adiciona 25 unidades à bateria durante o dia ou consome 25 unidades à noite. A reserva fica entre 0 e 100. Cada etapa representa um intervalo didático, não uma previsão física real.
- **Reiniciar** limpa a tentativa e os controles, preservando as conclusões já salvas.

## Offline e progresso

Pelo site, a Parte 2 prepara automaticamente um conjunto local de todas as nove missões. Aguarde a indicação **Acesso offline pronto neste navegador** no rodapé antes de desconectar. Depois disso, a jornada e as atividades da Parte 2 abrem sem rede. O cache tem escopo limitado à Parte 2; não modifica a Parte 1 ou o restante do LabPC.

Também é possível baixar a pasta inteira e abrir os HTMLs diretamente, sem servidor, CDN, bibliotecas ou fontes remotas. Nessa modalidade, a forma como o navegador compartilha `localStorage` entre arquivos locais pode variar. O site com cache mantém um único progresso compartilhado entre as atividades. O som depende do suporte do navegador a Web Audio; a validação visual continua disponível se o áudio estiver bloqueado.

A chave `labpc-littlebits-parte2-v1` guarda as missões concluídas de 1 a 9. Os salvamentos são cumulativos, inclusive ao jogar novamente a Missão 1. Falhas no armazenamento não impedem jogar. Nenhum arquivo ou chave de progresso da Parte 1 é alterado.

## Referência e limites do modelo

Logo SVG, slogan, cabeçalho, barra central, destaque do desafio e layout derivam da Missão 3 da Parte 1. Em telas de computador a atividade ocupa uma tela; o acervo tem rolagem própria. Celulares permitem rolagem vertical para manter os controles legíveis.

As redes e porcentagens são modelos pedagógicos simplificados. Redes elétricas reais incluem outras etapas e mais de uma transformação de tensão. A atividade de gás é exclusivamente virtual.

## Verificação reproduzível

```text
node robotica/littlebits/parte-2/tests/mission-1.test.cjs
node robotica/littlebits/parte-2/tests/energy.test.cjs
node robotica/littlebits/parte-2/tests/browser.test.cjs
```

O último teste precisa do pacote `playwright` e de Chromium/Chrome/Edge. Pode-se definir `PLAYWRIGHT_MODULE` com o caminho de uma instalação existente, `BROWSER_PATH` com o executável do navegador e `SCREENSHOT_DIR` com uma pasta fora do repositório para as capturas.

Os testes verificam condições corretas/incorretas, falta de energia, redes incompletas, reserva esgotada, etapas de dia/noite, isolamento de progresso e comportamento no navegador. O teste de navegador conclui as nove missões, verifica navegação, armazenamento, clique, arraste nativo por mouse e eventos de toque, além de cache offline e dimensões de tela. Eventos de toque automatizados não substituem uma avaliação em aparelho físico.
