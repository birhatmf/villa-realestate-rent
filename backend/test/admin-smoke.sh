#!/usr/bin/env bash
# Admin blok CRUD dumanı: ekle → sırala → gizle → sil sonrası order'lar
# her adımda 0..n-1 ardışık kalmalı. API ayakta olmalı (npm run dev).
set -euo pipefail

API="${API:-http://localhost:4000/api}"
EMAIL="${ADMIN_EMAIL:-admin@villasepeti.com}"
PASS="${ADMIN_PASSWORD:-admin1234}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

fail() { echo "✗ $1"; exit 1; }

# order dizisi 0,1,2,… mi?
assert_orders() {
  local step="$1"
  curl -sf -b "$JAR" "$API/admin/pages/home" | python3 -c "
import json,sys
s=json.load(sys.stdin)['sections']
got=[x['order'] for x in s]
want=list(range(len(s)))
sys.exit(0 if got==want else print(f'orders={got} want={want}') or 1)
" || fail "$step: order'lar ardışık değil"
  echo "  ✓ $step"
}

curl -sf -c "$JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" > /dev/null || fail "giriş yapılamadı"

PAGE=$(curl -sf -b "$JAR" "$API/admin/pages/home")
PAGE_ID=$(echo "$PAGE" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
BEFORE=$(echo "$PAGE" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['sections']))")
# Test sayfanın gerçek sırasını değiştiriyor; çıkarken aynen geri koyuyoruz.
ORIGINAL=$(echo "$PAGE" | python3 -c "import json,sys; print(json.dumps([x['id'] for x in json.load(sys.stdin)['sections']]))")
restore() {
  curl -s -b "$JAR" -X PUT "$API/admin/pages/$PAGE_ID/sections/order" \
    -H 'Content-Type: application/json' -d "{\"ids\":$ORIGINAL}" > /dev/null || true
  rm -f "$JAR"
}
trap restore EXIT
assert_orders "başlangıç ($BEFORE blok)"

# 1. ortaya blok ekle
NEW_ID=$(curl -sf -b "$JAR" -X POST "$API/admin/pages/$PAGE_ID/sections" \
  -H 'Content-Type: application/json' \
  -d '{"type":"statBar","content":{"stats":[{"value":"1","label":"test"}]},"index":2}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
assert_orders "index 2'ye ekleme"

# 2. ters sırala
IDS=$(curl -sf -b "$JAR" "$API/admin/pages/home" \
  | python3 -c "import json,sys; print(json.dumps([x['id'] for x in reversed(json.load(sys.stdin)['sections'])]))")
curl -sf -b "$JAR" -X PUT "$API/admin/pages/$PAGE_ID/sections/order" \
  -H 'Content-Type: application/json' -d "{\"ids\":$IDS}" > /dev/null
assert_orders "ters sıralama"

# 3. eksik id ile sıralama reddedilmeli
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X PUT "$API/admin/pages/$PAGE_ID/sections/order" \
  -H 'Content-Type: application/json' -d "{\"ids\":[\"$NEW_ID\"]}")
[ "$CODE" = "404" ] || fail "eksik id listesi kabul edildi (HTTP $CODE)"
echo "  ✓ eksik sıralama listesi reddedildi"

# 4. gizle
curl -sf -b "$JAR" -X PATCH "$API/admin/sections/$NEW_ID" \
  -H 'Content-Type: application/json' -d '{"visible":false}' > /dev/null
curl -sf "$API/pages/home" | grep -q "$NEW_ID" && fail "gizli blok public API'de görünüyor"
echo "  ✓ gizli blok public API'den düştü"

# 5. sil, blok sayısı başa dönmeli
curl -sf -b "$JAR" -X DELETE "$API/admin/sections/$NEW_ID" > /dev/null
assert_orders "silme sonrası"
AFTER=$(curl -sf -b "$JAR" "$API/admin/pages/home" \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)['sections']))")
[ "$AFTER" = "$BEFORE" ] || fail "blok sayısı $BEFORE → $AFTER"

# 6. footer ayarı: kaydet → public API'ye yansısın → geri al
FOOTER_BEFORE=$(curl -sf -b "$JAR" "$API/admin/settings/footer")
MARKER="smoke-$$"
echo "$FOOTER_BEFORE" | python3 -c "
import json,sys
v=json.load(sys.stdin); v['copyright']='$MARKER'
print(json.dumps({'value':v}))
" | curl -sf -b "$JAR" -X PUT "$API/admin/settings/footer" \
  -H 'Content-Type: application/json' -d @- > /dev/null || fail "footer kaydedilemedi"

curl -sf "$API/settings/footer" | grep -q "$MARKER" || fail "footer değişikliği public API'ye yansımadı"
echo "  ✓ footer kaydı public API'ye yansıdı"

curl -sf -b "$JAR" -X PUT "$API/admin/settings/footer" -H 'Content-Type: application/json' \
  -d "{\"value\":$FOOTER_BEFORE}" > /dev/null || fail "footer geri yüklenemedi"
curl -sf "$API/settings/footer" | grep -q "$MARKER" && fail "footer geri yüklenemedi"
echo "  ✓ footer geri yüklendi"

# 7. oturumsuz erişim engellenmeli (okuma public, yazma korumalı)
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/admin/pages")
[ "$CODE" = "401" ] || fail "oturumsuz admin erişimi açık (HTTP $CODE)"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/admin/settings/footer" \
  -H 'Content-Type: application/json' -d '{"value":{}}')
[ "$CODE" = "401" ] || fail "oturumsuz footer yazma açık (HTTP $CODE)"
echo "  ✓ oturumsuz erişim 401"

# ---- müşteri hesapları ve rol sınırı --------------------------------------
CUST_JAR="$(mktemp)"
CUST_MAIL="smoke-$$@example.test"
CUST_PASS="sifre12345"

REG=$(curl -s -o /dev/null -w '%{http_code}' -c "$CUST_JAR" -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Test\",\"email\":\"$CUST_MAIL\",\"password\":\"$CUST_PASS\",\"phone\":\"05550000000\",\"kvkkAccepted\":true}")
[ "$REG" = "201" ] || fail "müşteri kaydı başarısız (HTTP $REG)"
echo "  ✓ müşteri kaydı oluştu"

# En kritik iddia: müşteri admin uçlarına giremez.
for ep in "GET $API/admin/pages" "GET $API/admin/users" "GET $API/admin/settings/footer"; do
  set -- $ep
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$CUST_JAR" -X "$1" "$2")
  [ "$CODE" = "403" ] || fail "müşteri $2 uçuna erişebiliyor (HTTP $CODE)"
done
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$CUST_JAR" -X PUT "$API/admin/settings/footer" \
  -H 'Content-Type: application/json' -d '{"value":{}}')
[ "$CODE" = "403" ] || fail "müşteri footer yazabiliyor (HTTP $CODE)"
echo "  ✓ müşteri admin uçlarında 403"

# Aynı e-posta ikinci kez kabul edilmemeli.
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Kopya\",\"email\":\"$CUST_MAIL\",\"password\":\"$CUST_PASS\",\"kvkkAccepted\":true}")
[ "$CODE" = "409" ] || fail "aynı e-posta ikinci kez kabul edildi (HTTP $CODE)"
echo "  ✓ tekrar kayıt 409"

# KVKK onayı zorunlu.
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Onaysiz\",\"email\":\"nokvkk-$$@example.test\",\"password\":\"$CUST_PASS\",\"kvkkAccepted\":false}")
[ "$CODE" = "400" ] || fail "KVKK onayı olmadan kayıt kabul edildi (HTTP $CODE)"
echo "  ✓ KVKK onayı olmadan kayıt 400"

# Admin üyeyi görebilmeli, yanıtta passwordHash olmamalı.
LIST=$(curl -sf -b "$JAR" "$API/admin/users?q=smoke-$$")
echo "$LIST" | grep -q "$CUST_MAIL" || fail "yeni üye admin listesinde yok"
echo "$LIST" | grep -q "passwordHash" && fail "yanıtta passwordHash sızıyor"
echo "  ✓ üye listede, passwordHash sızmıyor"

CUST_ID=$(echo "$LIST" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['id'])")

# Rol değiştirme.
curl -sf -b "$JAR" -X PATCH "$API/admin/users/$CUST_ID" -H 'Content-Type: application/json' \
  -d '{"role":"HOST"}' | grep -q '"role":"HOST"' || fail "rol HOST yapılamadı"
echo "  ✓ rol HOST olarak güncellendi"

# Kilitlenme koruması: admin kendi yetkisini düşüremez.
ADMIN_ID=$(curl -sf -b "$JAR" "$API/auth/me" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X PATCH "$API/admin/users/$ADMIN_ID" \
  -H 'Content-Type: application/json' -d '{"role":"GUEST"}')
[ "$CODE" = "400" ] || fail "admin kendi yetkisini düşürebiliyor (HTTP $CODE)"
echo "  ✓ admin kendini yetkisizleştiremiyor"

# Engellenen hesap giriş yapamamalı.
curl -sf -b "$JAR" -X PATCH "$API/admin/users/$CUST_ID" -H 'Content-Type: application/json' \
  -d '{"active":false}' > /dev/null
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$CUST_MAIL\",\"password\":\"$CUST_PASS\"}")
[ "$CODE" = "401" ] || fail "engelli hesap giriş yapabiliyor (HTTP $CODE)"
echo "  ✓ engelli hesap giriş yapamıyor"

# Temizlik.
curl -sf -b "$JAR" -X DELETE "$API/admin/users/$CUST_ID" > /dev/null || fail "test üyesi silinemedi"
curl -sf -b "$JAR" "$API/admin/users?q=smoke-$$" | grep -q "$CUST_MAIL" && fail "test üyesi silinmedi"
rm -f "$CUST_JAR"
echo "  ✓ test üyesi temizlendi"

echo "✓ tüm adımlar geçti"
