# GUIA DE MIGRAÇÃO PARA GIT + REPLIT

## 🎯 Objetivo
Este guia vai te ajudar a migrar o projeto RAIO do Figma Make para Git (GitHub) e depois para o Replit.

---

## 📋 Pré-requisitos

- [ ] Conta no GitHub (gratuita)
- [ ] Conta no Replit (gratuita ou paga)
- [ ] Git instalado localmente (opcional, mas recomendado)
- [ ] Acesso às credenciais do Supabase, Mixpanel e GrowthBook

---

## 🚀 MÉTODO 1: GitHub → Replit (Recomendado)

### Passo 1: Baixar os arquivos do Figma Make

1. No Figma Make, baixe todos os arquivos do projeto
2. Extraia para uma pasta local (ex: `raio-platform`)

### Passo 2: Criar repositório no GitHub

1. Acesse: https://github.com/new
2. Configure:
   - **Repository name:** `raio-platform` (ou nome de sua preferência)
   - **Description:** "Plataforma RAIO - Fortalecimento Familiar"
   - **Private/Public:** Escolha Private para manter privado
   - **NÃO** marque "Add a README" (já temos um)
3. Clique em "Create repository"

### Passo 3: Fazer upload via Git (Terminal)

Abra o terminal na pasta do projeto e execute:

```bash
# Inicializar Git
git init

# Adicionar todos os arquivos
git add .

# Fazer o primeiro commit
git commit -m "🎉 Initial commit - RAIO Platform"

# Conectar ao GitHub (substitua SEU_USUARIO e SEU_REPO)
git remote add origin https://github.com/SEU_USUARIO/raio-platform.git

# Enviar para o GitHub
git branch -M main
git push -u origin main
```

**Alternativa sem terminal:** Use o GitHub Desktop ou faça upload via interface web do GitHub.

### Passo 4: Importar no Replit

1. Acesse: https://replit.com/
2. Clique em "+ Create Repl"
3. Selecione "Import from GitHub"
4. Escolha seu repositório `raio-platform`
5. Clique em "Import from GitHub"

### Passo 5: Configurar Secrets no Replit

No Replit, no painel esquerdo:

1. Clique no ícone de 🔒 (Secrets)
2. Adicione cada variável:

```
VITE_SUPABASE_URL = sua_url_aqui
VITE_SUPABASE_ANON_KEY = sua_key_aqui
VITE_MIXPANEL_TOKEN = seu_token_aqui
VITE_GROWTHBOOK_API_KEY = sua_api_key_aqui
VITE_GROWTHBOOK_CLIENT_KEY = sua_client_key_aqui
```

### Passo 6: Instalar e Rodar

No console do Replit:

```bash
npm install
npm run dev
```

✅ **Pronto!** Seu projeto está rodando no Replit!

---

## 🔄 MÉTODO 2: Upload Direto no Replit (Mais Rápido)

### Passo 1: Criar Repl

1. Acesse: https://replit.com/
2. Clique em "+ Create Repl"
3. Selecione template "Node.js" ou "Vite"
4. Nomeie: "raio-platform"
5. Clique em "Create Repl"

### Passo 2: Upload dos Arquivos

1. No Replit, clique nos 3 pontos ao lado de "Files"
2. Selecione "Upload folder" ou "Upload files"
3. Faça upload de todos os arquivos do projeto
   - **IMPORTANTE:** NÃO faça upload do arquivo `.env`

### Passo 3: Configurar Secrets

(Mesmo processo do Método 1, Passo 5)

### Passo 4: Instalar e Rodar

```bash
npm install
npm run dev
```

---

## ⚙️ Configurações Importantes

### Arquivo .replit (Crie se não existir)

```toml
run = "npm run dev"
entrypoint = "index.html"

[nix]
channel = "stable-22_11"

[deployment]
run = ["npm", "run", "build"]
deploymentTarget = "static"

[[ports]]
localPort = 5173
externalPort = 80
```

### Variáveis de Ambiente

**NUNCA commite o arquivo `.env` no Git!**

O `.gitignore` já está configurado para ignorar arquivos `.env`, mas sempre verifique.

---

## 🔒 Segurança

### ✅ Boas Práticas:

1. **Sempre use Secrets no Replit** para variáveis sensíveis
2. **Nunca hardcode** keys diretamente no código
3. **Mantenha o repositório privado** se contém lógica de negócio sensível
4. **Revise o `.gitignore`** antes do primeiro commit

### ❌ Nunca commite:

- Arquivo `.env`
- `node_modules/`
- Chaves de API
- Tokens de acesso
- Credenciais do Supabase

---

## 🐛 Troubleshooting

### Erro: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Port already in use"
O Replit gerencia portas automaticamente. Reinicie o Repl.

### Build falha
Verifique se todas as variáveis de ambiente estão configuradas corretamente nos Secrets.

### Hot reload não funciona
No Replit, às vezes é necessário fazer hard refresh (Ctrl+Shift+R).

---

## 📊 Sincronização GitHub ↔ Replit

Depois de conectar o Replit ao GitHub, você pode:

### Push do Replit para GitHub:
```bash
git add .
git commit -m "feat: sua mensagem"
git push
```

### Pull do GitHub para Replit:
```bash
git pull origin main
```

---

## 🎯 Checklist Final

Antes de considerar a migração completa:

- [ ] Todos os arquivos foram enviados
- [ ] `.gitignore` está configurado corretamente
- [ ] Secrets foram configurados no Replit
- [ ] `npm install` executou sem erros
- [ ] `npm run dev` inicia o projeto
- [ ] Consegue acessar a aplicação no navegador
- [ ] Supabase está conectado corretamente
- [ ] Mixpanel está rastreando eventos
- [ ] GrowthBook está carregando feature flags

---

## 📚 Recursos Adicionais

- **Git Docs:** https://git-scm.com/doc
- **GitHub Guides:** https://guides.github.com/
- **Replit Docs:** https://docs.replit.com/
- **Supabase Docs:** https://supabase.com/docs

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:

1. Verifique os logs no console do Replit
2. Confirme que todas as variáveis de ambiente estão corretas
3. Teste localmente primeiro com `npm run dev`
4. Verifique se o Supabase está acessível

---

**Boa migração! 🚀**
