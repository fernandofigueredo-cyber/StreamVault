#!/bin/sh
set -e
echo "==> Aplicando schema no banco..."
npx drizzle-kit push --force || echo "!! push falhou, seguindo"
echo "==> Iniciando StreamVault..."
exec npm run start
