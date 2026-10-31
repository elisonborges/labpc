# Desenha & Adivinha v2.8 — validação para laboratório escolar

## Pré-requisitos
- Abrir https://elisonborges.github.io/labpc/aprender/desenha-adivinha-v28.html com internet.
- Manter a aba aberta até a indicação “Rede neural e jogo armazenados para uso offline”.
- Se aparecer “rede neural: 1/3 ou 2/3”, não considerar o reconhecimento neural offline pronto.
- A biblioteca aprovada do Neon só estará disponível offline após uma sincronização online.

## Teste funcional de implantação (pendente de execução em navegador real)
1. Conectar-se à internet e abrir v2.8.
2. Confirmar carregamento do jogo e indicador 3/3 de arquivos neurais.
3. Desenhar duas categorias diferentes; registrar os palpites e eventuais erros.
4. Desligar a conexão e atualizar a mesma URL.
5. Confirmar abertura do jogo, 30 segundos, pontuação, tela de conclusão e transição entre rodadas.
6. Verificar que a rede neural e os exemplos aprovados carregados continuam disponíveis.
7. Fechar e reabrir o navegador offline; repetir abertura e uma rodada.
8. Reconectar e conferir sincronização com Neon.

## Limitações conhecidas
- Service worker requer HTTPS e suporte do navegador; modo privativo ou limpeza de dados pode apagar o cache.
- A atualização de versão usa um novo arquivo e um novo service worker. É necessário um primeiro acesso online à v2.8.
- A qualidade do reconhecimento exige testes com desenhos reais; armazenamento offline por si só não melhora a precisão.
- Arquivos externos podem falhar ao ser pré-carregados, e por isso o indicador 3/3 é obrigatório antes da validação offline.
- Este registro é roteiro de QA; não afirma que os testes em navegador físico foram executados.
