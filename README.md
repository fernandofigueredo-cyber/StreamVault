# StreamVault — IPTV player para as suas próprias listas

Player web completo para **M3U/M3U8** e **Xtream Codes**: TV ao vivo com categorias,
filmes, séries com temporadas, EPG, favoritos, "continue watching", busca global e
player HLS responsivo — com contas de usuário, dashboard e dados em PostgreSQL.

## Funcionalidades

- **Importação sem limite de tamanho**: cole uma URL `get.php?...`/`.m3u8`, envie um
  arquivo `.m3u` ou conecte um portal Xtream Codes. A importação é feita **em
  streaming**, gravada em lotes e roda **em background** com barra de progresso
  (testado com 90 MB / 295 mil linhas / 52 mil itens).
- **Detecção automática de portal Xtream** a partir do link `get.php`, com
  categorias, VOD, séries e EPG (`player_api.php`).
- **Proxy de streaming assinado** (`/api/stream/{id}`): retransmite manifestos e
  segmentos, reescreve URLs e a chave AES-128, resolvendo o problema de CDNs sem
  CORS e mantendo as credenciais do portal fora do navegador.
- **Player HLS**: qualidade automática/manual, volume, seek, PiP, fullscreen,
  atalhos de teclado, estados de buffer e erro com retry.
- **EPG**: "on now" e "next" nos cards + guia completo por canal.
- **CRUD completo**: playlists (criar/renomear/atualizar/excluir), favoritos
  (toggle otimista), histórico com retomada.
- **Keep-alive**: heartbeat do servidor + ping do navegador para reduzir quedas
  por inatividade.

## Rodar localmente

```bash
npm ci
cp .env.example .env        # ajuste DATABASE_URL e SESSION_SECRET
npx drizzle-kit push        # cria as tabelas (o app também cria sozinho)
npm run dev                 # http://localhost:3000
```

Conta demo criada automaticamente: `demo@streamvault.app` / `demo1234`.

## Hospedagem

Veja **[DEPLOY.md](./DEPLOY.md)** — Docker Compose com Postgres, Railway, Fly.io,
VPS sem Docker, HTTPS com Caddy e notas de produção.

## Stack

Next.js (App Router) · React 19 · Tailwind CSS 4 · Drizzle ORM · PostgreSQL ·
hls.js · scrypt + cookies HMAC assinados para autenticação.
