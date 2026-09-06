# Villa müsaitliği, rezervasyon ve iCal uygulama planı

Tarih: 6 Eylül 2026. Durum: Aşama 1–3 kodu ile veri-koruyan SQL migration'ları tamamlandı; geliştirme veritabanına uygulandı. Aşama 4–5 plan aşamasında.

Amaç: Aynı villanın aynı gecesinin kendi sistemimizde iki kişiye satılmasını önlemek; ev sahibi, admin ve dış takvim kayıtlarını birlikte değerlendirmek; belirsizliği satış sırasında görünür kılmak. Mevcut NestJS + Prisma + PostgreSQL ve Next.js yapısı korunacak. İlk kapsamda her villa tek rezervasyonla tamamen kiralanır; oda bazlı stok yoktur.

## 1. Mevcut projede gördüğüm durum

| Mevcut yapı | Sonuç / yapılacak iş |
| --- | --- |
| `VillaBlockedDate` yalnızca tarih aralığı ve not tutuyor. | Rezervasyon, bakım, ev sahibi kullanımı ve dış takvim ayrıştırılmalı. Eski kayıtlar rezervasyon varsayılmamalı. |
| Listeleme, bloklarla `[giriş, çıkış)` çakışmasını kontrol ediyor. | Bu doğru sınır kuralı korunmalı; süreli bekletmeler, kişi sınırları ve konaklama kuralları eklenmeli. |
| `addBlockedDate` doğrudan kayıt açıyor. | Yeni rezervasyonlarla eşzamanlı çalışırken tek işlem kapısından geçmeli. |
| `addPriceRule` önce çakışma arıyor, sonra ayrı işlemde ekliyor. | İki eşzamanlı istek kontrolü geçebilir. Fiyat kuralları da transaction ve veritabanı kısıtıyla korunmalı. |
| `getPublic` detay ilişkilerini döndürüyor; blokların `note` alanını ayıklamıyor. | İç notlar halka açık API'den kaldırılmalı; açık alan listesi olan yanıt kullanılmalı. |
| Detay takvimi yalnızca iki ayı gösteriyor; admin blok ekleme/silme listesi kullanıyor. | Kaynağı görülen, ay gezintili ve işlem yapılabilen yönetim takvimi gerekli. |
| Rezervasyon, ödeme, iCal kaynağı ve senkronizasyon işçisi bulunmuyor. | Bunlar mevcut takvim özelliğinin tamamlanmış parçaları kabul edilmemeli. |
| Paket komutlarında `prisma db push` var; migration geçmişi yok. | Rezervasyon verisi gelmeden sürümlü, veri koruyan migration düzenine geçilmeli. |

İncelenen ana dosyalar: `backend/prisma/schema.prisma`, `backend/src/villas/villas.service.ts`, `backend/src/villas/dto.ts`, host/admin villa controller'ları, `frontend/components/villas/VillaForm.tsx`, `frontend/components/site/AvailabilityCalendar.tsx`, `frontend/components/blocks/DateRangeField.tsx`, villa detay sayfası ve API tipleri.

## 2. Kavramlar ve satış kuralları

**Müsaitlik veritabanında açılıp kapanan bağımsız bir bayrak değildir.** İstenen tarihler, kişi dağılımı, satış kuralları, rezervasyonlar, kapatmalar ve kaynak sağlığı üzerinden hesaplanan sonuçtur. İlanın yayında olması da satışa açık olduğu anlamına gelmez.

| Kavram | Anlamı | Geceyi kapatır mı? |
| --- | --- | --- |
| Talep | Misafir bilgi veya rezervasyon onayı istiyor. | Hayır; tek başına stok hakkı vermez. |
| Süreli bekletme (`HOLD`) | İşlem yapan misafire kısa süre ayrılmış stok. | Süresi dolana kadar evet. |
| Onaylı rezervasyon (`CONFIRMED`) | Gelecekteki konaklama için verilmiş kesin taahhüt. | Evet. Ödenmiş olması ayrı bilgidir. |
| Konaklama doluluğu | Misafirin fiilen villada bulunması. | Onaylı rezervasyonun operasyon durumudur; ikinci stok kaydı açılmaz. |
| Manuel kapatma | Bakım, ev sahibi kullanımı veya satışa kapatma. | Evet; rezervasyon ve gelir sayılmaz. |
| Dış takvim blokajı | Bir iCal kaynağının meşgul bildirdiği aralık. | Evet; ödenmiş rezervasyon olduğu varsayılmaz. |
| Belirsiz müsaitlik | İlk senkronizasyon tamamlanmamış veya kaynak güvenilir biçimde güncellenemiyor. | Anında satışa izin verilmez; talep alınabilir. |
| İptal / süresi dolmuş bekletme | Stok hakkı sona ermiş işlem. | Hayır; aynı tarihi kapatan başka neden varsa tarih yine açılmaz. |

Önerilen tarih sözleşmesi:

- Gece aralıkları **giriş dahil, çıkış hariç** tutulur. 10–15 Eylül rezervasyonu beş gecedir; 15 Eylül başka misafirin giriş günü olabilir.
- Konaklama tarihleri API'de `YYYY-MM-DD`, PostgreSQL'de `DATE`; işlem zamanı ve bekletme bitişi `timestamptz` olur. Tarih farkı milisaniyeyi 24 saate bölerek hesaplanmaz.
- Villa saat dilimi başlangıçta `Europe/Istanbul`; günün geçmiş olup olmadığı villa saat diliminde hesaplanır. Giriş/çıkış saatleri gece aralığından ayrı kalır.
- İlk sürümde aynı gün çıkış/giriş mümkündür; ek boş gece sıfırdır. Daha sonra hazırlık gecesi istenirse müsaitlik hesabı, veritabanı çakışma aralığı ve iCal aktarımı birlikte genişletilir.
- `maxAdults`, `maxChildren`, `maxInfants` ayrı ayrı ve toplam kapasite birlikte doğrulanır. Bebeklerin kapasite hesabı açıkça tanımlanır; mevcut yetişkin + çocuk toplamı korunur.
- Öneri: minimum gece, **giriş tarihine uygulanan sezon kuralından**, yoksa villa varsayılanından gelir. `checkInWeekday` ayrıca uygulanır. Böylece sezon geçişli rezervasyonların yorumu nettir.
- Önceden rezervasyon süresi ve ileri satış sınırı konur: başlangıç önerisi en az bir gün önceden, en fazla 12 ay ileriye. Bunlar ürün varsayımlarıdır, mevcut davranış değildir.
- Her gece kendi sezon fiyatından hesaplanır. Temizlik ücreti mevcut eşik kuralını korur. Hasar depozitosu ile rezervasyon ön ödemesi ayrı kavramlardır. Onay sırasında gece fiyatları, ücretler, para birimi ve toplam sunucuda hesaplanıp rezervasyonda sabitlenir.

Arama, detay sayfası, fiyat teklifi ve rezervasyon aynı kuralları kullanır. Arama sonucu anlık bir görüntüdür; son stok hakkı yalnızca sunucunun başarılı yazma işlemiyle kazanılır. Tarihli aramada filtreler sayfalama yapılmadan önce uygulanır; uygulamada sayfa sonuçlarını sonradan elemek hatalı toplamlar üretmemeli.

## 3. En küçük yeterli veri modeli

Rezervasyon tarihlerini hem rezervasyon hem genel takvim tablosunda çoğaltmayacağız. Takvim, aşağıdaki iki gerçek kaynağın birleşik görünümü olacak: `Booking` ve `VillaBlockedDate`.

| Model | Temel alanlar / sorumluluk |
| --- | --- |
| `Villa` ilaveleri | `timezone`, `salesStatus: OPEN/PAUSED`, `bookingMode: INSTANT/REQUEST`, satış sınırları, `availabilityVersion`. |
| `Booking` — yeni | `villaId`, `checkIn`, `checkOut`, kişi dağılımı, `status: HOLD/CONFIRMED/EXPIRED/CANCELLED`, `holdExpiresAt`, müşteri bağlantısı, işlem kanalı, fiyat özeti, `version`, oluşturma/iptal aktörü ve nedeni. |
| `VillaBlockedDate` — geliştirme | `kind: MANUAL/MAINTENANCE/OWNER_USE/ICAL`, `state: ACTIVE/RELEASED`, mevcut tarih ve özel not; `sourceId`, dış olay kimliği, tekrar örneği kimliği, sürüm ve işlem aktörü. |
| `IcalSource` — iCal aşamasında | Villa, sağlayıcı etiketi, şifreli URL, etkinlik durumu, son deneme/başarı, kapsama dönemi, ETag/Last-Modified, bir sonraki deneme, işçi lease bilgisi ve kaynak sürümü. |
| `IcalSyncRun` — iCal aşamasında | Kaynak, başlangıç/bitiş, sonuç, eklenen/değişen/kaldırılan kayıt sayısı, güvenli hata kodu. Ham dosyalar ve URL sırları loglanmaz. |
| `CalendarAudit` — yeni | Villa, hedef kayıt, aktör/sistem, işlem, gerekçe, önce/sonra değişimi, korelasyon kimliği. İşlemle aynı transaction içinde yazılır. |

`Booking` oluşturulmasında işlem sahibine/oturumuna bağlı benzersiz idempotency anahtarı ve istek özeti tutulur. Aynı anahtar ve aynı içerik aynı rezervasyonu döndürür; farklı içerik `409` üretir. Rezervasyon kimliğini bilmek işlem yapmaya yetmez. Ödeme entegrasyonu geldiğinde sağlayıcı olayları için ayrıca benzersiz olay kimliği tutulur.

Veritabanı kuralları: bitiş > başlangıç; kaynak türü ile `sourceId` tutarlılığı; kaynak + UID + tekrar örneği benzersizliği. Tekrarsız olayda tekrar anahtarı boş fakat **NULL olmayan** sabit değer olabilir; NULL yüzünden benzersizliğin delinmesine izin verilmez. Rezervasyon durum/geçerlilik alanları için CHECK kuralları eklenir.

Rezervasyon geçmişi bulunan villa fiziksel olarak silinmez; yayından kaldırılır/arşivlenir. `Booking` ilişkisine cascade delete konmaz. Aynı şekilde kaynak kaldırılırken dış bloklar sessizce cascade ile silinmez. Audit, yalnızca gerekli değişiklik alanlarını tutar; ödeme sırları ve gereksiz müşteri bilgileri kopyalanmaz. Yeni rezervasyon tutarları para birimiyle birlikte açıkça tanımlanmış küçük para biriminde tamsayı tutulur; mevcut fiyatların birimi doğrulanarak dönüştürülür.

Eski `VillaBlockedDate` kayıtları manuel kapatma olarak taşınır; birbirine değen veya çakışan kayıtların notları kaybolmaz. Yeni kayıtlar yalnızca ilgili aşama teslim edilirken eklenir; boş entegrasyon sınıfları ve genel amaçlı rezervasyon çatısı kurulmaz.

## 4. Çifte rezervasyonu önleme sözleşmesi

Uygulama önerisi: Her müsaitlik değişikliği kısa bir PostgreSQL transaction'ında **önce ilgili `Villa` satırını kilitler**. Var olmayan rezervasyon satırını kilitlemeye çalışmak boş takvimde koruma sağlamaz. İlgili PostgreSQL davranışı için [satır kilitleri dokümanı](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS) referans alınmıştır.

İşlem sırası:

1. Kimlik, villa yetkisi, tarih biçimi ve idempotency anahtarı doğrulanır.
2. Transaction açılır; villa satırı `SELECT ... FOR UPDATE` ile alınır.
3. Kilit alındıktan sonraki veritabanı zamanı esas alınır. Süresi dolmuş `HOLD` kayıtları `EXPIRED` yapılır. Transaction başlangıç zamanını bekleme sonrasında güncel saat sanmamak gerekir.
4. İdempotency, aktif rezervasyonlar, kapatmalar, kaynak sağlığı ve satış kuralları yeniden okunur. `READ COMMITTED` altında kontrol sorguları kilit alındıktan sonra çalışır.
5. Uygunsa bekletme/onay/kapatma yazılır; aynı işlemde audit ve `availabilityVersion` güncellenir.
6. Commit edilir. E-posta, iCal indirme ve ödeme sağlayıcısı çağrıları transaction dışında yapılır.

Misafir rezervasyonu, admin rezervasyonu, ev sahibi blokajı, iptal, tarih değişikliği, iCal sonucu uygulama ve fiyat/kural değişiklikleri aynı kapıyı kullanır. Farklı villalar birbirini beklemez. Kilit sırası villa → rezervasyon/kaynak olarak sabitlenir; zaman aşımı ve geçici veritabanı hatalarında sınırlı, idempotent tekrar yapılır.

İkinci güvence olarak `Booking` üzerinde villa + `[checkIn, checkOut)` tarih aralığı için, `HOLD/CONFIRMED` durumlarını kapsayan bir PostgreSQL exclusion constraint kullanılacak. Bunun amacı başka bir yazma yolunun yanlışlıkla iki iç rezervasyon oluşturmasını da engellemek. [PostgreSQL aralık kısıtları](https://www.postgresql.org/docs/17/rangetypes.html#RANGETYPES-CONSTRAINT) bu yerel olanağı sağlıyor; SQL migration ve `btree_gist` desteği gerekir.

Kısıta `expiresAt > now()` gibi zamanla kendiliğinden değişen koşul konmaz. Süresi dolmuş bekletmeler, yeni stok yazılmadan önce durum değiştirerek kısıttan çıkarılır. Arama sorguları da süresi dolmuş bekletmeleri aktif saymaz; temizlik işçisinin çalışması doğruluğun ön koşulu olmaz.

**Dış takvim olayları aynı kısıtın içine konmaz.** Dışarıda gerçekten oluşmuş bir çakışmayı içeri aktaramamak, sorunu gizler. Dış olay kaydedilir, tarih kapalı kalır ve çakışma görünür olur. Yeni iç rezervasyon tüm kapatma nedenlerini kontrol eder. Manuel kapatma onaylı rezervasyon veya aktif bekletmeyle çakışıyorsa işlem reddedilir; acil bakım için mevcut rezervasyonu değiştiren açık operasyon gerekir. Manuel nedenler kendi aralarında örtüşebilir; birini kaldırmak diğerini kaldırmaz.

Fiyat sezonlarında da aynı villa için aralık çakışmasını önleyen ayrı kısıt kullanılır. Önceden onaylanmış rezervasyonun fiyatı, sonradan sezon düzenlendiğinde değişmez.

## 5. Rezervasyon yaşam döngüsü

Önerilen varsayılan bekletme süresi **10 dakika**. Sayfa açılması bekletme oluşturmaz; kullanıcı rezervasyon işlemine devam ettiğinde oluşturulur. Kullanıcı/oturum ve villa bazında kötüye kullanım sınırı bulunur; yenileme veya tekrar tıklama sınırsız süre uzatmaz.

```text
Talep → görevli değerlendirmesi → taze müsaitlik kontrolü
                                       ↓
                                     HOLD → CONFIRMED → CANCELLED
                                       ↓
                                     EXPIRED
```

Talep ayrı bir iletişim kaydıdır, Booking durumlarını ve stoğu işgal etmez. İlk aşamada mevcut iletişim akışı kullanılabilir; talep yönetimi gerektiğinde kayıt ve görevli atanması eklenir. Admin, telefon üzerinden kesinleştirdiği rezervasyonu aynı kontrollerle doğrudan `CONFIRMED` oluşturabilir. İptal, rezervasyonu silmez.

- Onay, geçerli bekletme sahibini ve kaynakları tekrar doğrular. Kendi bekletmesi çakışma sayılmaz.
- Tarih değişikliği tek transaction içinde yapılır. Yeni aralık uygun değilse eski rezervasyon korunur; önce iptal edip sonra yeniden oluşturulmaz.
- İptal talebi stok açmaz; kesinleşmiş iptal stok hakkını kaldırır. Ücret iadesinin bekliyor olması ayrı mali durumdur.
- `paymentStatus` rezervasyon durumundan ayrıdır. Tarayıcıdaki “ödeme başarılı” ekranı rezervasyon onayı vermez.
- İleride ödeme eklendiğinde imzası doğrulanmış, tutar/para birimi eşleşen sunucu bildirimi işlenir. Aynı bildirim bir kez uygulanır; sağlayıcı çağrıları kendi idempotency anahtarını kullanır.
- Süresi dolmuş bekletmeye geç ödeme gelirse önce stok tekrar kontrol edilir. Stok verilmişse eski rezervasyon diriltilmez; ödeme uzlaştırma/iade sürecine alınır. Uygulama çökmesi halinde ödeme durumunu geri toplayacak iş ve kalıcı yeniden deneme kaydı, ödeme aşamasının çıkış koşuludur.
- iCal olayı aktif bekletmeyle sonradan çakışırsa onay engellenir; kullanıcıya uygun alternatif/talep akışı sunulur. Onaylı rezervasyonla çakışırsa otomatik iptal veya sessizce tarih değiştirme yapılmaz.

## 6. iCal sınırları ve güvenilir senkronizasyon

**iCal gerçek zamanlı stok kilidi değildir.** Airbnb kendi takvim güncellemelerinin otomatik olarak üç saatte bir yapıldığını belirtiyor. Bizim daha sık indirmemiz, karşı tarafın bizi daha sık okuyacağını garanti etmez. Dolayısıyla iCal ile kanallar arası sıfır çifte rezervasyon taahhüdü verilemez. [Airbnb takvim senkronizasyonu](https://www.airbnb.com/help/article/99).

Öneri: iCal bağlı villalarda başlangıç modu **onaylı talep (`REQUEST`)** olsun. Talep sırasında ödeme alınmasın ve stok sözü verilmesin. Görevli onaydan önce dış kanalı/ev sahibini doğrulasın. Bu operasyon riski azaltır; dış kanalın eşzamanlı satışını matematiksel olarak engellemez. Daha sonra anında satış zorunlu olursa kanal yöneticisi/API entegrasyonu değerlendirilir; onun da taahhütleri ayrıca doğrulanır.

**İçe aktarım akışı:**

1. Kaynak bağlantısı önce doğrulanır ve önizlenir; ilk başarılı eşitleme olmadan “sağlıklı” sayılmaz. Kendi export bağlantısını import etme ve aynı kaynağı iki kez ekleme engellenir.
2. Basit bir zamanlanmış işçi PostgreSQL üzerinden kaynağın süresi sınırlı çalışma hakkını alır. Süre aşılırsa başka işçi devam edebilir; eski işçinin sonucu sürüm/lease belirteciyle reddedilir. İlk sürümde Redis ve ayrı kuyruk ürünü gerekmez.
3. Dosya transaction dışında indirilir, tamamı ayrıştırılır ve yeni görüntü hazırlanır. Kaynak başına eşzamanlı indirme engellenir; yavaş eski sonuç hızlı yeni sonucu ezemez.
4. Villa kilidi alınır; kaynak hâlâ etkin mi, URL/sürüm değişmiş mi kontrol edilir. Görüntünün ekleme/değiştirme/kaldırma farkı tek transaction'da uygulanır; çakışmalar hesaplanır ve audit yazılır.
5. Başarısız indirme/ayrıştırma mevcut blokajları silmez. `304` mevcut görüntüyü korur. ETag ve Last-Modified yalnızca indirme optimizasyonudur.

Olay kimliği tarih değildir: kaynak + `UID` + varsa tekrar örneği kimliği kullanılır. Böylece tarih değişen olay güncellenir, iki ayrı blok oluşturmaz. Yinelenen kuralların açılımı satış ufkuyla sınırlandırılır. RFC'de olay bitişi dışlayıcıdır; `DATE`, `DATE-TIME`, saat dilimi, tekrarlar/istisnalar ve iptal bilgisi ayrıştırılır. [iCalendar standardı, RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html).

Olgun bir iCalendar ayrıştırıcısı, entegrasyon aşamasında gerçek sağlayıcı örnekleriyle seçilir; metni satırlardan elle bölerek parser yazılmaz. `RRULE`, `EXDATE`, `RDATE`, `RECURRENCE-ID`, `STATUS:CANCELLED`, `TRANSP:TRANSPARENT` için örnek testleri bulunur. Saat içeren olaylar villa saat dilimine çevrilir; sağlayıcının konaklama anlamı bilinmiyorsa saatleri kesip yanlış gece açmak yerine kayıt incelemeye alınır. Desteklenmeyen içerik sessizce atlanarak takvim başarılı sayılmaz.

**Silinme ve bozuk kaynak politikası:**

- Bir olayın kaybolması yalnızca başarılı, eksiksiz ve aynı kapsamdaki yeni görüntü üzerinden yorumlanır. Öneri: açık iptal bilgisi hemen; yalnızca kaybolma ise arka arkaya iki başarılı görüntüden sonra uygulanır.
- Beklenmedik toplu silinme/boş dosya incelemeye alınır; admin önizleyip toplu açmayı kabul eder. Kaynağın kapsama ufku dışına düşen kayıtlar topluca iptal edilmez.
- İlk varsayımlar: yaklaşık 15 dakikada bir, sağlayıcı sınırlarına uyarak ve küçük rastgele gecikmelerle eşitleme; 60 dakika başarılı kontrol yoksa sağlıksız sayma. Bunlar dış verinin gerçek güncellik garantisi değildir. Hatalarda artan bekleme ve görünür uyarı uygulanır.
- En az bir zorunlu kaynak sağlıksızsa mevcut blokajlar korunur; boş görünen tarihler “kesin müsait” sunulmaz. Satış ufku bütün gerekli kaynakların doğrulanmış kapsama aralığını aşmaz.
- iCal dosyası çoğunlukla yalnızca meşgul olayları taşır; son olay tarihi kapsama sınırı veya boş günlerin garanti belgesi değildir. Kapsama, sağlayıcının belgelenmiş davranışı/bağlantı ayarıyla tanımlanır. Bu bilgi yoksa takvimden kesin müsaitlik çıkarılmaz; talep modu korunur.
- Kaynağı duraklatmak/silmek tarihleri kendiliğinden açmaz. Kayıtları koruma veya inceleyerek serbest bırakma ayrı, gerekçeli yönetim işlemidir.
- Çakışan dış ve iç kayıtlar birlikte saklanır. Görevli, etkilenen rezervasyonları ve kaynakları görür; çözüm kayda geçer. Uyarıyı okundu yapmak fiziksel çakışmayı çözmez.

**Dışa aktarım:** Sabit UID'lerle onaylı yerel rezervasyonlar ve dışarıda da kapatılması istenen manuel tarihler yayımlanır. Kısa süreli bekletmeler ve import edilmiş olaylar başlangıçta export edilmez. Böylece döngü azaltılır; bu sistem diğer kanallar arasında genel takvim dağıtıcısı sayılmaz. Dış kanalların birbirleriyle bağlantı düzeni ayrıca doğrulanır. Sağlayıcıların manuel kapatmaları nasıl yorumladığı gerçek bağlantıyla test edilir.

Export bağlantısı villa bazlı, tahmin edilemez ve yenilenebilir token kullanır; token özeti saklanır. Bağlantı bir sırdır. Olaylarda yalnızca meşguliyet ve tarihler bulunur; misafir adı, telefon, ödeme, özel not ve import URL'si bulunmaz. Değişiklikte HTTP önbelleği geçersizleşir; dış okuyucunun kendi yenileme gecikmesi devam eder.

Import URL'leri kullanıcı girdisidir: yalnızca HTTPS, özel/yerel/metadata IP'lerine erişim yasağı, DNS ve her yönlendirmede yeniden kontrol, bağlantı anında güvenli hedef doğrulaması, yanıt boyutu/süre/tekrar açılımı sınırları gerekir. Sırlar URL loglarına ve admin dışı yanıtlara yazılmaz.

## 7. Admin ve ev sahibi deneyimi

Ana ekran: satırlarda villalar, sütunlarda günler. Aylık gezinme, villa/bölge/kaynak filtresi ve “çakışmalar / eşitleme hataları” görünümü bulunur. Önce mevcut bileşenler ve sade tablo/takvim düzeni kullanılır; sürükle-bırak ve büyük takvim kütüphanesi ilk kapsamda yoktur.

- Renk yanında metin/simgeyle ayrım: rezervasyon, bekletme, bakım, ev sahibi, dış kanal. Telefon ekranında villa seçimi ve liste görünümü sunulur.
- Tarih aralığı seçilince “Rezervasyon oluştur”, “Bakım için kapat”, “Ev sahibi kullanımı”, “Satışa kapat” işlemleri görünür. Başlangıç/bitiş alanları klavyeyle kullanılabilir.
- Bir güne tıklayınca onu kapatan **bütün nedenler**, ilgili rezervasyon, kaynak, son senkronizasyon ve yetkiye göre özel not gösterilir.
- “Müsait yap” bütün nedenleri silen düğme değildir. İlgili manuel neden kaldırılır; kalan nedenler nedeniyle kapalıysa açıklanır. Aralığın bir kısmını açmak gerekiyorsa aynı işlemde kapatma bölünür ve audit korunur.
- Onaylı rezervasyon için iptal/değişiklik akışı; iCal kaydı için kaynakta düzeltme ve yeniden eşitleme kullanılır. Import kaydı normal silme düğmesiyle açılamaz.
- Ev sahibi yalnızca kendi villasını ve izinli manuel işlemleri yönetir. Başkasının rezervasyonunu veya ödeme sonucunu değiştiremez. Admin de çakışma kontrolünü atlayarak ikinci rezervasyon oluşturamaz.
- Her düzenleme güncel `version` bekler. Başka görevli arada değiştirdiyse `409` ve yenileme mesajı gelir; ilk görevlinin değişikliği ezilmez.
- Kaynak ekranı: bağlantı önizleme, son başarı, kapsama ufku, hata, yeniden deneme, duraklatma ve token yenileme. URL sırları varsayılan olarak maskelidir.
- Denetim geçmişi: kim, ne zaman, hangi tarihleri, hangi gerekçeyle değiştirdi. Normal işlemler kayıtları fiziksel olarak silmez.

Halka açık takvimde iç nedenler görünmez. Misafir uygun giriş/çıkış seçer, geçersiz süre/giriş günü açıklamasını görür. Başka konaklamanın giriş günü uygun bir **çıkış** olabilir; bütün kapalı günleri hem giriş hem çıkış için körlemesine devre dışı bırakmak yanlıştır. Son işlemde stok değişmişse seçim korunur, anlaşılır mesaj ve alternatif tarihler sunulur.

## 8. API ve kod yerleşimi

Mevcut villa modülünde ortak müsaitlik kuralları ve transaction işlemleri oluşturulur. Controller'lar bu mantığı kopyalamaz. iCal işçisi, misafir, host ve admin aynı işlemleri kullanır. `AvailabilityCalendar`, `DateRangeField`, `CalendarManager` ve villa API tipleri genişletilir.

| Önerilen uç | Görev |
| --- | --- |
| `GET /villas/:slug/availability?from=&to=` | Sınırlı ufukta kamuya açık gece ve satış durumu; özel blok notu içermez. |
| `POST /villas/:slug/quote` | Tarih/kişi kontrolü ve sunucuda toplam; stok ayırmaz. |
| `POST /bookings/holds` | Idempotent, süreli stok ayırma; yalnızca izin verilen satış modunda. |
| `GET /bookings/:id` | Yalnızca sahibi/yetkili için işlem sonucu; zaman aşımı sonrası sonucu güvenle öğrenme. |
| Admin/host takvim uçları | Mevcut blocked-date yolları korunabilir; tür, sürüm ve audit eklenerek ortak servise yönlendirilir. |
| Admin rezervasyon uçları | Oluşturma, tarih değiştirme, iptal; ayrı yetki ve geçiş kontrolleri. |
| Admin iCal kaynak uçları | Önizleme, bağlama, sağlık, yeniden eşitleme, kontrollü kaldırma. |
| `GET /calendar/:token.ics` | Yalnızca izinli meşguliyet export'u. |

Yanıtlar ayrıştırılabilir neden taşır: `DATES_UNAVAILABLE`, `MIN_STAY`, `CHECKIN_DAY`, `CAPACITY_EXCEEDED`, `HOLD_EXPIRED`, `SYNC_UNHEALTHY`, `VERSION_CONFLICT`, `SALES_PAUSED`. Bekletme ve son rezervasyon doğrulaması önbellekten yapılmaz. Takvim/arama önbelleği kullanılırsa yazma sonrası geçersizleştirilir; istemcideki eski veri stok garantisi sayılmaz.

## 9. Uygulama sırası ve bitiş koşulları

| Sıra | Teslim | Tamamlandı sayılma koşulu |
| --- | --- | --- |
| 1 — Temel doğruluk | Tarih sözleşmesi, güvenli public yanıt, ortak kurallar, migration ve blok türleri. | Arama ve detay aynı sonucu verir; iç notlar dışarı çıkmaz; mevcut veriler kayıpsız taşınır. |
| 2 — Rezervasyon çekirdeği | Booking, kilitler, exclusion constraint, idempotency, bekletme/onay/iptal/değişiklik. | Gerçek PostgreSQL üzerinde eşzamanlı çakışma testleri geçer. Ödeme bağlanmadan da admin rezervasyonu güvenlidir. |
| 3 — Yönetim ve misafir takvimi | Kaynaklı yönetim takvimi, audit, yetkiler, uygun tarih seçimi, sürüm çakışmaları. | İki görevli aynı anda çalışabilir; kullanıcı bir blokajı kaldırınca diğer nedenler korunur. |
| 4 — iCal | Kaynak, işçi, güvenli parser, import/export, hata/çakışma yönetimi. | Gerçek sağlayıcı örnekleri ve gecikme/hata senaryoları doğrulanır; talep modu ile sınırlı villa pilotu yapılır. |
| 5 — Online ödeme, ihtiyaç olduğunda | Sağlayıcı, webhook, geç ödeme ve iade uzlaştırması. | Tekrarlı/geç bildirim para veya stok kaybı oluşturmaz. Bu aşama anında online satışın ön koşuludur. |

İlk dört aşama talep ve admin onaylı rezervasyonla çalışabilir. Ödeme sağlayıcısı, SMS sistemi, channel manager, Redis, mikroservis ve dinamik fiyatlandırma bu planın ilk teslimine eklenmez.

Migration öncesinde veritabanı yedeği, tarih/saat dilimi dağılımı ve mevcut çakışmalar incelenir. `DateTime → DATE` dönüşümü varsayımsal UTC kesmesiyle yapılmaz; kayıtların gerçek tarih anlamı örneklenir. Migration baseline ve özel SQL kısıtları staging üzerinde denenir. Mevcut seed veri silen işlemler içerdiğinden gerçek rezervasyon verisinde kullanılmaz. Geçişte eski yazma uçları aynı servise yönlendirilir; iki ayrı stok sistemine kalıcı çift yazma yapılmaz. Yeni rezervasyonlar açıldıktan sonra geri dönüş, yeni kayıtları silmek yerine satış akışını durdurup veri koruyan düzeltme ile yapılır.

## 10. Zorunlu kabul senaryoları

Testler yalnızca mock ile değil, ayrı bağlantılar ve gerçek PostgreSQL transaction'larıyla çalışır. Eşzamanlılık bariyeri kullanılarak isteklerin gerçekten yarışması sağlanır.

| Senaryo | Beklenen sonuç |
| --- | --- |
| Aynı villaya aynı geceler için 50 farklı eşzamanlı bekletme | Tam bir aktif bekletme; diğerleri tutarlı stok hatası. |
| Aynı idempotency anahtarıyla tekrarlı istek / yanıt kaybı | Bir rezervasyon; tekrar aynı sonucu döndürür. Farklı içerik reddedilir. |
| Aynı tarihler, farklı villalar | İkisi de başarılı. |
| 10–15 ve 15–20 tarihleri | İkisi de başarılı; 14–18 çakışır. |
| Admin kapatması ve misafir bekletmesi aynı anda | Yalnızca önce hak kazanan işlem başarılı. |
| Bekletme kilit sırasında sona eriyor; temizlik işçisi durmuş | Süre yeniden değerlendirilir; stok sonsuza kadar kapalı kalmaz. |
| İptal ile yeni rezervasyon; iki eşzamanlı tarih değişikliği | Eski hak yanlışlıkla kaybolmaz; çift satış ve kayıp güncelleme oluşmaz. |
| Geç ödeme ve tekrarlı/sırasız webhook | Çakışan rezervasyon diriltilmez; tek mali olay, görünür uzlaştırma. |
| iCal indirme hatası, hatalı olay, boş veya kısmi dosya | Önceki kapalı günler sessizce açılmaz. |
| Eski işçi yeni görüntüden sonra bitiyor / kaynak URL'si değişiyor | Eski sonuç uygulanmaz. |
| Aynı UID başka tarihe taşınıyor, tekrar istisnası geliyor | Doğru olay güncellenir; hayalet eski blok kalmaz. |
| Dış olay onaylı rezervasyonla çakışıyor | İkisi saklanır, satış engellenir ve admin çakışmayı görür. |
| Aynı günü kapatan iki nedenin biri kaldırılıyor | Gün kapalı kalır. |
| İki görevli aynı kaydı düzenliyor | Eski sürümlü istek reddedilir. |
| Sezon sınırı, artık gün, farklı sunucu saat dilimi | Gece sayısı, ücret ve giriş/çıkış sınırları değişmez. |
| Başkasının villası, public detay, export ve kötü amaçlı URL | Yetkisiz yazma, iç bilgi sızıntısı ve iç ağ erişimi engellenir. |

Canlı takip: son başarılı senkronizasyon yaşı, çakışan rezervasyon sayısı, geç ödeme olayları, bekletme dönüşümü ve transaction bekleme/hata oranı. Her ölçümün admin ekranında müdahale edilebilir bir karşılığı olmalı.

Raporlama: satılmış gece, geçici ayrılmış gece, manuel kapalı gece ve dış kaynaktan kapalı gece ayrı gösterilir. Doluluk oranında kullanılan dönem/payda açık yazılır; iCal'deki her meşgul gece satılmış gece veya gelir kabul edilmez.

### Aşama 2 gerçekleşen teslim

- `Booking` yaşam döngüsü `HOLD`, `CONFIRMED`, `EXPIRED` ve `CANCELLED` durumlarıyla eklendi. Bekletme süresi 10 dakikadır; süresi dolan kayıtlar yeni stok yazımı sırasında veritabanı saatine göre serbest bırakılır.
- Misafir bekletme oluşturma/okuma/bırakma ve admin oluşturma/onay/değişiklik/iptal/listeleme uçları eklendi. Yazma isteklerinde idempotency anahtarı ve güncellemelerde sürüm kontrolü uygulanır.
- Rezervasyon, manuel kapatma ve fiyat kuralı yazımları önce ilgili villa satırını kilitler. Aktif iç rezervasyonların çakışması PostgreSQL `EXCLUDE` kısıtıyla ikinci kez güvenceye alınır.
- Halka açık liste, detay takvimi ve müsaitlik kontrolü geçerli bekletmeleri ve onaylı rezervasyonları hesaba katar; müşteri ve iç rezervasyon bilgileri public yanıta girmez.
- Migration tekrar çalıştırılabilir biçimde izole PostgreSQL üzerinde doğrulandı ve geliştirme veritabanına yedek alınarak uygulandı. 50 eşzamanlı bekletme, idempotent tekrar, bitiş/giriş sınırı, rezervasyon–manuel blok yarışı, süresi dolmuş bekletme ve veritabanı kısıtı testleri geçti.

### Aşama 3 gerçekleşen teslim

- Admin paneline villa × gün doluluk şeridi, bölge/villa filtresi, ay gezintisi ve kaynak renkleri olan rezervasyon takvimi eklendi. Boş hücreden onaylı rezervasyon veya manuel kapatma başlatılabilir; dolu hücreden rezervasyon değiştirme/onaylama/iptal ya da ilgili blok nedenini kaldırma yapılabilir.
- Host takvim API'si yalnızca kendi villalarını döndürür ve müşteri iletişim bilgilerini maskeler. Villa düzenleme ekranındaki takvim önündeki 62 gün için rezervasyon ve manuel kapatmaları birlikte gösterir.
- Misafir takvimi giriş/çıkış aralığı ve kişi dağılımı seçtirir, dolu gecelerin üzerinden geçilmesini engeller ve seçimi ortak public müsaitlik ucunda yeniden doğrular. Başka konaklamanın giriş günü çıkış olarak seçilebilir.
- Rezervasyon, bekletme, manuel kapatma, fiyat kuralı, satış kuralı ve villa durum değişiklikleri aynı transaction içinde aktör, gerekçe ve sınırlı önce/sonra verisiyle `CalendarAudit` kaydına yazılır.
- Takvim blokları ve rezervasyon düzenlemeleri güncel `version` bekler. İki görevlinin eşzamanlı değişikliğinde ilk işlem kazanır; eski sürüm `409` alır ve arayüz güncel takvimi yeniden yükler.
- Migration iki kez uygulanarak tekrar güvenliği doğrulandı; gerçek PostgreSQL yarış/audit/takvim testleri, backend ve frontend üretim derlemeleri ve tarayıcı üzerinden admin/misafir akışları geçti.

## 11. Başlangıç için önerilen ürün kararları

1. Tek villa = tek stok birimi; aynı gün çıkış/giriş serbest.
2. iCal bağlı villalar talep/onay modunda; sağlıksız kaynaklarda kesin müsaitlik sözü yok.
3. Bekletme 10 dakika; ilk eşitleme hedefi 15 dakika; sağlıksızlık eşiği 60 dakika. Sağlayıcı kısıtları ve pilot verisiyle ayarlanır.
4. Minimum gece giriş sezonuna göre; kişi sınırları mevcut modeldeki ayrı alanlarla kontrol edilir.
5. Başlangıç ufku 12 ay ve en az bir gün önceden rezervasyon; dış kaynak kapsaması daha darsa o sınır geçerlidir.
6. Önce stok doğruluğu ve admin işlemleri, sonra iCal, ardından online ödeme. Bu değerler öneridir; uygulamadan önce kesin ürün kuralları olarak kayda geçirilir.
