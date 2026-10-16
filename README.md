# GV Revenda v2

## Continuidade e backup do código

Esta cópia foi recuperada em 21/09/2026 do código-fonte da publicação Vercel `95jW7BJ8JDGiLuuueu63ckq6Ti7X`, publicada em 09/09/2026. A pasta de trabalho é `D:\BACKUPS\APP REVENDA V2` e o repositório é `cristianofariascf11-tech/revenda`.

Use `pnpm install --frozen-lockfile` para instalar as versões recuperadas. Para validar, execute `pnpm test`, `pnpm lint` e `pnpm build`.

O fluxo de continuidade é: editar, validar, revisar o diff, fazer commit e enviar ao GitHub. Com a integração Git da Vercel, os envios à branch de produção geram novas publicações. Salvar um arquivo no computador, sozinho, não o envia ao GitHub. Antes de desligar ou trocar de computador, confira que o envio terminou e que a Vercel concluiu a publicação.

As credenciais ficam em `.env.local` e nas variáveis da Vercel; elas não entram no Git. Os dados e as fotos do Supabase precisam de backup próprio. A recuperação do código não executa migrações nem modifica o banco existente.

O `.env.example`, a indicação de Node em `.nvmrc` e o iniciador PowerShell foram recriados, pois a visualização de fonte da Vercel não disponibilizou esses formatos. Logs de desenvolvimento não foram recuperados.

Sistema interno da **GV Moto Center** para controlar estoque, preparação, fotos, custos, vendas, lucro e avaliações de motocicletas. A interface é responsiva, em português do Brasil, e o acesso é restrito a usuários criados pelo administrador.

## O que está pronto

- Login seguro por e-mail e senha, sem cadastro público.
- Estoque com indicadores, filtros, tabela no computador e cards no celular.
- Código interno atômico (`GV-000001`) gerado somente pelo PostgreSQL no cadastro.
- Cadastro, edição, status, arquivamento e exclusão confirmada.
- Galeria privada com 4 a 12 fotos, compactação no navegador, progresso, capa e ordenação.
- Custos com inclusão, edição e exclusão.
- Venda única e transacional com lucro real.
- Avaliação por placa e FIPE por fornecedores configuráveis, histórico e fallback manual.
- Automação protegida, com simulação e logs.
- RLS em todas as tabelas e políticas privadas do Storage.
- Testes automatizados, lint e build de produção.

## Requisitos

- Windows 10 ou 11.
- [Node.js LTS](https://nodejs.org/) 20 ou superior (24 recomendado).
- Uma conta no Supabase.
- Uma conta na Vercel somente quando chegar a hora de publicar.

## Instalação no Windows e Codex Work

Abra o PowerShell na pasta `gv-revenda-v2` e execute:

```powershell
npm install
Copy-Item .env.example .env.local
```

Preencha o `.env.local` com as chaves do seu projeto. O arquivo é ignorado pelo Git e nunca deve ser enviado ao GitHub.

Para iniciar:

```powershell
npm run dev
```

Depois abra `http://localhost:3000`. Também é possível clicar com o botão direito em `Iniciar aplicativo.ps1` e escolher **Executar com PowerShell**.

## Configuração do Supabase

1. Crie um projeto novo no Supabase. Não reutilize nem exclua o projeto antigo.
2. No editor SQL do projeto novo, execute todo o arquivo `supabase/migrations/202607120001_initial_schema.sql`.
3. Em **Project Settings → API**, copie a URL e a chave publicável para o `.env.local`.
4. Em **Authentication → Users**, crie manualmente os 2 ou 3 usuários. O sistema não possui cadastro público.
5. Copie a `service_role` somente para `SUPABASE_SERVICE_ROLE_KEY` no ambiente local e na Vercel. Nunca use essa chave em variável iniciada por `NEXT_PUBLIC_`.

Exemplo local, sem valores reais:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PLATE_API_URL=
PLATE_API_TOKEN=
FIPE_API_URL=
FIPE_API_TOKEN=
CRON_SECRET=
```

O bucket privado `vehicle-photos`, as views, funções, gatilhos e políticas RLS são criados pela migration.

## Integrações de placa e FIPE

O sistema não afirma que existe uma API FIPE oficial. Ele usa o fornecedor configurado e exibe a fonte e o horário da consulta.

As URLs aceitam parâmetros em formato de template:

```text
PLATE_API_URL=https://fornecedor.exemplo/vehicles/{plate}
FIPE_API_URL=https://fornecedor.exemplo/fipe?brand={brand}&model={model}&year={year}&plate={plate}
```

Também é possível informar uma URL sem templates; o sistema adiciona os parâmetros na query string. O token, quando presente, é enviado como `Authorization: Bearer TOKEN`. Se o formato de resposta do fornecedor for diferente, ajuste somente `src/lib/evaluation-adapters.ts` — a tela permanece igual.

Se a API falhar, retornar zero ou não estiver configurada, a interface libera marca, modelo, ano e FIPE para preenchimento manual. Nenhum preço fictício é usado.

### Placa FIPE

O fornecedor usado pela GV Moto Center é a [Placa FIPE](https://doc.placafipe.com.br/api/getplacafipe.html). A aplicação usa uma única requisição ao endpoint `POST /getplacafipe`, que retorna os dados da placa e as correspondências FIPE sem consumir duas quotas.

```text
PLATE_API_PROVIDER=placafipe
PLATE_API_URL=https://api.placafipe.com.br
PLATE_API_TOKEN=token_do_plano
FIPE_API_URL=
FIPE_API_TOKEN=
```

O token existe somente no servidor. Quando o fornecedor retorna vários modelos possíveis, a tela exige que o usuário confira e selecione a correspondência antes de salvar a avaliação.

## Regras financeiras

```text
total investido = valor de compra + custos
lucro real = valor da venda - taxas - valor de compra - custos
oferta sugerida = FIPE × (1 - percentual) - custos previstos
```

Valores não finitos são tratados como zero nas funções compartilhadas. O banco rejeita preços negativos, venda duplicada e atualizações parciais.

## Fotos

- Formatos: JPG, JPEG, PNG e WEBP.
- Máximo: 12 fotos por veículo.
- Para colocar `À venda`: mínimo de 4 fotos e valor anunciado maior que zero.
- As imagens são reduzidas para até 1920 px e convertidas em JPEG antes do upload.
- A foto de menor ordem é a capa.
- O bucket é privado; a aplicação cria URLs temporárias assinadas.

## Automação e segurança

A rota `/api/cron/vehicle-cleanup` exige `CRON_SECRET` no header:

```text
Authorization: Bearer SEU_CRON_SECRET
```

Sem `?execute=true`, a rota sempre executa em **simulação** e grava o que faria em `automation_logs`.

```powershell
# Simulação
Invoke-RestMethod -Headers @{ Authorization = "Bearer $env:CRON_SECRET" } `
  -Uri "http://localhost:3000/api/cron/vehicle-cleanup"

# Execução real
Invoke-RestMethod -Method Post -Headers @{ Authorization = "Bearer $env:CRON_SECRET" } `
  -Uri "http://localhost:3000/api/cron/vehicle-cleanup?execute=true"
```

Regra documentada:

- Arquiva após 90 dias veículos ativos sem fotos e sem atualização.
- Remove fotos após 120 dias somente de veículos arquivados que já foram excluídos logicamente.
- Toda simulação, mudança ou remoção fica registrada.

## Testes e validação

```powershell
npm run lint
npm run test
npm run build
```

Os testes cobrem cálculos financeiros, entradas inválidas, placa Mercosul, oferta FIPE, código atômico, venda única, RLS, fotos, proteção de rotas, fallback manual e layout móvel.

## Publicação na Vercel

1. Envie este repositório novo para um repositório novo no GitHub.
2. Na Vercel, importe esse repositório e crie um projeto novo.
3. Cadastre todas as variáveis do `.env.example` em **Development**, **Preview** e **Production**.
4. Faça primeiro um deploy de Preview.
5. Valide login, cadastro, quatro fotos, custo, venda, lucro e avaliação.
6. Promova para Production somente depois dessa validação.
7. Configure o domínio por último.

O `vercel.json` agenda a automação diariamente às 06:00 UTC. A Vercel envia o segredo conforme a configuração do projeto.

## Backup

Antes de mudanças importantes:

- Baixe um backup do banco em **Supabase → Database → Backups**.
- Preserve uma cópia original sem alterações.
- Exporte o bucket `vehicle-photos` com a CLI do Supabase ou pelo painel.
- Guarde banco e Storage juntos, identificados pela mesma data.
- Teste a restauração em um projeto separado, nunca diretamente em produção.

## Migração do sistema antigo

O sistema novo não depende do Supabase antigo. Quando o backup antigo estiver disponível:

1. Preserve o arquivo original.
2. Analise tabelas e caminhos do Storage sem alterar a origem.
3. Crie um mapeamento para o esquema desta migration.
4. Execute primeiro uma simulação e conte veículos, custos, vendas e fotos.
5. Importe somente depois de confirmação explícita.

Não existe importador genérico no projeto porque o esquema do backup antigo ainda não foi fornecido; inventar esse mapeamento poderia corromper dados.

## Estrutura principal

```text
src/app/(app)/vehicles       estoque, cadastro e detalhes
src/app/(app)/evaluation     avaliação e histórico
src/app/api                  integrações e automação
src/lib                      validações, cálculos, adaptadores e Supabase
supabase/migrations          banco versionado, RLS e Storage
```

## Boas práticas

- Nunca envie `.env.local`, senhas, tokens ou chaves ao GitHub.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador.
- Crie usuários somente pelo painel administrativo do Supabase.
- Execute a automação em simulação antes de usar `execute=true`.
- Não apague o repositório, projeto ou backups antigos.
