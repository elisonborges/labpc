# Memória coletiva LabPC — Neon (servidor experimental)

Estrutura SQL já criada no projeto Neon `anna-one`, schema `labpc_learning`, tabela `drawing_examples`.

API **não implantada nem conectada ao jogo**. Por segurança, a API exige um token de professor em todas as rotas de desenhos; nunca coloque o token nem a DATABASE_URL no HTML público.

Ambiente do servidor: `DATABASE_URL` (string Neon somente no backend), `LABPC_TEACHER_TOKEN` (segredo aleatório com 32+ caracteres), `LABPC_ORIGIN` (origem exata do portal), `PORT` (opcional). Instalar: `npm install`; executar: `npm start`.

Rotas: GET /health; GET /examples/approved; GET /examples/pending; POST /examples; POST /examples/:id/approve; POST /examples/:id/reject.

**Próximo requisito:** implantar em ambiente HTTPS com autenticação institucional, limitar requisições e integrar painel do professor. Não permitir envio direto anônimo por crianças. Nenhuma coleta de nomes, contas, localização ou outros identificadores pessoais.
