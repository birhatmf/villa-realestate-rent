#!/usr/bin/env bash
# Bölge/Konsept yönetimi dumanı: CRUD + villa bağlantısı + silme koruması.
set -euo pipefail

API="${API:-http://localhost:4000/api}"
EMAIL="${ADMIN_EMAIL:-admin@villasepeti.com}"
PASS="${ADMIN_PASSWORD:-admin1234}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

fail() { echo "✗ $1"; exit 1; }

curl -sf -c "$JAR" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null || fail "giriş yapılamadı"

# ---- public uçlar ----------------------------------------------------------
REGIONS_BEFORE=$(curl -sf "$API/regions" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")
CONCEPTS_BEFORE=$(curl -sf "$API/concepts" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))")
echo "  ✓ public /regions ve /concepts erişilebilir ($REGIONS_BEFORE bölge, $CONCEPTS_BEFORE konsept)"

# ---- bölge CRUD -------------------------------------------------------------
REGION=$(curl -sf -b "$JAR" -X POST "$API/admin/regions" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Bölge","image":"https://images.unsplash.com/photo-1519046904884-53103b34b206"}')
REGION_ID=$(echo "$REGION" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
echo "$REGION" | grep -q '"slug":"smoke-bolge"' || fail "slug otomatik üretilmedi"
echo "  ✓ bölge oluşturuldu, slug otomatik"

curl -sf -b "$JAR" -X PATCH "$API/admin/regions/$REGION_ID" -H 'Content-Type: application/json' \
  -d '{"subtitle":"güncellendi"}' | grep -q '"subtitle":"güncellendi"' || fail "bölge güncellenemedi"
echo "  ✓ bölge güncellendi"

# ---- konsept CRUD + villa bağlama -------------------------------------------
CONCEPT=$(curl -sf -b "$JAR" -X POST "$API/admin/concepts" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Konsept","description":"test","image":"https://images.unsplash.com/photo-1611892440504-42a792e24d32"}')
CONCEPT_ID=$(echo "$CONCEPT" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
echo "  ✓ konsept oluşturuldu"

VILLA=$(curl -sf -b "$JAR" -X POST "$API/admin/villas" -H 'Content-Type: application/json' -d "{
  \"title\":\"Taxonomy Smoke Villa\",\"regionId\":\"$REGION_ID\",\"buildingType\":\"DETACHED\",
  \"maxAdults\":4,\"bedrooms\":2,\"bathrooms\":1,\"pricePerNight\":9000,\"conceptIds\":[\"$CONCEPT_ID\"]}")
VILLA_ID=$(echo "$VILLA" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
echo "$VILLA" | python3 -c "import json,sys;d=json.load(sys.stdin);assert d['concepts'][0]['id']=='$CONCEPT_ID'" \
  || fail "villa konsepte bağlanmadı"
echo "  ✓ villa oluştururken konsepte bağlandı"

# ---- silme koruması: villası olan bölge silinemez ---------------------------
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X DELETE "$API/admin/regions/$REGION_ID")
[ "$CODE" = "400" ] || fail "villalı bölge silinebiliyor (HTTP $CODE)"
echo "  ✓ villalı bölge silinemiyor (400)"

# Konsept m2m: villası olsa da silinebilmeli (bağlantı otomatik kopar).
CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X DELETE "$API/admin/concepts/$CONCEPT_ID")
[ "$CODE" = "200" ] || fail "villalı konsept silinemiyor (HTTP $CODE)"
echo "  ✓ villalı konsept silinebiliyor (m2m otomatik kopar)"

# ---- sıralama ----------------------------------------------------------------
IDS=$(curl -sf -b "$JAR" "$API/admin/regions" | python3 -c "import json,sys;print(json.dumps([r['id'] for r in reversed(json.load(sys.stdin))]))")
curl -sf -b "$JAR" -X PUT "$API/admin/regions/order" -H 'Content-Type: application/json' -d "{\"ids\":$IDS}" >/dev/null
FIRST_NOW=$(curl -sf -b "$JAR" "$API/admin/regions" | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
FIRST_WANT=$(echo "$IDS" | python3 -c "import json,sys;print(json.load(sys.stdin)[0])")
[ "$FIRST_NOW" = "$FIRST_WANT" ] || fail "sıralama uygulanmadı"
echo "  ✓ sıralama uygulandı"
# Geri al (orijinal seed sırasına).
ORIG=$(echo "$IDS" | python3 -c "import json,sys;print(json.dumps(list(reversed(json.load(sys.stdin)))))")
curl -sf -b "$JAR" -X PUT "$API/admin/regions/order" -H 'Content-Type: application/json' -d "{\"ids\":$ORIG}" >/dev/null

# ---- temizlik + oturumsuz erişim --------------------------------------------
curl -sf -b "$JAR" -X DELETE "$API/admin/villas/$VILLA_ID" >/dev/null
curl -sf -b "$JAR" -X DELETE "$API/admin/regions/$REGION_ID" >/dev/null

CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/admin/regions")
[ "$CODE" = "401" ] || fail "oturumsuz admin/regions erişimi açık (HTTP $CODE)"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/admin/concepts")
[ "$CODE" = "401" ] || fail "oturumsuz admin/concepts erişimi açık (HTTP $CODE)"
echo "  ✓ oturumsuz erişim 401, temizlik tamam"

echo "✓ tüm adımlar geçti"
