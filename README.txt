SUARA KAMPUS – VERSI UTS MACHINE LEARNING (MODERN UI V5)
==========================================

Judul proyek:
Klasifikasi Otomatis Kategori Pengaduan Fasilitas Kampus Menggunakan
Multinomial Naive Bayes Berbasis TF-IDF.

METODE AI/ML YANG DIGUNAKAN
- Algoritma: Multinomial Naive Bayes.
- Representasi teks: TF-IDF (unigram dan bigram).
- Target prediksi: kategori fasilitas (8 kelas).
- Evaluasi: accuracy, macro precision, macro recall, macro F1-score,
  dan confusion matrix.
- Pembagian data: 75% data latih dan 25% data uji, stratified,
  random_state=42.
- Evaluasi menggunakan data uji. Model prediksi aplikasi kemudian
  dilatih ulang menggunakan seluruh dataset.

CARA MENJALANKAN
1. Instal Python 3.10 atau lebih baru.
2. Ekstrak ZIP ini.
3. Buka Terminal/Command Prompt di folder suara-kampus-uts.
4. (Opsional) Buat virtual environment:
   python -m venv .venv
   Windows: .venv\\Scripts\\activate
   macOS/Linux: source .venv/bin/activate
5. Instal dependensi:
   pip install -r requirements.txt
6. Jalankan:
   python server.py
7. Buka browser: http://127.0.0.1:5000
8. Jika tampilan lama masih tersimpan, tekan Ctrl + F5 untuk hard refresh.

PEMBARUAN TAMPILAN
- Antarmuka diperbarui dengan tema terang hijau-teal dan layout responsif.
- Halaman mahasiswa menampilkan ringkasan total laporan, status diproses,
  selesai, dan menunggu.
- Kartu laporan mahasiswa menampilkan prediksi kategori Naive Bayes dan
  persentase keyakinan jika API berhasil memberikan hasil.
- Preferensi dark mode perangkat tidak lagi otomatis mengubah warna aplikasi.

DEMO SAAT PRESENTASI
1. Masuk sebagai mahasiswa (login demo).
2. Buat laporan baru. Contoh:
   "Wi-Fi gedung A sering terputus saat perkuliahan berlangsung."
3. Prediksi AI dibuat dari teks judul + uraian, bukan dari kategori pilihan.
4. Keluar, lalu masuk sebagai admin demo.
5. Buka tab Prioritas AI dan klik "Evaluasi model ML".
6. Jelaskan accuracy, precision, recall, F1-score, serta confusion matrix
   yang disediakan oleh endpoint /api/evaluate.
7. Buka Laporan harian untuk menunjukkan prediksi kategori.

STRUKTUR
- server.py: API Flask, pelatihan, prediksi, dan evaluasi Naive Bayes.
- dataset_pengaduan.csv: data contoh berlabel untuk training/testing.
- app.js: antarmuka dan integrasi API.
- requirements.txt: dependensi Python.
- PANDUAN_PRESENTASI.txt: kerangka penjelasan di depan kelas.

BATASAN AKADEMIK (JELASKAN SECARA JUJUR)
- Dataset 80 baris adalah data contoh buatan untuk demonstrasi, bukan
  data historis resmi kampus.
- Skor evaluasi pada dataset kecil ini belum mewakili kinerja pada data
  nyata. Jangan mengklaim akurasi sebagai jaminan performa di kampus.
- Untuk penelitian lebih kuat, kumpulkan laporan yang telah dianonimkan,
  beri label kategori secara konsisten, dan uji pada data baru.
- Prediksi kategori menggunakan Naive Bayes. Skor prioritas Tinggi/Sedang/
  Rendah pada dashboard masih aturan heuristik, bukan keluaran Naive Bayes.
- Login dan penyimpanan data aplikasi masih demo/localStorage; belum cocok
  untuk data pribadi atau penggunaan produksi.

KONSEP SINGKAT
Teks laporan diubah menjadi bobot numerik oleh TF-IDF. Multinomial Naive
Bayes mempelajari hubungan antara kata dan kategori dari data latih,
kemudian menghitung probabilitas kategori untuk teks baru. Kategori dengan
probabilitas terbesar menjadi hasil prediksi.

PEMBARUAN V5
- Penyegaran visual: tipografi, ruang, kartu statistik, tombol, formulir, halaman login, dan responsivitas mobile.
- Cache CSS/JS diberi versi agar browser memuat aset terbaru.
