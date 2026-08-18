#!/bin/bash

# Script para configurar o modo de idioma do repositório
# Uso: ./scripts/set-mode.sh [en-first|pt-br-first]
#
# Convenção de nomenclatura:
#   Modo EN:     README.md (inglês) + README-PT-BR.md (português)
#   Modo PT-BR:  README.md (português) + README-ENG.md (inglês)

set -e

MODE=$1

if [ -z "$MODE" ]; then
  echo "❌ Erro: Modo não especificado"
  echo "Uso: ./scripts/set-mode.sh [en-first|pt-br-first]"
  echo ""
  echo "Modos disponíveis:"
  echo "  en-first    - Inglês é a fonte da verdade (padrão)"
  echo "  pt-br-first - Português é a fonte da verdade"
  exit 1
fi

if [ "$MODE" != "en-first" ] && [ "$MODE" != "pt-br-first" ]; then
  echo "❌ Erro: Modo inválido: $MODE"
  echo "Modos válidos: en-first, pt-br-first"
  exit 1
fi

# Definir nomes dos arquivos baseado no modo
if [ "$MODE" = "en-first" ]; then
  PRIMARY="README.md"
  SECONDARY="README-PT-BR.md"
  PRIMARY_LANG="en"
  SECONDARY_LANG="pt-BR"
else
  PRIMARY="README.md"
  SECONDARY="README-ENG.md"
  PRIMARY_LANG="pt-BR"
  SECONDARY_LANG="en"
fi

# Atualizar o arquivo de configuração
cat > .github/mode.json << EOF
{
  "mode": "$MODE",
  "description": "Language mode configuration for the repository",
  "primary_language": "$PRIMARY_LANG",
  "secondary_language": "$SECONDARY_LANG",
  "source_of_truth": "$PRIMARY",
  "translation_file": "$SECONDARY",
  "modes": {
    "en-first": {
      "primary": "README.md",
      "secondary": "README-PT-BR.md",
      "description": "English is the source of truth, Portuguese is the translation"
    },
    "pt-br-first": {
      "primary": "README.md",
      "secondary": "README-ENG.md",
      "description": "Portuguese is the source of truth, English is the translation"
    }
  }
}
EOF

echo "✅ Modo configurado com sucesso: $MODE"
echo ""
if [ "$MODE" = "en-first" ]; then
  echo "📄 Fonte da verdade: README.md (Inglês)"
  echo "📄 Tradução: README-PT-BR.md (Português)"
else
  echo "📄 Fonte da verdade: README.md (Português)"
  echo "📄 Tradução: README-ENG.md (Inglês)"
fi
echo ""
echo "💡 Lembre-se de fazer commit das alterações:"
echo "   git add .github/mode.json"
echo "   git commit -m 'chore: set language mode to $MODE'"
