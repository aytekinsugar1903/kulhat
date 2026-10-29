# KÜLHAT · Son Teslimat — bağımsız yayın adayı

## Başlatma

ZIP'i tamamen çıkarın ve **index.html** dosyasını güncel Chrome, Edge, Firefox veya Safari ile açın. WebGL 2 ve JavaScript gerekir. Giriş, ağ bağlantısı, API anahtarı, Node.js veya kurulum gerekmez. Ses ilk kullanıcı hareketinden sonra açılır; menüde SES düğmesiyle kapatılır. iPhone'da Dosyalar önizlemesi bir oyun tarayıcısı değildir; dosyaları statik bir web adresine yükleyip Safari'de açın.

Tarayıcı yerel dosyalarda kayıt erişimini engellerse oyun oturum belleğinde devam eder ve bildirim gösterir. Kalıcı kayıt için klasörü herhangi bir statik barındırıcıya yükleyin veya bilgisayarda Python zaten varsa bu klasörde `python -m http.server 8080` çalıştırıp `http://localhost:8080` açın. Bu yalnızca isteğe bağlı yerel dosya sunumudur; uygulama arka uç kullanmaz.

## Dosyalar

- `index.html`: yalnızca KÜLHAT; giriş ekranı, dış bağlantı, mağaza veya barındırma menüsü içermez.
- `js/kulhat.bundle.js`: Three.js dahil bütün oyun kodu, klasik betik halinde; CDN ve modül indirme gerektirmez.
- `assets/icon.svg`: vektör oyun simgesi.
- `assets/THREE-LICENSE.txt`: Three.js MIT lisansı.
- `source/dist/`: düzenlenebilir oyun, simülasyon, kayıt, ses ve yerel kütüphane kaynakları.
- `source/scripts/export-kulhat.mjs`: Node.js ile çalışan, bağımlılık gerektirmeyen yeniden paketleme betiği.
- `BUILD-INFO.json`: dosya boyutları ve ilk yükleme toplamı. Kaynak kopyaları oyun açılırken yüklenmez.

Kayıt anahtarı `kulhat-save-v2`; eski altın, elmas, silah ve rekor kayıtları korunur. Kaynak sürümden aynı web origin altında açılırsa eski kayıtları kullanır. Farklı origin veya cihaz kayıtları kendiliğinden taşınmaz.

## Kontroller ve yeni özellikler

Telefonda sağ/sol kaydır: şerit değiştir; yukarı kaydır: zıpla; aşağı kaydır: kay; hedefe dokun veya basılı tut: ateş. Klavyede oklar/WASD, Space ve Esc. İlk teslimata girerken metinsiz üç adımlı öğretici gösterilir. Öğreticide klavye de kullanılabilir; ✕ ile atlanabilir.

Harita menüde hemen güncellenir. Western rotaları: Maden Ocağı / Ana Cadde / Çatılar. Dağ rotaları: Mağara / Patika / Sırt Yolu. Etap grubu başlıkları haritaya göre, kargo etiketleri nötrdür. Koşu hareketleri, silah değerleri ve bölüm dengesi değiştirilmedi.

Her haritada özgün, oyun koduyla üretilen kısa müzik döngüsü ve hareket/toplama/ateş/darbe sesleri bulunur. Hazır müzik kaydı veya harici ses hizmeti yoktur. Darbe titreşimi yalnızca `navigator.vibrate` destekleyen tarayıcılarda çalışır; iPhone Safari'de destek bulunmayabilir. Altın/elmas parlamaları, kısa darbe sarsıntısı, en fazla 3 derece hız FOV etkisi ve kenarlarda rüzgâr çizgileri vardır. Azaltılmış hareket tercihi rüzgâr çizgilerini ve rekor animasyonunu kapatır.

GÜNLÜK ÖDÜLLER: 7 gün boyunca 50/75/100/125/150/200/300 altın, günde bir kez elle alınır. Seri kesilirse 1. güne döner; 7. günden sonra döngü yeniden başlar. Üç görev her yerel takvim gününde yenilenir: 500 m koş, 20 elmas topla, 50 altın topla. İlerleme koşu sonuç ekranında kaydedilir; görevin ödülü bir kez alınır. Mevcut günlük kontrat bonusu korunmuştur. Sunucusuz prototip yerel saate güvenir; saat değiştirmeye karşı sunucu doğrulaması yoktur.

KOSTÜMLER: 6 görsel seçenek; altınla açılır, güç/hız/hasar kazandırmaz. Sonuçta büyük yeniden dene düğmesi, en iyi puan ve yeni rekor kutlaması bulunur. Sekme gizlenince koşu ve ses durur; dönüşte oyun duraklatılmış kalır, devam için oyuncunun dokunması gerekir.

## Platform bağlama noktaları

`source/dist/profile.js` içindeki `saveGame()` / `loadGame()` tek kayıt katmanıdır. Mevcut adaptör localStorage kullanır. YouTube Playables SDK'ya geçerken bu katmanı platform kaydıyla değiştirin; asenkron yüklemeyi oyunun ilk başlatılmasından önce tamamlayın.

`showRewardedAd()` tek reklam giriş noktasıdır; şu anda hemen `{success: true, mock: true}` dönen çevrimdışı test fonksiyonudur. `REWARDED_ADS_ENABLED = false`; iki sonuç ekranı yerleşimi de devre dışıdır ve ödül dağıtmaz. Gerçek reklam SDK'sı, izleme veya ağ çağrısı yoktur. Gerçek entegrasyonda devam/iki kat ödül işlemelerini yalnızca doğrulanmış tamamlama sonucuna bağlayın ve aynı koşuda ikinci ödeme yapılmasını engelleyin. Yalnızca bayrağı açmak gerçek reklam entegrasyonu sağlamaz.

## Görüntü ve performans

EKONOMİK modda gölgeler kapalıdır, pixelRatio 0,7, kamera uzak sınırı 105, uzak dekor ve parçacık sayıları azaltılmıştır; tekrarlanan dekorlar InstancedMesh ile gruplanır. Dokular ve modeller kodla üretilen sade geometrilerdir; harici doku/model indirmesi yoktur. Arayüz 360 px ve üzeri genişlik ile dikey/yatay ekran kurallarını içerir; bütün düğmeler en az 44 × 44 CSS piksel hedef alanına sahiptir.

Oyun döngüsünde GPU piksel okuması veya ekran görüntüsü çıkarma işlemi yoktur. Three.js kullanılmayan genel okuma API'lerini kütüphane içinde tanımlar. `window.KULHAT_RENDER_AUDIT`, oyun tuvaline gerçekten yapılan readPixels/toDataURL/toBlob çağrılarının sayısını ve en fazla dört çağrı izini yerel bellekte tutar; kendisi okuma yapmaz. Aynı uyarı barındırılan sürümde görülürse bağımsız pakette ve izlerde karşılaştırılmalıdır. Canlı çağrı izi olmadan barındırıcı kaynaklı olduğu kesin söylenemez.

## Doğrulama ve yayın durumu

Bu bir bağımsız HTML5 sürümüdür. Android AAB, `android/` Capacitor projesinden ve `RELEASE-CHECKLIST.md` adımlarından üretilir; imza ortam değişkenlerindedir ve mağazaya yükleme bu paketin parçası değildir. Gerçek telefon üzerinde kare hızı ölçümü ayrıca yapılmalıdır. Otomatik simülasyon/DOM/sahne bağlantısı testleri gerçek GPU görüntüsü, ses kalitesi, dokunmatik donanım veya 30 FPS garantisi değildir. Çalışma ortamındaki yönetilen görsel önizleme `bwrap: Can't mount proc` hatasıyla engellendi; gerçek cihazda son görsel/işitsel ve performans kontrolü gereklidir.

Yayın öncesi kontrol: 360 × 800 dikey, 800 × 360 yatay, 1280 × 800; iki harita; üç öğretici hareketi; tekrar girişte öğreticinin atlanması; ses aç/kapat; sekme değiştirip dönme; Esc; ölüm ve yeniden deneme; kayıt sonrası yeniden yükleme; günlük ödül/görev ve kostüm; ağ kapalı başlatma. Hedef orta seviye telefonda en az 30 FPS'tir, ölçülmüş sonuç değildir.

Kaynağı yeniden paketlemek için `source/` altında `node scripts/export-kulhat.mjs ../rebuilt` çalıştırın. Çıkan klasörü ZIP'leyin veya statik sunucuya yükleyin. Hiçbir npm paketi indirilmez.
