# ◆ InvestIA Dashboard

Dashboard de mercado financeiro com análise por inteligência artificial.
Ações BR, FIIs, Renda Fixa e Internacional — com exportação em PDF e envio por e-mail.

---

## Funcionalidades

- **Dashboard completo**: Ações BR, FIIs, Renda Fixa, Mercado Internacional
- **Análise IA em tempo real**: Claude com busca na web, análise como especialista
- **Exportação PDF**: Resumo diário e análise IA em PDF separados
- **Envio por e-mail**: Relatório formatado direto no seu inbox
- **Relatório automático**: Cron job diário às 8h (seg-sex) via Vercel
- **App mobile (PWA)**: Instale no celular como app nativo
- **Simulador de aporte**: Divide seu investimento mensal automaticamente

---

## Deploy no Vercel (15 minutos)

### Pré-requisitos
- Conta no [GitHub](https://github.com) (gratuito)
- Conta no [Vercel](https://vercel.com) (gratuito)
- Conta no [Anthropic](https://console.anthropic.com) (pago por uso)
- Conta no [Resend](https://resend.com) (gratuito até 3.000 emails/mês)

---

### Passo 1 — Suba o código no GitHub

```bash
# No terminal, dentro da pasta do projeto:
git init
git add .
git commit -m "InvestIA Dashboard inicial"

# Crie um repositório no GitHub e execute:
git remote add origin https://github.com/SEU_USUARIO/investia-dashboard.git
git push -u origin main
```

---

### Passo 2 — Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"New Project"**
3. Selecione o repositório `investia-dashboard`
4. Clique em **"Deploy"** (configurações padrão)
5. Aguarde ~2 minutos — seu app estará em `https://investia-dashboard.vercel.app`

---

### Passo 3 — Configurar variáveis de ambiente

No Vercel → seu projeto → **Settings → Environment Variables**, adicione:

| Nome | Valor | Como obter |
|------|-------|------------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `RESEND_API_KEY` | `re_...` | [resend.com](https://resend.com) → API Keys |
| `DAILY_REPORT_EMAIL` | `seu@email.com` | Seu e-mail pessoal |
| `CRON_SECRET` | string aleatória | Gere com: `openssl rand -hex 32` |
| `FROM_EMAIL` | `InvestIA <onboarding@resend.dev>` | Padrão Resend (ou seu domínio) |

Depois clique em **Deployments → Redeploy** para aplicar as variáveis.

---

### Passo 4 — Obter chave da Anthropic

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Vá em **Settings → API Keys → Create Key**
3. Copie e adicione no Vercel como `ANTHROPIC_API_KEY`
4. Adicione crédito em **Billing** (mínimo US$ 5 — uso típico ~US$ 0,50–2/mês)

---

### Passo 5 — Configurar Resend (e-mail gratuito)

1. Acesse [resend.com](https://resend.com) e crie conta
2. Vá em **API Keys → Create API Key**
3. Copie e adicione no Vercel como `RESEND_API_KEY`
4. **Sem domínio próprio**: use `FROM_EMAIL=InvestIA <onboarding@resend.dev>`
   (funciona para enviar para o e-mail verificado na conta Resend)
5. **Com domínio próprio**: vá em Domains → Add Domain → siga as instruções DNS

---

### Passo 6 — Instalar como app no celular (PWA)

**Android:**
1. Abra o link do Vercel no Chrome
2. Menu (⋮) → "Adicionar à tela inicial"
3. Confirme → o app aparece na tela inicial como nativo

**iPhone:**
1. Abra o link no Safari
2. Botão de compartilhar (□↑) → "Adicionar à Tela de Início"
3. Confirme → ícone aparece como app

---

## Relatório automático diário

O `vercel.json` já está configurado com cron job que roda **segunda a sexta às 8h (horário de Brasília)**:

```json
{
  "crons": [{ "path": "/api/daily-report", "schedule": "0 11 * * 1-5" }]
}
```

O relatório é gerado automaticamente com análise IA + busca na web e enviado para `DAILY_REPORT_EMAIL`.

> Nota: Cron jobs gratuitos no Vercel têm limite de 1/dia. Para mais frequência, faça upgrade para o plano Pro.

---

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves

# Iniciar servidor de desenvolvimento
npm run dev
# Acesse: http://localhost:3000
```

---

## Estrutura do projeto

```
investia-app/
├── app/
│   ├── page.jsx              # Dashboard principal
│   ├── layout.jsx            # Layout + PWA meta tags
│   ├── globals.css           # Estilos globais
│   └── api/
│       ├── analyze/          # API: análise IA com Claude
│       ├── send-email/       # API: envio de e-mail via Resend
│       └── daily-report/     # API: relatório automático (Cron)
├── public/
│   └── manifest.json         # PWA manifest
├── vercel.json               # Configuração Vercel + Cron
├── .env.example              # Template de variáveis
└── README.md                 # Este arquivo
```

---

## Custos estimados

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel (hosting) | Free | R$ 0/mês |
| Resend (e-mail) | Free (3k/mês) | R$ 0/mês |
| Anthropic (IA) | Pay-per-use | ~R$ 3–12/mês* |

*Estimativa para 30 análises/mês + relatório diário automático.

---

## Aviso Legal

Este dashboard é uma ferramenta educacional e de apoio à decisão.
As informações apresentadas **não constituem recomendação formal de investimento**.
Sempre consulte um profissional certificado antes de investir.
