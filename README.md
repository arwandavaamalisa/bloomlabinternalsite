# BloomLab Internal Product Catalog & Sales Assistant

Website statis internal berbasis HTML, CSS, dan JavaScript murni. Tidak ada backend dan tidak menggunakan framework.

## Struktur

- `index.html` — struktur utama website
- `style.css` — tema visual modern, premium, responsif
- `script.js` — logic interaktif, routing, search, compare, copy, download image
- `products.json` — semua data produk, kandungan, keluhan, dan FAQ
- `images/` — foto produk BloomLab

## Cara menjalankan lokal

Karena browser biasanya memblokir `fetch('products.json')` jika dibuka langsung via `file://`, jalankan static server lokal:

```bash
cd bloomlab_internal_site
python -m http.server 8000
```

Lalu buka:

```text
http://localhost:8000
```

## Cara edit data

Edit `products.json`. Semua field yang belum pasti sudah ditandai dengan:

```text
Perlu dilengkapi oleh tim BloomLab.
```

## Catatan compliance

Produk adalah suplemen/rutinitas nutrisi, bukan obat. Hindari klaim menyembuhkan, mencegah, atau mengobati penyakit. Validasi ulang harga, SKU, nomor legal, status halal, dan gambar sebelum digunakan oleh tim sales.
