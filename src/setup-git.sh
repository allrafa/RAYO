#!/bin/bash

# Script de setup para Git + GitHub + Replit
# Execute este script após baixar os arquivos do projeto

echo "🚀 RAIO Platform - Setup Git"
echo "=============================="
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se Git está instalado
echo -e "${BLUE}[1/6]${NC} Verificando Git..."
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Git não encontrado. Instalando...${NC}"
    # Comandos variam por SO - ajuste conforme necessário
    echo "Por favor, instale o Git manualmente: https://git-scm.com/"
    exit 1
fi
echo -e "${GREEN}✓ Git instalado${NC}"
echo ""

# 2. Inicializar repositório
echo -e "${BLUE}[2/6]${NC} Inicializando repositório Git..."
if [ ! -d .git ]; then
    git init
    echo -e "${GREEN}✓ Repositório inicializado${NC}"
else
    echo -e "${YELLOW}⚠ Repositório já existe${NC}"
fi
echo ""

# 3. Adicionar arquivos
echo -e "${BLUE}[3/6]${NC} Adicionando arquivos ao Git..."
git add .
echo -e "${GREEN}✓ Arquivos adicionados${NC}"
echo ""

# 4. Primeiro commit
echo -e "${BLUE}[4/6]${NC} Criando commit inicial..."
git commit -m "🎉 Initial commit - RAIO Platform

- Setup completo do projeto React + TypeScript + Vite
- Configuração Supabase, Mixpanel e GrowthBook
- Academia RAIO com sistema de cursos
- Comunidade com fóruns temáticos
- Sistema de gamificação completo
- LGPD compliance implementado
- Sprints 1, 2 e 3 concluídos"
echo -e "${GREEN}✓ Commit criado${NC}"
echo ""

# 5. Instruções para conectar ao GitHub
echo -e "${BLUE}[5/6]${NC} Próximos passos para GitHub:"
echo -e "${YELLOW}
1. Crie um novo repositório no GitHub:
   https://github.com/new

2. Execute os seguintes comandos (substitua SEU_USUARIO e SEU_REPO):

   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git branch -M main
   git push -u origin main

${NC}"

# 6. Instruções para Replit
echo -e "${BLUE}[6/6]${NC} Para usar no Replit:"
echo -e "${YELLOW}
Opção A - Importar do GitHub:
1. Após fazer push para o GitHub
2. No Replit: 'Import from GitHub'
3. Selecione seu repositório
4. Configure as Secrets (variáveis de ambiente)
5. Execute: npm install && npm run dev

Opção B - Upload direto:
1. Crie um novo Repl (Node.js)
2. Faça upload dos arquivos
3. Configure as Secrets
4. Execute: npm install && npm run dev

${NC}"

echo -e "${GREEN}=============================="
echo -e "✨ Setup concluído!"
echo -e "==============================${NC}"
echo ""
echo "📚 Leia o README.md para mais informações"
echo "🔐 Não esqueça de configurar o arquivo .env"
echo ""
