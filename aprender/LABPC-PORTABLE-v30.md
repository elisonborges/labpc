# Desenha & Adivinha v3.0 — preparação LabPC Portable

## Arquivos da versão
- `desenha-adivinha-v30.html`: jogo estudantil, sem salvamento de desenhos.
- `desenha-offline-sw-v30.js`: cache para GitHub Pages com pré-carregamento oportunista de TensorFlow.js e modelo DoodleNet.
- `index.html`: portal do Universo Aprender.

## Uso no LabPC Portable
É possível distribuir a página HTML em uma pasta local para jogar com os modelos geométricos, mesmo sem internet. **Isso não torna o TensorFlow.js e seus pesos disponíveis offline no modo arquivo local**. O service worker funciona em HTTPS/localhost, não em `file://`.

Para uso com rede neural offline, o laboratório precisa primeiro abrir a versão hospedada online e confirmar no painel o estado dos recursos em cache. Esta versão ainda exige testes físicos antes de ser homologada para distribuição em massa.

## Checklist para homologação
1. Abrir v3.0 online e confirmar página e controles.
2. Executar os 35 testes do diagnóstico (modelos geométricos).
3. Confirmar se TensorFlow.js e o modelo DoodleNet carregaram, sem assumir sucesso a partir do teste geométrico.
4. Verificar os desenhos aprovados carregados do Neon.
5. Desconectar a rede, reiniciar o navegador e abrir novamente a página hospedada.
6. Confirmar reconhecimento e transição das rodadas em modo offline.
7. Testar em computadores representativos da escola e no navegador usado com o LabPC Portable.
8. Registrar resultado, data e equipamento.

## Escopo dos testes automatizados
A suíte cobre o reconhecimento dos **35 desenhos de referência próprios**, mas não demonstra desempenho com desenhos naturais dos alunos nem verifica o comportamento do modelo neural externo. A medida de cobertura do painel considera três exemplos aprovados por categoria como mínimo pedagógico inicial, não garantia de precisão.

## Cuidados
- Não copiar contas, tokens ou senhas para o pacote Portable.
- Não publicar dados pessoais ou desenhos sem revisão.
- Não alterar autenticação e políticas dos módulos AnnA One nesta etapa.
- Não classificar a v3.0 como homologada antes da validação offline e com alunos.
