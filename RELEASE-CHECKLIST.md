# KÜLHAT: Son Teslimat — yayın kontrol listesi

Bu liste mağazaya yüklemeden önce işaretlenir. Bu depo hiçbir mağazaya yükleme yapmaz.

## Oyun

- [x] 40 etap, iki harita (Western Kasabası, Dağ Patikası), etap başına 3 yıldız (120).
- [x] Kampanya bitince sonsuz koşu menüde açılır.
- [x] Varil, maden vagonu, at arabası, takipçi ve yol ayrımı duruyor.
- [x] Senaryo karşılaşmaları yol ayrımında silinmiyor; koridorun ardına kayıyor.
- [x] Şerit çarpışması seçilen şeride bakar. Gövde şeritler arasındayken isabet kaybolmaz.
- [x] Zıplama aynı şeritteki altını kaçırmaz.
- [x] Temiz bir koşu geç etaplarda takipçiye yakalanmadan biter. Patron yıldızı dövüşmeden bedava değildir.
- [x] Klavye: oklar, WASD (büyük harf ve `KeyboardEvent.code`), Space, Esc.
- [x] Dokunma: kaydırma şerit / zıplama / kayma; kısa dokunuş ateş; ikinci parmak basılı ateş edebilir.
- [x] Kayıt `kulhat-save-v2`. Bozuk kayıt oyunu düşürmez. Reklam bayrağı kapalı.
- [x] Türkçe ve İngilizce. YouTube içinde dil YouTube’dan gelir; dışında menüden seçilir.
- [x] `npm test` (kampanya, kayıt, ses, harita) geçiyor.

## YouTube Playables

- [x] `firstFrameReady` yükleme ekranındayken, `gameReady` menü tıklanınca.
- [x] Kayıt yalnızca `loadData` / `saveData`. `loadData` bitmeden kayıt gönderilmez.
- [x] `loadData` 4 saniyede dönmezse oyun açılır ve geç gelen bulut kaydı oturumun üstüne yazılmaz.
- [x] Duraklatma / devam YouTube `onPause` / `onResume`. Playables paketinde Page Visibility kullanılmaz.
- [x] Ses `isAudioEnabled` ile uyumludur. Oyun içi ses düğmesi YouTube’da gizlidir.
- [x] En iyi puan `sendScore` ile gider.
- [x] Titreşim YouTube içinde kapalıdır.
- [x] `--playables` derlemesi `navigator.language` okumaz.
- [ ] Playables portalına zip yüklenmedi (bilerek).

Paket:

```bash
cd source && node scripts/export-kulhat.mjs ../playables --playables
```

Zip kökünde `index.html` olur. `playables/` depoya girmez.

## Android (Google Play)

- [x] Capacitor projesi `android/`, uygulama kimliği `com.kulhat.delivery`.
- [x] `compileSdk` / `targetSdk` 36 (`android/variables.gradle`).
- [x] Sürüm `versionName` 1.0.0, `versionCode` 1.
- [x] İmzalı AAB yalnızca şu değişkenlerle: `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- [x] Anahtar dosyası ve şifre depoya yazılmaz (`.gitignore`).
- [x] Reklam ve ödeme yok.
- [ ] Play Console’a yüklenmedi (bilerek).

```bash
export ANDROID_HOME="$HOME/android-sdk"   # yoksa SDK 36 kurulu bir yol
export ANDROID_KEYSTORE_PATH=/secure/kulhat-release.jks
export ANDROID_KEYSTORE_PASSWORD=...
export ANDROID_KEY_ALIAS=...
export ANDROID_KEY_PASSWORD=...
npm run build:aab
```

Çıktı: `android/app/build/outputs/bundle/release/app-release.aab`

GitHub Actions (`.github/workflows/android-aab.yml`) testten sonra, `ANDROID_KEYSTORE_BASE64` ve şifre sırları varsa imzalı AAB üretir ve onu iş eserine koyar. Play’e göndermez. Sırlar yoksa imza adımı atlanır.

## Mağaza seti

- [x] `store/listing-tr.md` ve `store/listing-en.md`
- [x] `store/icon-512.png`
- [x] `store/feature-graphic-1024x500.png`
- [x] `store/screenshots/` telefon görüntüleri
- [x] `store/privacy-policy-tr.md` ve `store/privacy-policy-en.md`
- [x] `store/data-safety.md`
- [x] `store/content-rating.md`
- [ ] Gizlilik politikasını herkese açık bir adreste yayınla (Console URL ister). Bu dosyalar taslaktır.
- [ ] IARC anketini Console’da tek tek onayla. `content-rating.md` bir sertifika değildir.
- [ ] Ekran görüntülerinin son hâlini gerçek telefonda da çek.

## Cihaz kontrolü (yayından önce elle)

Otomatik testler GPU, hoparlör ve dokunmatik donanım ölçmez. Orta seviye bir telefonda şunları işaretle:

- [ ] 360×800 dikey ve yatayda menü, HUD ve düğmeler güvenli alanda okunuyor (en az 44 px).
- [ ] İlk etap: öğretici, kaydırma, zıplama, ateş, yol ayrımı, teslimat, kayıt.
- [ ] Dağ Patikası ayrı görünüyor; mağara rotası metro tabelası değil.
- [ ] Ölüm, yeniden dene, üsse dön, ses aç/kapa, Esc.
- [ ] Uygulama arka plana gidince duruyor; dönüşte duraklatılmış kalıyor.
- [ ] 60 FPS hedefi. Düşerse görüntü kendiliğinden ekonomik moda iner (`quality: auto`).
- [ ] Uçak modunda açılış ve kayıt.
- [ ] Android geri tuşu koşudayken duraklatır, duraklatılmışken üsse döner.

## Bilinen sınır

Başsız tarayıcıdaki yazılım GPU’su telefon hızı değildir. 60 FPS hedefi telefonda ekonomik görüntü ön ayarı ve FPS 55’in altına inince otomatik düşürme ile korunur; bu depoda fiziksel telefon ölçümü yoktur.
