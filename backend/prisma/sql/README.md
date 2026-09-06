# Elle uygulanan veri migration'ları

Bu projede henüz Prisma Migrate geçmişi yok; mevcut veritabanı `prisma db push` ile oluşturulmuş. Bu nedenle buradaki SQL dosyaları `prisma migrate deploy` tarafından otomatik çalıştırılmaz.

`20260906_availability_foundation.sql` mevcut veriyi korur, ancak şu iki durumda hiçbir değişiklik yapmadan transaction'ı durdurur:

- tarih alanlarında gece yarısından farklı saat bulunması;
- aynı villada çakışan sezon fiyatı kuralları bulunması.

Önce veritabanı yedeği alınmalı ve hedef ortamda yukarıdaki kontroller çalıştırılmalıdır. Ardından backend dizininden şu komut uygulanabilir:

```sh
npx prisma db execute --file prisma/sql/20260906_availability_foundation.sql --schema prisma/schema.prisma
```

SQL tekrar çalıştırılabilir yapıdadır. `btree_gist` eklentisini açma yetkisi yoksa işlem atomik olarak geri alınır; veritabanı yöneticisi eklentiyi açtıktan sonra yeniden çalıştırılır.

`20260906_booking_core.sql`, Aşama 1'den sonra rezervasyon tablosunu ve aktif `HOLD`/`CONFIRMED` aralıklarının aynı villada çakışmasını engelleyen veritabanı kısıtını ekler:

```sh
npx prisma db execute --file prisma/sql/20260906_booking_core.sql --schema prisma/schema.prisma
```

Kalıcı Prisma Migrate geçmişine geçerken önce mevcut şema için baseline oluşturulup bu migration uygulanmış olarak işaretlenmelidir. Canlı veritabanı resetlenmez ve veri silen seed komutu kullanılmaz.
