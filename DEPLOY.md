# Hospedar o StreamVault — guia passo a passo

O projeto é um app **Next.js (Node)** + **PostgreSQL**. Abaixo estão três caminhos,
do mais simples ao mais "profissional". Qualquer um deles te dá um **domínio fixo
e uptime contínuo** — diferente do preview deste sandbox, que é reciclado quando
fica ocioso.

> **Importante:** as tabelas e a biblioteca demo são criadas automaticamente na
> primeira requisição (`ensureBootstrapped`). Você **não** precisa rodar migrations
> nem seed ao hospedar.

---

## Opção 1 — Docker Compose no seu VPS (recomendado)

Funciona em qualquer máquina Linux (Hetzner, Contabo, DigitalOcean, Oracle Free
Tier, sua própria máquina). Sobe o app + PostgreSQL com um comando.

```bash
# 1. pegue o código
git clone <seu-repo> streamvault && cd streamvault

# 2. configure as variáveis
cp .env.example .env
nano .env            # troque POSTGRES_PASSWORD e SESSION_SECRET

# 3. gere um SESSION_SECRET forte
openssl rand -base64 48

# 4. suba tudo
docker compose up -d --build

# 5. acompanhe
docker compose logs -f app
```

Pronto: o app está em `http://SEU_IP:3000` (mude com `APP_PORT` no `.env`).

**Atualizar depois de um `git pull`:**

```bash
docker compose up -d --build
```

**Backup do banco:**

```bash
docker compose exec db pg_dump -U streamvault streamvault > backup.sql
```

### HTTPS em 3 linhas (Caddy)

Crie um `Caddyfile` ao lado do `docker-compose.yml`:

```
tv.seudominio.com {
    reverse_proxy streamvault-app:3000
}
```

e adicione ao `docker-compose.yml`:

```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [app]

volumes:
  caddy_data:
  caddy_config:
```

O Caddy emite e renova o certificado Let's Encrypt sozinho (o app já detecta
`x-forwarded-proto` e marca o cookie de sessão como `secure`).

---

## Opção 2 — Plataformas gerenciadas (sem VPS)

### Railway

1. Crie o projeto em [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo**.
2. **New → Database → PostgreSQL** e copie a `DATABASE_URL` oferecida.
3. No serviço do app, em **Variables**, adicione:
   - `DATABASE_URL=postgresql://...?sslmode=require`
   - `SESSION_SECRET=<openssl rand -base64 48>`
4. **Settings → Build**: escolha **Dockerfile** (o repo já tem um).
5. **Settings → Networking → Generate Domain** → URL fixa tipo `streamvault.up.railway.app`.

### Fly.io

```bash
fly launch --dockerfile Dockerfile --name streamvault --no-deploy
fly postgres create --name streamvault-db
fly postgres attach streamvault-db        # injeta DATABASE_URL
fly secrets set SESSION_SECRET="$(openssl rand -base64 48)"
fly deploy
fly certs add tv.seudominio.com           # domínio próprio (opcional)
```

### Render / Koyeb / Coolify

Mesma ideia: aponte para o `Dockerfile`, informe `DATABASE_URL` e `SESSION_SECRET`,
e exponha a porta 3000. No Render use um **Web Service** (nunca *Static Site*).

### Vercel / Netlify (serverless) — **não recomendado**

O app funciona, mas dois recursos exigem processo Node **de longa duração**:

- importação de listas gigantes em background (90 MB / 52 mil itens levam ~90 s);
- o proxy de streaming, que retransmite vídeo HLS contínuo.

Em funções serverless esses dois pontos são interrompidos. Use Opção 1 ou 2.

---

## Opção 3 — Sem Docker, direto no servidor

```bash
# Node 20+ e PostgreSQL 16 instalados
git clone <seu-repo> streamvault && cd streamvault
npm ci
cp .env.example .env && nano .env          # DATABASE_URL + SESSION_SECRET
npm run build
npm run start                              # ou: pm2 start npm --name streamvault -- start
```

---

## Variáveis de ambiente

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `DATABASE_URL` | sim | conexão PostgreSQL (`postgresql://user:senha@host:5432/banco`) |
| `SESSION_SECRET` | sim em produção | assina os cookies de sessão (HMAC). Troque se quiser deslogar todo mundo |
| `PORT` | não | porta do app (padrão `3000`) |
| `POSTGRES_*`, `APP_PORT` | não | usadas apenas pelo `docker-compose.yml` |

## Pós-install (2 minutos)

1. Abra a URL → **Create account** (ou use `demo@streamvault.app` / `demo1234`).
2. **Playlists → New playlist** → cole seu `get.php?...`, `.m3u`/`.m3u8` ou use Xtream Codes.
3. A importação roda em background com barra de progresso — pode fechar a aba.

## Notas de produção

- **Proxy reverso:** se usar Nginx, aumente o limite de upload para importar
  arquivos grandes: `client_max_body_size 512M;` (o Caddy não tem limite por padrão).
- **Largura de banda:** todo o vídeo passa pelo seu servidor (proxy assinado),
  porque os CDNs dos portais IPTV não enviam cabeçalhos CORS. Em um VPS conte
  com tráfego proporcional ao uso.
- **Conexões do portal:** provedores IPTV limitam conexões simultâneas
  (`max_connections`), então duas telas ao mesmo tempo podem ser recusadas pelo
  portal — o app mostra o erro exato no player.
- **Backups:** o volume `streamvault-pgdata` guarda tudo; automatize o
  `pg_dump` mostrado acima.
