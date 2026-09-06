#!/usr/bin/env bash
# Yerel API ayakta olmalı. Yalnızca bu testin oluşturduğu villalar silinir.
set -euo pipefail
python3 - <<'PY'
import base64
import datetime
import http.cookiejar
import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid

api = os.environ.get('API', 'http://localhost:4000/api')
admin = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
public = urllib.request.build_opener()
created = []
original_featured = None
marker = 'Listing-' + uuid.uuid4().hex[:12]

def request(path, method='GET', data=None, authenticated=False, expected=None, content_type='application/json'):
    body = data if isinstance(data, bytes) else json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(api + path, data=body, method=method, headers={'Content-Type': content_type})
    try:
        response = (admin if authenticated else public).open(req, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read()
    result = json.loads(raw) if raw else None
    if expected is not None:
        assert response.code == expected, (path, response.code, result)
    else:
        assert 200 <= response.code < 300, (path, response.code, result)
    return result

def listing(**params):
    return request('/villas?' + urllib.parse.urlencode({'q': marker, **params}))

def ids(result):
    return [v['id'] for v in result['items']]

try:
    request('/auth/login', 'POST', {
        'email': os.environ.get('ADMIN_EMAIL', 'admin@villasepeti.com'),
        'password': os.environ.get('ADMIN_PASSWORD', 'admin1234'),
    }, authenticated=True)
    regions = request('/regions')
    concepts = request('/concepts')
    assert len(regions) >= 2 and concepts, 'En az iki bölge ve bir konsept gerekli.'

    for i, capacity in enumerate([6, 10, 12]):
        villa = request('/admin/villas', 'POST', {
            'title': f'{marker} Villa {i}', 'regionId': regions[i % 2]['id'],
            'buildingType': 'DETACHED', 'maxAdults': capacity, 'bedrooms': 3,
            'bathrooms': 2, 'pricePerNight': 9000 + 6000 * i,
            'conceptIds': [concepts[0]['id']] if i == 0 else [],
            'commissionRate': 12.5,
        }, authenticated=True)
        created.append(villa['id'])
        if i == 2:
            continue  # DRAFT kontrolü için yayına alınmaz.
        boundary = 'villa-smoke-' + uuid.uuid4().hex
        png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=')
        payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nEXTERIOR_VIEW\r\n'
                   f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n').encode() + png + f'\r\n--{boundary}--\r\n'.encode()
        for _ in range(15):
            request(f'/admin/villas/{villa["id"]}/images', 'POST', payload, True, content_type=f'multipart/form-data; boundary={boundary}')
        request(f'/admin/villas/{villa["id"]}/status', 'PATCH', {'status': 'PUBLISHED'}, True)

    low, high, draft = created
    assert set(ids(listing())) == {low, high}
    assert set(ids(listing(status='DRAFT', hostId='anything'))) == {low, high}
    print('  ✓ yalnızca PUBLISHED; status/hostId ile filtre aşılamıyor')
    assert ids(listing(bolge=regions[0]['slug'])) == [low]
    assert ids(listing(konsept=concepts[0]['slug'])) == [low]
    assert listing(bolge=regions[1]['slug'], konsept=concepts[0]['slug'])['total'] == 0
    assert listing(q=marker + '-yok')['total'] == 0
    print('  ✓ arama, bölge, konsept ve birleşik filtreler')
    assert ids(listing(adults=8, children=2)) == [high]
    assert ids(listing(guests=10)) == [high]
    print('  ✓ yetişkin + çocuk toplamı kapasiteyi filtreliyor')

    year = datetime.date.today().year + 1
    request(f'/admin/villas/{low}/blocked-dates', 'POST', {'startDate': f'{year}-07-10', 'endDate': f'{year}-07-15'}, True)
    assert low not in ids(listing(**{'from': f'{year}-07-12', 'to': f'{year}-07-14'}))
    assert low in ids(listing(**{'from': f'{year}-07-15', 'to': f'{year}-07-18'}))
    assert low in ids(listing(**{'from': f'{year}-07-08', 'to': f'{year}-07-10'}))
    print('  ✓ bloke aralığı eleniyor; iki sınırda da çıkış/giriş aynı gün olabiliyor')
    for params in [
        {'from': f'{year}-07-10'}, {'to': f'{year}-07-10'},
        {'from': 'bozuk', 'to': f'{year}-07-15'},
        {'from': f'{year}-02-30', 'to': f'{year}-03-10'},
        {'from': f'{year}-07-15', 'to': f'{year}-07-15'},
        {'from': f'{year}-07-16', 'to': f'{year}-07-15'},
        {'adults': -1}, {'adults': 21}, {'children': 13}, {'page': 'NaN'},
        {'page': 100001}, {'pageSize': 49}, {'sort': 'yanlis'},
    ]:
        request('/villas?' + urllib.parse.urlencode(params), expected=400)
    print('  ✓ eksik/geçersiz tarihler ve sınır dışı parametreler 400')

    assert ids(listing(sort='fiyat_artan')) == [low, high]
    assert ids(listing(sort='fiyat_azalan')) == [high, low]
    first = listing(sort='fiyat_artan', pageSize=1, page=1)
    second = listing(sort='fiyat_artan', pageSize=1, page=2)
    assert first['total'] == second['total'] == 2
    assert ids(first) == [low] and ids(second) == [high]
    assert listing(page=999)['items'] == []
    print('  ✓ fiyat sıralaması, sayfalama ve toplam sonuç sayısı')

    request(f'/admin/villas/{low}/price-rules', 'POST', {'startDate': f'{year}-07-01', 'endDate': f'{year}-08-01', 'pricePerNight': 21000}, True)
    card = listing(sort='fiyat_artan')['items'][0]
    assert card['priceRange'] == {'min': 9000, 'max': 21000}
    assert len(card['images']) == 2 and all(isinstance(url, str) for url in card['images'])
    private = {'commissionRate', 'reviewNote', 'hostId', 'reviewedBy', 'reviewedAt'}
    assert private.isdisjoint(card)

    original_featured = request('/admin/featured', authenticated=True)
    future = f'{year}-12-31'
    request('/admin/featured', 'PUT', {'items': [
        {'villaId': low, 'featuredUntil': future},
        {'villaId': high, 'featuredUntil': '2000-01-01'},
    ]}, True)
    featured = request('/admin/featured', authenticated=True)
    assert [item['id'] for item in featured] == [low, high]
    assert [item['featuredOrder'] for item in featured] == [0, 1]
    home = request('/pages/home')
    for section in home['sections']:
        if section['type'] == 'featuredVillas':
            assert [item['id'] for item in section['content']['villas']] == [low]
            for item in section['content']['villas']:
                assert 'priceRange' in item and private.isdisjoint(item)
    request('/admin/featured', 'PUT', {'items': [
        {'villaId': low}, {'villaId': low},
    ]}, True, expected=400)
    request('/admin/featured', 'PUT', {'items': [{'villaId': draft}]}, True, expected=400)
    request('/admin/featured', expected=401)
    print('  ✓ reklam sırası, süre dolumu, yayın durumu ve admin yetkisi')
    print('  ✓ ortak kart fiyat aralığı ve iki görsel; iç alanlar public yanıtlarda yok')
finally:
    if original_featured is not None:
        request('/admin/featured', 'PUT', {'items': [
            {
                'villaId': item['id'],
                'featuredUntil': item['featuredUntil'][:10] if item['featuredUntil'] else None,
            }
            for item in original_featured
        ]}, True)
        print('  ✓ önceki reklam vitrini geri yüklendi')
    for villa_id in reversed(created):
        request(f'/admin/villas/{villa_id}', 'DELETE', authenticated=True)
    if created:
        assert listing()['total'] == 0
        print('  ✓ test villaları temizlendi')

print('✓ villa listeleme testleri geçti')
PY
