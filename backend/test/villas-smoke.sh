#!/usr/bin/env bash
# Villa modülü dumanı: host oluşturur → sahiplik izolasyonu → görsel/fiyat
# doğrulama → 15 fotoğraf şartı → submit → admin onayı. API ayakta olmalı.
set -euo pipefail

API="${API:-http://localhost:4000/api}"
EMAIL="${ADMIN_EMAIL:-admin@villasepeti.com}"
PASS="${ADMIN_PASSWORD:-admin1234}"
ADMIN_JAR="$(mktemp)"
HOST1_JAR="$(mktemp)"
HOST2_JAR="$(mktemp)"
TMP_DIR="$(mktemp -d)"

fail() { echo "✗ $1"; exit 1; }

cleanup() {
  [ -n "${VILLA_ID:-}" ] && curl -s -b "$ADMIN_JAR" -X DELETE "$API/admin/villas/$VILLA_ID" >/dev/null || true
  [ -n "${HOST1_ID:-}" ] && curl -s -b "$ADMIN_JAR" -X DELETE "$API/admin/users/$HOST1_ID" >/dev/null || true
  [ -n "${HOST2_ID:-}" ] && curl -s -b "$ADMIN_JAR" -X DELETE "$API/admin/users/$HOST2_ID" >/dev/null || true
  rm -rf "$ADMIN_JAR" "$HOST1_JAR" "$HOST2_JAR" "$TMP_DIR"
}
trap cleanup EXIT

SUFFIX="$$-$(date +%s)"
H1_MAIL="villa-host1-$SUFFIX@example.test"
H2_MAIL="villa-host2-$SUFFIX@example.test"

curl -sf -c "$ADMIN_JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null || fail "admin girişi başarısız"

# ---- iki host kullanıcı oluştur, rollerini yükselt ------------------------
curl -sf -c "$HOST1_JAR" -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Villa Host 1\",\"email\":\"$H1_MAIL\",\"password\":\"sifre12345\",\"kvkkAccepted\":true}" >/dev/null
curl -sf -c "$HOST2_JAR" -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Villa Host 2\",\"email\":\"$H2_MAIL\",\"password\":\"sifre12345\",\"kvkkAccepted\":true}" >/dev/null

HOST1_ID=$(curl -sf -b "$ADMIN_JAR" -G "$API/admin/users" --data-urlencode "q=$H1_MAIL" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['items'][0]['id'])")
HOST2_ID=$(curl -sf -b "$ADMIN_JAR" -G "$API/admin/users" --data-urlencode "q=$H2_MAIL" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['items'][0]['id'])")

curl -sf -b "$ADMIN_JAR" -X PATCH "$API/admin/users/$HOST1_ID" -H 'Content-Type: application/json' -d '{"role":"HOST"}' >/dev/null
curl -sf -b "$ADMIN_JAR" -X PATCH "$API/admin/users/$HOST2_ID" -H 'Content-Type: application/json' -d '{"role":"HOST"}' >/dev/null

# Rol değişikliği sonrası taze token gerekiyor (RolesGuard DB'den okur, ama
# login'de zaten güncel rolle çerez basılıyor — yine de tazele).
curl -sf -c "$HOST1_JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$H1_MAIL\",\"password\":\"sifre12345\"}" >/dev/null
curl -sf -c "$HOST2_JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$H2_MAIL\",\"password\":\"sifre12345\"}" >/dev/null
echo "  ✓ iki HOST kullanıcı hazır"

REGION_ID=$(curl -sf "$API/pages/home" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);rg=[s for s in d['sections'] if s['type']=='regionGrid'][0];print(rg['content']['regions'][0]['id'])")

# ---- 2) host villa oluşturur ----------------------------------------------
VILLA=$(curl -sf -b "$HOST1_JAR" -X POST "$API/host/villas" -H 'Content-Type: application/json' -d "{
  \"title\":\"Villa Smoke Test\",\"regionId\":\"$REGION_ID\",\"buildingType\":\"DETACHED\",
  \"maxAdults\":6,\"bedrooms\":3,\"bathrooms\":2,\"pricePerNight\":15000}")
VILLA_ID=$(echo "$VILLA" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
STATUS=$(echo "$VILLA" | python3 -c "import json,sys;print(json.load(sys.stdin)['status'])")
CAP=$(echo "$VILLA" | python3 -c "import json,sys;print(json.load(sys.stdin)['capacity'])")
[ "$STATUS" = "DRAFT" ] || fail "yeni villa DRAFT değil: $STATUS"
[ "$CAP" = "6" ] || fail "capacity otomatik hesaplanmadı: $CAP"
echo "  ✓ host villa oluşturdu (DRAFT, capacity=6)"

# ---- 3) sahiplik izolasyonu ------------------------------------------------
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$HOST2_JAR" "$API/host/villas/$VILLA_ID")
[ "$CODE" = "404" ] || fail "host2 başka host'un villasını görebiliyor (HTTP $CODE)"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$HOST2_JAR" -X PATCH "$API/host/villas/$VILLA_ID" \
  -H 'Content-Type: application/json' -d '{"title":"ele geçirildi"}')
[ "$CODE" = "404" ] || fail "host2 başka host'un villasını düzenleyebiliyor (HTTP $CODE)"
echo "  ✓ sahiplik izolasyonu (host2 → 404)"

# ---- 4) görsel doğrulama ---------------------------------------------------
printf '\xff\xd8\xff\xe0fake-jpeg' > "$TMP_DIR/fake.jpg"
IMG=$(curl -sf -b "$HOST1_JAR" -X POST "$API/host/villas/$VILLA_ID/images" \
  -F "category=EXTERIOR_VIEW" -F "width=1920" -F "height=1080" -F "file=@$TMP_DIR/fake.jpg;type=image/jpeg")
echo "$IMG" | grep -q '"url"' || fail "görsel yüklenemedi"
IMG_URL=$(echo "$IMG" | python3 -c "import json,sys;print(json.load(sys.stdin)['url'])")
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$IMG_URL")
[ "$CODE" = "200" ] || fail "yüklenen görsel herkese açık servis edilmiyor (HTTP $CODE)"

printf 'fake exe' > "$TMP_DIR/bad.exe"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/host/villas/$VILLA_ID/images" -b "$HOST1_JAR" \
  -F "category=OTHER" -F "file=@$TMP_DIR/bad.exe;type=application/x-msdownload")
[ "$CODE" = "400" ] || fail "izinsiz MIME kabul edildi (HTTP $CODE)"
echo "  ✓ görsel yüklendi + herkese açık + izinsiz MIME reddedildi"

# ---- 5) fiyat kuralı çakışması --------------------------------------------
curl -sf -b "$HOST1_JAR" -X POST "$API/host/villas/$VILLA_ID/price-rules" -H 'Content-Type: application/json' \
  -d '{"startDate":"2026-07-01","endDate":"2026-08-01","pricePerNight":25000}' >/dev/null
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$HOST1_JAR" -X POST "$API/host/villas/$VILLA_ID/price-rules" \
  -H 'Content-Type: application/json' -d '{"startDate":"2026-07-15","endDate":"2026-08-15","pricePerNight":26000}')
[ "$CODE" = "400" ] || fail "çakışan fiyat kuralı kabul edildi (HTTP $CODE)"
echo "  ✓ çakışan fiyat kuralı reddedildi"

# ---- 6) <15 fotoğrafla submit reddedilir, 15'e tamamlanınca kabul edilir --
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH -b "$HOST1_JAR" "$API/host/villas/$VILLA_ID/submit")
[ "$CODE" = "400" ] || fail "<15 fotoğrafla submit kabul edildi (HTTP $CODE)"

for i in $(seq 1 14); do
  curl -sf -o /dev/null -X POST "$API/host/villas/$VILLA_ID/images" -b "$HOST1_JAR" \
    -F "category=BEDROOM" -F "file=@$TMP_DIR/fake.jpg;type=image/jpeg"
done
SUBMIT=$(curl -s -X PATCH -b "$HOST1_JAR" "$API/host/villas/$VILLA_ID/submit")
echo "$SUBMIT" | grep -q '"status":"PENDING_REVIEW"' || fail "15 fotoğrafla submit PENDING_REVIEW'a geçmedi: $SUBMIT"
echo "  ✓ 15 fotoğraf şartı (<15 red, =15 kabul → PENDING_REVIEW)"

# ---- 7) admin onaylar, ana sayfada görünür hâle gelir ---------------------
REVIEW=$(curl -sf -b "$ADMIN_JAR" -X PATCH "$API/admin/villas/$VILLA_ID/status" \
  -H 'Content-Type: application/json' -d '{"status":"PUBLISHED"}')
echo "$REVIEW" | grep -q '"status":"PUBLISHED"' || fail "admin onayı PUBLISHED yapmadı"
FOUND=$(curl -sf -b "$ADMIN_JAR" -G "$API/admin/villas" --data-urlencode "status=PUBLISHED" \
  --data-urlencode "q=Villa Smoke Test" | python3 -c "import json,sys;print(json.load(sys.stdin)['total'])")
[ "$FOUND" = "1" ] || fail "onaylanan villa admin listesinde görünmüyor"
echo "  ✓ admin onayladı → PUBLISHED, listede görünüyor"

# ---- admin kendi villasını doğrudan oluşturabilir --------------------------
ADMIN_VILLA=$(curl -sf -b "$ADMIN_JAR" -X POST "$API/admin/villas" -H 'Content-Type: application/json' -d "{
  \"title\":\"Admin Villa Smoke\",\"regionId\":\"$REGION_ID\",\"buildingType\":\"BUNGALOW\",
  \"maxAdults\":4,\"bedrooms\":2,\"bathrooms\":1,\"pricePerNight\":9000}")
echo "$ADMIN_VILLA" | python3 -c "import json,sys;d=json.load(sys.stdin);assert d['hostId'] is None" \
  || fail "admin villasında hostId boş değil"
curl -sf -b "$ADMIN_JAR" -X DELETE "$API/admin/villas/$(echo "$ADMIN_VILLA" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")" >/dev/null
echo "  ✓ admin kendi villasını hostId'siz oluşturabiliyor"

# ---- oturumsuz erişim engellenmeli -----------------------------------------
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/host/villas")
[ "$CODE" = "401" ] || fail "oturumsuz host/villas erişimi açık (HTTP $CODE)"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/admin/villas")
[ "$CODE" = "401" ] || fail "oturumsuz admin/villas erişimi açık (HTTP $CODE)"
echo "  ✓ oturumsuz erişim 401"

echo "✓ tüm adımlar geçti"
