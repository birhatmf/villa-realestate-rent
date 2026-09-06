#!/usr/bin/env bash
# CMS sayfası: oluştur → varsayılan blok → metadata/metin güncelle → public görünüm.
# API ayakta olmalı. Test kaydı çıkışta doğrudan Prisma ile temizlenir.
set -euo pipefail

API="${API:-http://localhost:4000/api}"
EMAIL="${ADMIN_EMAIL:-admin@villasepeti.com}"
PASS="${ADMIN_PASSWORD:-admin1234}"
JAR="$(mktemp)"
SLUG="cms-smoke-$$"
PAGE_ID=""

cleanup() {
  rm -f "$JAR"
  if [ -n "$PAGE_ID" ]; then
    TEST_PAGE_ID="$PAGE_ID" node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.page.delete({ where: { id: process.env.TEST_PAGE_ID } })
  .catch(() => {})
  .finally(() => prisma.\$disconnect());
" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
fail() { echo "✗ $1"; exit 1; }

curl -sf -c "$JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null || fail "giriş yapılamadı"

CREATED=$(curl -sf -b "$JAR" -X POST "$API/admin/pages" -H 'Content-Type: application/json' \
  -d "{\"title\":\"CMS Smoke\",\"slug\":\"$SLUG\"}") || fail "sayfa oluşturulamadı"
PAGE_ID=$(echo "$CREATED" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

PAGE=$(curl -sf -b "$JAR" "$API/admin/pages/$SLUG")
SECTION_ID=$(echo "$PAGE" | python3 -c "
import json,sys
p=json.load(sys.stdin)
assert p['sections'][0]['type']=='textContent'
assert p['seoTitle'] is None and p['seoDescription'] is None
print(p['sections'][0]['id'])
") || fail "varsayılan metin bloğu veya metadata hatalı"
echo "  ✓ sayfa ve varsayılan metin bloğu oluştu"

CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$API/admin/pages" \
  -H 'Content-Type: application/json' -d "{\"title\":\"Kopya\",\"slug\":\"$SLUG\"}")
[ "$CODE" = "409" ] || fail "aynı sayfa adresi kabul edildi (HTTP $CODE)"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$API/admin/pages" \
  -H 'Content-Type: application/json' -d '{"title":"Çakışma","slug":"villalar"}')
[ "$CODE" = "400" ] || fail "sistem adresi kabul edildi (HTTP $CODE)"
echo "  ✓ çakışan adresler reddedildi"

curl -sf -b "$JAR" -X PATCH "$API/admin/pages/$PAGE_ID" -H 'Content-Type: application/json' \
  -d '{"title":"Deneme Sayfası","seoTitle":"Deneme SEO","seoDescription":"Deneme açıklaması"}' >/dev/null \
  || fail "sayfa bilgileri güncellenemedi"
curl -sf -b "$JAR" -X PATCH "$API/admin/sections/$SECTION_ID" -H 'Content-Type: application/json' \
  -d '{"content":{"intro":"Kısa giriş","items":[{"title":"İlk bölüm","body":"İlk paragraf."}]}}' >/dev/null \
  || fail "metin bloğu güncellenemedi"

curl -sf "$API/pages/$SLUG" | python3 -c "
import json,sys
p=json.load(sys.stdin)
assert p['title']=='Deneme Sayfası'
assert p['seo']=={'title':'Deneme SEO','description':'Deneme açıklaması'}
assert p['sections'][0]['content']['items'][0]['title']=='İlk bölüm'
" || fail "güncellemeler public API'ye yansımadı"
echo "  ✓ metadata ve metin public API'ye yansıdı"

echo "✓ CMS sayfa akışı geçti"
