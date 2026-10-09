# Discord Ticket Transcript

Visualizador de transcripts do Discord com links HMAC temporários e leitura direta do anexo permanente no canal de logs.

## Deploy na Vercel

Configure estas variáveis no projeto Vercel:

- `TRANSCRIPT_LINK_SECRET`: exatamente o mesmo segredo configurado no bot.
- `DISCORD_READER_TOKEN`: token do bot com acesso ao canal de logs.
- `TRANSCRIPT_BOT_USER_ID`: ID do bot que publica os anexos `transcript_*.json` ou `.json.gz`.

O bot gera um link permanente por ticket no formato `/?c=...&m=...&sig=...`. A API valida HMAC-SHA256, o autor da mensagem e o anexo antes de devolver o JSON. O link funciona enquanto a mensagem/anexo existir no Discord.

> Não coloque tokens ou segredos em HTML, GitHub ou no arquivo `.env` versionado.

## O que foi removido

O pipeline antigo Supabase/GitHub e as páginas administrativas legadas foram removidos para não deixar tokens ou acesso público ao banco no deploy.
