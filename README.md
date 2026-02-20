# TEKNOFEST Roket Yarışması Yer İstasyonu Dashboard

Bu proje, bir model roket veya görev yükü için **TEKNOFEST 2025** roket yarışması standartlarına uygun olarak tasarlanmış olan **Çift Port Arayüzlü (Dual Port Interface) Yer İstasyonu (Ground Station)** yazılımıdır.

Sistem iki ana bileşenden oluşmaktadır:
1. **Veri Toplayıcı ve İletici Sunucu (Python Backend)**
2. **Kullanıcı Arayüzü / Dashboard (React Frontend)**

---

## 🚀 Projenin Amacı ve Özellikleri

- **Sensör Verilerini İzleme:** Roketten gelen irtifa, paraşüt durumu (P1, P2), jiroskop (X, Y, Z), ivme (X, Y, Z), açı (pitch) ve GPS konum verilerini gerçek zamanlı takip eder.
- **Görev Yükü (Payload) İzleme:** Görev yüküne ait özel GPS ve sıvı seviye verilerini işler, roket GPS'i ile karşılaştırmalar yapar.
- **Canlı Harita (Google Maps):** GPS koordinatlarını anlık olarak harita üzerinde görselleştirir.
- **HYİ (Hakem Yer İstasyonu) Haberleşmesi:** TEKNOFEST yarışma kurallarına uygun formatta (`0xFF 0xFF 0x54 0x52` header vb. içeren 78 bytelık paket yapısı) hakem masasına otomatik ve manuel paket gönderimi yapar.
- **Log ve Dışarı Aktarma:** Gelen ham verileri, hata ayıklama bilgilerini kaydeder ve geçmiş telemetri verilerini `.json` formatında dışarı aktarmaya olanak sağlar.
- **Çoklu Seri Port Desteği (COM):** Roket (LoRa modülü), Payload GPS ve HYİ haberleşmesi için 3 farklı fiziksel seri porta aynı anda bağlanabilir.

---

## 🛠️ Kullanılan Teknolojiler

- **Backend:** Python (Flask, PySerial, struct, re)
- **Frontend:** React (Tailwind CSS, Lucide React, Three.js, Google Maps API)
- **Haberleşme Formatı:** UART Seri Haberleşme & HTTP/REST API

---

## ⚙️ Kurulum ve Çalıştırma

Projeyi çalıştırmak için sisteminizde Node.js (v18+) ve Python (3.8+) kurulu olduğundan emin olun.

### Kolay Başlatma (Windows)
Proje kök dizinindeki başlatıcı dosyasına çift tıklayarak sistemi hızlıca ayağa kaldırabilirsiniz:

```bash
# Proje ana dizininde:
start_project.bat
```
*(Bu dosya otomatik olarak hem Python sunucusunu hem de React uygulamasını ayrı pencerelerde başlatacaktır).*

---

### Manuel Başlatma

#### 1. Backend (Python Sunucusu)
Öncelikle gerekli kütüphanelerin kurulu olduğundan emin olun:
```bash
pip install flask flask-cors pyserial pyfiglet
```
Sunucuyu başlatmak için:
```bash
cd backend
python main_system.py
```
*(Sunucu http://localhost:8000 adresinde ayağa kalkacaktır).*

#### 2. Frontend (React Dashboard)
Bağımlılıkları yükleyin:
```bash
# Proje kök dizinine geri dönün
npm install
```

**Google Haritalar API Ayarı:**
Harita üzerinden konum takibi yapabilmek için Google Maps API anahtarına ihtiyacınız vardır:
1. Proje kök dizininde bulunan `.env.example` dosyasının adını (veya kopyasını oluşturarak adını) `.env` yapın. Eğer Node versiyonunuz yüzünden az önce oluşturulmuş `.env` dosyanız varsa o dosyanın içerisine ekleme yapın.
2. İçerisindeki `REACT_APP_GOOGLE_MAPS_API_KEY` değerine kendi API anahtarınızı yapıştırın. (Bu dosya Github'a gönderilmez)

React uygulamasını başlatmak için:
```bash
npm start
```
*(Dashboard http://localhost:3000 adresinden erişilebilir olacaktır).*

---

## 🔌 Sistemin Kullanımı

1. Dashboard ekranında **Portları Yenile** butonuna tıklayarak bilgisayarınıza bağlı cihazların (LoRa, Sensör vb.) görünmesini sağlayın.
2. Ayarlar kısmından:
   - **LoRa Port:** Ana roket verisini alacağınız port.
   - **Payload GPS Port:** Görev yükünden veri alacağınız port.
   - **HYİ Port:** Hakem masasına veri iletmek için atanacak port.
3. Kontrol panelinden **Bağlan** tuşuna basarak portları dinlemeye başlayabilirsiniz.
4. Alt kısımdaki telemetri bölümünde ve bağlantı durumu kartlarında gelen veriler anlık görünmeye ve kaydedilmeye başlayacaktır.

---

> **Not:** Projede IPv6/IPv4 çözünürlük farklarından kaynaklı "react-scripts start" takılmalarını önlemek amacıyla kök dizinde `.env` (PORT=3000, HOST=127.0.0.1) kullanılmaktadır.

