#!/usr/bin/env bash
# Villa detay/favoriler dumanı: public erişim + fiyat aralığı + komisyon
# güvenliği + favoriler. API ayakta olmalı.
set -euo pipefail

API="${API:-http://localhost:4000/api}"
EMAIL="${ADMIN_EMAIL:-admin@villasepeti.com}"
PASS="${ADMIN_PASSWORD:-admin1234}"
ADMIN_JAR="$(mktemp)"
HOST_JAR="$(mktemp)"

fail() { echo "✗ $1"; exit 1; }

cleanup() {
  [ -n "${VILLA_ID:-}" ] && curl -s -b "$ADMIN_JAR" -X DELETE "$API/admin/villas/$VILLA_ID" >/dev/null || true
  [ -n "${HOST_ID:-}" ] && curl -s -b "$ADMIN_JAR" -X DELETE "$API/admin/users/$HOST_ID" >/dev/null || true
  rm -f "$ADMIN_JAR" "$HOST_JAR"
}
trap cleanup EXIT

SUFFIX="$$-$(date +%s)"
H_MAIL="detail-host-$SUFFIX@example.test"

curl -sf -c "$ADMIN_JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null || fail "admin girişi başarısız"

curl -sf -c "$HOST_JAR" -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Detail Host\",\"email\":\"$H_MAIL\",\"password\":\"sifre12345\",\"kvkkAccepted\":true}" >/dev/null
HOST_ID=$(curl -sf -b "$ADMIN_JAR" -G "$API/admin/users" --data-urlencode "q=$H_MAIL" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['items'][0]['id'])")
curl -sf -b "$ADMIN_JAR" -X PATCH "$API/admin/users/$HOST_ID" -H 'Content-Type: application/json' -d '{"role":"HOST"}' >/dev/null
curl -sf -c "$HOST_JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$H_MAIL\",\"password\":\"sifre12345\"}" >/dev/null
echo "  ✓ host hazır"

REGION_ID=$(curl -sf "$API/regions" | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")

# ---- komisyon güvenliği: host göndersin, sunucu düşürsün -------------------
VILLA=$(curl -sf -b "$HOST_JAR" -X POST "$API/host/villas" -H 'Content-Type: application/json' -d "{
  \"title\":\"Detail Smoke Villa\",\"regionId\":\"$REGION_ID\",\"buildingType\":\"DETACHED\",
  \"maxAdults\":4,\"bedrooms\":2,\"bathrooms\":1,\"pricePerNight\":9000,\"commissionRate\":5}")
VILLA_ID=$(echo "$VILLA" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
SLUG=$(echo "$VILLA" | python3 -c "import json,sys;print(json.load(sys.stdin)['slug'])")
echo "$VILLA" | python3 -c "import json,sys;d=json.load(sys.stdin);assert d['commissionRate'] is None" \
  || fail "host commissionRate belirleyebiliyor"
echo "  ✓ host commissionRate gönderse de sunucu düşürüyor"

curl -sf -b "$ADMIN_JAR" -X PATCH "$API/admin/villas/$VILLA_ID" -H 'Content-Type: application/json' \
  -d '{"commissionRate":12.5}' | grep -q '"commissionRate":12.5' || fail "admin commissionRate atayamıyor"
echo "  ✓ admin commissionRate atayabiliyor"

# ---- public erişim: yalnızca PUBLISHED ------------------------------------
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/villas/$SLUG")
[ "$CODE" = "404" ] || fail "DRAFT villa public'ten erişilebiliyor (HTTP $CODE)"
echo "  ✓ DRAFT villa public uçtan 404"

# Yayın ≥15 görsel ister (villas.service.ts review()) — 15 sahte JPEG yükle.
TMP_DIR="$(mktemp -d)"
printf '\xff\xd8\xff\xe0fake' > "$TMP_DIR/fake.jpg"
for i in $(seq 1 15); do
  curl -sf -o /dev/null -X POST "$API/admin/villas/$VILLA_ID/images" -b "$ADMIN_JAR" \
    -F "category=EXTERIOR_VIEW" -F "file=@$TMP_DIR/fake.jpg;type=image/jpeg"
done
rm -rf "$TMP_DIR"

curl -sf -b "$ADMIN_JAR" -X PATCH "$API/admin/villas/$VILLA_ID/status" -H 'Content-Type: application/json' \
  -d '{"status":"PUBLISHED"}' >/dev/null
PUBLIC=$(curl -sf "$API/villas/$SLUG")
echo "$PUBLIC" | grep -q '"status":"PUBLISHED"' || fail "yayınlanan villa public'ten görünmüyor"
echo "  ✓ PUBLISHED villa public uçtan erişilebiliyor"

# ---- fiyat aralığı ----------------------------------------------------------
curl -sf -b "$ADMIN_JAR" -X POST "$API/admin/villas/$VILLA_ID/price-rules" -H 'Content-Type: application/json' \
  -d '{"startDate":"2026-07-01","endDate":"2026-08-01","pricePerNight":21000}' >/dev/null
RANGE=$(curl -sf "$API/villas/$SLUG" | python3 -c "import json,sys;d=json.load(sys.stdin)['priceRange'];print(d['min'],d['max'])")
[ "$RANGE" = "9000 21000" ] || fail "fiyat aralığı yanlış hesaplandı: $RANGE"
echo "  ✓ fiyat aralığı doğru (9000–21000)"

# ---- favoriler ---------------------------------------------------------------
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/favorites")
[ "$CODE" = "401" ] || fail "oturumsuz favori listesi açık (HTTP $CODE)"

curl -sf -X POST -b "$HOST_JAR" "$API/favorites/$VILLA_ID" >/dev/null
LIST=$(curl -sf -b "$HOST_JAR" "$API/favorites")
echo "$LIST" | grep -q "$VILLA_ID" || fail "favori eklenmedi"
echo "  ✓ favori eklendi ve listede görünüyor"

curl -sf -X DELETE -b "$HOST_JAR" "$API/favorites/$VILLA_ID" >/dev/null
LIST2=$(curl -sf -b "$HOST_JAR" "$API/favorites")
echo "$LIST2" | grep -q "$VILLA_ID" && fail "favori kaldırılmadı"
echo "  ✓ favori kaldırıldı"

echo "✓ tüm adımlar geçti"
