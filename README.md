# KÜLHAT · Son Teslimat

Three.js ile yazılmış, tarayıcıda çalışan bir raylı koşu oyunu. İki harita (Western Kasabası, Dağ Patikası), 40 etap, yol ayrımları, silah deposu, günlük ödüller ve kostümler içerir. Sunucu, giriş ya da dış servis gerektirmez.

## Çalıştırma

Kayıtların kalıcı olması için klasörü bir statik sunucuyla açın:

```bash
python3 -m http.server 8080
# tarayıcıda http://localhost:8080
```

`index.html` dosyasını doğrudan açmak da çalışır, ancak bazı tarayıcılar yerel dosyada kaydı engeller.

## Klasör yapısı

- `index.html`, `js/`, `assets/`: derlenmiş, oynanabilir sürüm.
- `js/platform.js`: kayıt ve platform katmanı. YouTube içinde Playables SDK'yı, dışarıda localStorage'ı kullanır.
- `source/dist/`: düzenlenebilir kaynak (`game.js`, `core.js`, `profile.js`, `audio.js`, `platform.js`, `kulhat.html`, `vendor/` içinde Three.js).
- `source/scripts/export-kulhat.mjs`: bağımlılığı olmayan paketleme betiği.
- `source/tests/`: Node.js testleri.

## Derleme

Node.js 18 veya üstü yeterlidir; npm paketi indirilmez.

```bash
cd source
npm test                                              # testler
node scripts/export-kulhat.mjs ../rebuilt              # web sürümü (kaynak kopyalarıyla)
node scripts/export-kulhat.mjs ../playables --playables # YouTube Playables paketi
```

Web sürümünü güncellemek için `rebuilt/` içindeki `index.html`, `js/` ve `assets/` dosyalarını kök klasöre kopyalayın.

`--playables` seçeneği YouTube Playables SDK'sını (`https://www.youtube.com/game_api/v1`) oyun kodundan önce yükler ve yalnızca oynanabilir dosyaları çıkarır. Bu klasörü zip'leyip (`index.html` zip'in kökünde olacak şekilde) Playables geliştirici portalına yükleyin.

## YouTube Playables entegrasyonu

- Yükleme ekranı görünürken `firstFrameReady()`, ana menü tıklanabilir olunca `gameReady()` çağrılır.
- Kayıt YouTube içinde yalnızca `ytgame.game.loadData()` / `saveData()` ile yapılır; `loadData` bitmeden kayıt gönderilmez. YouTube dışında localStorage kullanılır.
- `onPause` / `onResume` oyun döngüsünü, sesi ve çizimi durdurur ve yeniden başlatır. YouTube içinde Page Visibility API kullanılmaz.
- Ses, `isAudioEnabled()` ve `onAudioEnabledChange()` ile YouTube ses ayarına uyar. Oyun içi SES düğmesi YouTube'da gizlenir.
- En iyi puan `sendScore()` ile gönderilir ve kayıttaki en iyi puanla aynıdır.
- Titreşim YouTube içinde kapalıdır, çünkü Playables kuralları titreşim için ayrı bir aç/kapa düğmesi ister.
- Reklamlar kapalıdır: `showRewardedAd()` yalnızca bir test fonksiyonudur ve `REWARDED_ADS_ENABLED = false`.

## Kontroller

Telefonda sağa/sola kaydırarak şerit değiştirilir, yukarı kaydırarak zıplanır, aşağı kaydırarak kayılır; hedefe dokunarak ateş edilir. Klavyede oklar/WASD, ateş için Space, duraklatmak ve panelleri kapatmak için Esc kullanılır.

## Lisans notu

Three.js MIT lisanslıdır (`assets/THREE-LICENSE.txt`). Oyun kodu, müzik ve sesler bu projeye aittir.
