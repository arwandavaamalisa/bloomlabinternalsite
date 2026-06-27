const app = document.getElementById('app');
const pageTitle = document.getElementById('pageTitle');
const pageEyebrow = document.getElementById('pageEyebrow');
const globalSearch = document.getElementById('globalSearch');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const toastEl = document.getElementById('toast');

const state = {
  data: null,
  route: 'dashboard',
  search: '',
  filter: '',
  selectedComplaint: '',
  selectedIngredient: '',
  compareIds: []
};

const routeLabels = {
  dashboard: ['Internal Catalog', 'Dashboard'],
  products: ['Product Catalog', 'Semua Produk'],
  complaints: ['Sales Assistant', 'Pilih Produk Sesuai Keluhan'],
  ingredients: ['Knowledge Base', 'Kandungan Aktif'],
  compare: ['Product Intelligence', 'Perbandingan Produk'],
  faq: ['Product Knowledge', 'FAQ Produk']
};

const moneyLike = (value) => value || 'Perlu dilengkapi oleh tim BloomLab.';
const productById = (id) => state.data.products.find((product) => product.id === id);
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const normalize = (value = '') => String(value).toLowerCase().trim();

function listItems(items = []) {
  if (!items.length) return '<li>Perlu dilengkapi oleh tim BloomLab.</li>';
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function inlineList(items = []) {
  return items.length ? items.map(escapeHtml).join('<br>') : 'Perlu dilengkapi oleh tim BloomLab.';
}

function setTitle(route, customTitle) {
  const label = routeLabels[route] || routeLabels.dashboard;
  pageEyebrow.textContent = customTitle ? label[0] : label[0];
  pageTitle.textContent = customTitle || label[1];
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function renderSkeleton() {
  app.innerHTML = `
    <div class="skeleton-grid">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
  `;
}

async function init() {
  renderSkeleton();
  bindShellEvents();

  try {
    const response = await fetch('products.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('products.json tidak bisa dibaca.');
    state.data = await response.json();
    hydrateInitialSelections();
    window.addEventListener('hashchange', renderRoute);
    renderRoute();
  } catch (error) {
    app.innerHTML = `
      <div class="empty-state">
        <div>
          <h2>Data produk belum termuat.</h2>
          <p>${escapeHtml(error.message)}</p>
          <p>Jalankan website lewat static server lokal, misalnya <strong>python -m http.server</strong>, lalu buka dari browser.</p>
        </div>
      </div>
    `;
  }
}

function bindShellEvents() {
  document.getElementById('openSidebar').addEventListener('click', openSidebar);
  document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
  sidebarBackdrop.addEventListener('click', closeSidebar);

  globalSearch.addEventListener('input', (event) => {
    state.search = event.target.value;
    if (!location.hash.startsWith('#products') && !location.hash.startsWith('#dashboard')) {
      location.hash = 'products';
      return;
    }
    renderRoute();
  });

  app.addEventListener('click', handleAppClick);
  app.addEventListener('change', handleAppChange);
}

function openSidebar() {
  sidebar.classList.add('open');
  sidebarBackdrop.classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarBackdrop.classList.remove('open');
  document.body.classList.remove('no-scroll');
}

function hydrateInitialSelections() {
  const complaints = state.data.complaintRecommendations || [];
  const ingredients = state.data.ingredients || [];
  state.selectedComplaint = complaints[0]?.complaint || '';
  state.selectedIngredient = ingredients[0]?.name || '';
}

function getRoute() {
  const hash = location.hash.replace('#', '') || 'dashboard';
  const [path, query = ''] = hash.split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);

  return {
    path: parts[0] || 'dashboard',
    id: parts[1] || '',
    params
  };
}

function updateActiveNav(route) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === route);
  });
}

function renderRoute() {
  if (!state.data) return;
  const route = getRoute();
  state.route = route.path;
  state.filter = route.params.get('filter') || '';
  updateActiveNav(route.path);
  closeSidebar();

  if (route.path === 'product') {
    renderProductDetail(route.id);
    return;
  }

  setTitle(route.path);
  const renderers = {
    dashboard: renderDashboard,
    products: renderProductsPage,
    complaints: renderComplaintsPage,
    ingredients: renderIngredientsPage,
    compare: renderComparePage,
    faq: renderFaqPage
  };

  (renderers[route.path] || renderDashboard)();
  bindImageFallbacks();
}

function handleAppClick(event) {
  const viewButton = event.target.closest('[data-view-product]');
  if (viewButton) {
    location.hash = `product/${viewButton.dataset.viewProduct}`;
    return;
  }

  const shortcut = event.target.closest('[data-shortcut-product]');
  if (shortcut) {
    location.hash = `product/${shortcut.dataset.shortcutProduct}`;
    return;
  }

  const quickFilter = event.target.closest('[data-quick-filter]');
  if (quickFilter) {
    state.filter = quickFilter.dataset.quickFilter;
    location.hash = `products?filter=${encodeURIComponent(state.filter)}`;
    return;
  }

  const complaint = event.target.closest('[data-complaint]');
  if (complaint) {
    state.selectedComplaint = complaint.dataset.complaint;
    renderComplaintsPage();
    return;
  }

  const ingredient = event.target.closest('[data-ingredient]');
  if (ingredient) {
    state.selectedIngredient = ingredient.dataset.ingredient;
    renderIngredientsPage();
    return;
  }

  const copy = event.target.closest('[data-copy]');
  if (copy) {
    copyText(copy.dataset.copy, copy.dataset.copyLabel || 'Teks');
    return;
  }

  const download = event.target.closest('[data-download-image]');
  if (download) {
    const product = productById(download.dataset.downloadImage);
    if (product) downloadImage(product);
    return;
  }

  const faqButton = event.target.closest('[data-faq-toggle]');
  if (faqButton) {
    faqButton.closest('.faq-item')?.classList.toggle('open');
    return;
  }

  const backButton = event.target.closest('[data-back]');
  if (backButton) {
    location.hash = backButton.dataset.back || 'products';
  }
}

function handleAppChange(event) {
  const compareCheckbox = event.target.closest('[data-compare-checkbox]');
  if (!compareCheckbox) return;

  const id = compareCheckbox.dataset.compareCheckbox;
  if (compareCheckbox.checked) {
    if (state.compareIds.length >= 3) {
      compareCheckbox.checked = false;
      showToast('Maksimal 3 produk untuk dibandingkan.');
      return;
    }
    state.compareIds.push(id);
  } else {
    state.compareIds = state.compareIds.filter((item) => item !== id);
  }

  renderComparePage();
}

function bindImageFallbacks() {
  app.querySelectorAll('img').forEach((image) => {
    image.addEventListener('error', () => {
      const frame = image.closest('.image-frame, .detail-image');
      if (!frame) return;
      image.remove();
      frame.insertAdjacentHTML('beforeend', '<div class="image-placeholder">Tambahkan Foto Produk</div>');
    }, { once: true });
  });
}

function productSearchText(product) {
  return [
    product.name,
    product.sku,
    product.category,
    product.price,
    product.content,
    product.certification,
    product.highlight,
    product.description,
    ...(product.tags || []),
    ...(product.complaints || []),
    ...(product.activeIngredients || [])
  ].join(' ');
}

function getFilteredProducts() {
  const query = normalize(state.search);
  const filter = normalize(state.filter);

  return state.data.products.filter((product) => {
    const haystack = normalize(productSearchText(product));
    const matchesSearch = !query || haystack.includes(query);
    const matchesFilter = !filter || haystack.includes(filter);
    return matchesSearch && matchesFilter;
  });
}

function renderDashboard() {
  setTitle('dashboard');
  const products = state.data.products;
  const categories = [...new Set(products.map((product) => product.category))];
  const heroProduct = products.find((product) => product.id === 'gutreset') || products[0];
  const filtered = state.search ? getFilteredProducts() : products.slice(0, 6);

  app.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">BloomLab Internal</p>
        <h2>Product Catalog & Sales Assistant</h2>
        <p>Website internal berbasis HTML, CSS, dan JavaScript murni untuk membantu tim memilih produk, menjawab FAQ, melihat kandungan, dan membandingkan produk BloomLab secara cepat.</p>
        <div class="hero-actions">
          <a class="button" href="#products">Lihat Semua Produk</a>
          <a class="button-secondary" href="#complaints">Pilih Sesuai Keluhan</a>
        </div>
        <label class="search-panel" for="dashboardSearch">
          <span>⌕</span>
          <input id="dashboardSearch" type="search" value="${escapeHtml(state.search)}" placeholder="Search produk di dashboard...">
        </label>
      </div>
      <div class="hero-visual image-frame">
        <img src="${escapeHtml(heroProduct.image)}" alt="${escapeHtml(heroProduct.name)}">
      </div>
    </section>

    <section class="stats-grid" aria-label="Ringkasan katalog">
      <div class="stat-card"><span>Jumlah Produk</span><strong>${products.length}</strong></div>
      <div class="stat-card"><span>Kategori Produk</span><strong>${categories.length}</strong></div>
      <div class="stat-card"><span>Produk Terlaris</span><strong style="font-size:1.1rem; letter-spacing:-0.02em;">Perlu dilengkapi oleh tim BloomLab.</strong></div>
      <div class="stat-card"><span>Data Source</span><strong style="font-size:1.1rem; letter-spacing:-0.02em;">products.json</strong></div>
    </section>

    <section class="dashboard-grid">
      <div class="content-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Quick Filter</p>
            <h2>Filter kebutuhan sales</h2>
          </div>
        </div>
        <div class="quick-filters">
          ${state.data.quickFilters.map((filter) => `<button class="filter-chip" data-quick-filter="${escapeHtml(filter)}">${escapeHtml(filter)}</button>`).join('')}
        </div>
      </div>
      <div class="content-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Shortcut Produk</p>
            <h2>Akses cepat</h2>
          </div>
        </div>
        <div class="shortcut-list">
          ${filtered.slice(0, 5).map(renderShortcut).join('')}
        </div>
      </div>
    </section>
  `;

  const dashboardSearch = document.getElementById('dashboardSearch');
  dashboardSearch?.addEventListener('input', (event) => {
    state.search = event.target.value;
    globalSearch.value = state.search;
    renderDashboard();
  });

  bindImageFallbacks();
}

function renderShortcut(product) {
  return `
    <button class="shortcut-item" data-shortcut-product="${escapeHtml(product.id)}">
      <span class="image-frame"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"></span>
      <span>
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.category)} · ${escapeHtml(product.price)}</span>
      </span>
    </button>
  `;
}

function renderProductsPage() {
  setTitle('products', state.filter ? `Semua Produk: ${state.filter}` : 'Semua Produk');
  const products = getFilteredProducts();

  app.innerHTML = `
    <section class="content-card">
      <div class="product-toolbar">
        <div>
          <p class="eyebrow">Product Catalog</p>
          <h2>${products.length} produk ditemukan</h2>
          <p style="color:var(--muted); margin:6px 0 0;">Search mencakup nama produk, SKU, kategori, keluhan, dan kandungan.</p>
        </div>
        ${state.filter ? '<button class="button-ghost" data-quick-filter="">Reset Filter</button>' : ''}
      </div>
      <div class="chip-row" style="margin-bottom:18px;">
        ${state.data.quickFilters.map((filter) => `<button class="chip ${state.filter === filter ? 'active' : ''}" data-quick-filter="${escapeHtml(filter)}">${escapeHtml(filter)}</button>`).join('')}
      </div>
      ${products.length ? `<div class="product-grid">${products.map(renderProductCard).join('')}</div>` : renderEmpty('Produk tidak ditemukan', 'Coba ubah kata kunci atau reset filter.')}
    </section>
  `;

  bindImageFallbacks();
}

function renderProductCard(product) {
  return `
    <article class="product-card">
      <div class="image-frame">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      </div>
      <div class="product-body">
        <div class="product-meta">
          <span class="pill">${escapeHtml(product.category)}</span>
          <span class="pill neutral">${escapeHtml(product.certification)}</span>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.highlight)}</p>
        <div class="price-row">
          <strong>${escapeHtml(moneyLike(product.price))}</strong>
          <span>${escapeHtml(product.content)}</span>
        </div>
        <div class="card-actions">
          <button class="button-small" data-view-product="${escapeHtml(product.id)}">Lihat Detail</button>
        </div>
      </div>
    </article>
  `;
}

function renderProductDetail(id) {
  const product = productById(id);
  if (!product) {
    setTitle('products', 'Produk tidak ditemukan');
    app.innerHTML = renderEmpty('Produk tidak ditemukan', 'Kembali ke daftar produk untuk memilih produk lain.');
    return;
  }

  updateActiveNav('products');
  pageEyebrow.textContent = product.category;
  pageTitle.textContent = product.name;

  app.innerHTML = `
    <section class="detail-layout">
      <div class="detail-image image-frame">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      </div>
      <article class="detail-card">
        <button class="button-ghost" data-back="products">← Kembali ke Produk</button>
        <div class="product-meta" style="margin-top:18px;">
          <span class="pill">${escapeHtml(product.category)}</span>
          <span class="pill neutral">${escapeHtml(product.certification)}</span>
        </div>
        <h2>${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.description)}</p>

        <div class="detail-actions">
          <button class="button" data-copy="${escapeHtml(product.sku)}" data-copy-label="SKU ${escapeHtml(product.name)}">Copy SKU</button>
          <button class="button-secondary" data-copy="${escapeHtml(product.name)}" data-copy-label="Nama produk">Copy Nama Produk</button>
          <button class="button-ghost" data-download-image="${escapeHtml(product.id)}">Download Gambar</button>
        </div>

        <div class="info-grid">
          <div class="info-box"><span>Harga</span><strong>${escapeHtml(moneyLike(product.price))}</strong></div>
          <div class="info-box"><span>Isi</span><strong>${escapeHtml(product.content)}</strong></div>
          <div class="info-box"><span>SKU</span><strong>${escapeHtml(product.sku)}</strong></div>
          <div class="info-box"><span>Source</span><strong>${escapeHtml(product.sourceUrl || 'Perlu dilengkapi oleh tim BloomLab.')}</strong></div>
        </div>

        <div class="detail-section">
          <h3>Manfaat</h3>
          <ul class="clean-list">${listItems(product.benefits)}</ul>
        </div>

        <div class="detail-section split-list">
          <div>
            <h3>Kandungan</h3>
            <ul class="clean-list">${listItems(product.activeIngredients)}</ul>
          </div>
          <div>
            <h3>Cara Konsumsi</h3>
            <ul class="clean-list">${listItems(product.consumption)}</ul>
          </div>
        </div>

        <div class="detail-section split-list">
          <div>
            <h3>Target Pengguna</h3>
            <ul class="clean-list">${listItems(product.targetUsers)}</ul>
          </div>
          <div class="warning-card">
            <h3>Yang Tidak Disarankan / Perlu Konsultasi</h3>
            <ul class="clean-list">${listItems(product.notRecommended)}</ul>
          </div>
        </div>

        <div class="detail-section">
          <h3>FAQ Produk</h3>
          <div class="faq-list">${renderFaqItems(product.faq)}</div>
        </div>
      </article>
    </section>
  `;

  bindImageFallbacks();
}

function renderComplaintsPage() {
  setTitle('complaints');
  const recommendations = state.data.complaintRecommendations || [];
  const selected = recommendations.find((item) => item.complaint === state.selectedComplaint) || recommendations[0];
  if (selected) state.selectedComplaint = selected.complaint;
  const products = (selected?.productIds || []).map(productById).filter(Boolean);

  app.innerHTML = `
    <section class="content-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Interactive Recommendation</p>
          <h2>Pilih keluhan customer</h2>
          <p>Setelah keluhan dipilih, sistem menampilkan rekomendasi produk beserta alasan sales-friendly.</p>
        </div>
      </div>
      <div class="complaint-grid">
        ${recommendations.map((item) => `
          <button class="complaint-button ${item.complaint === state.selectedComplaint ? 'active' : ''}" data-complaint="${escapeHtml(item.complaint)}">
            <strong>${escapeHtml(item.complaint)}</strong>
          </button>
        `).join('')}
      </div>
      <div class="recommendation-area">
        <div class="warning-card" style="margin-bottom:18px;">
          <strong>Alasan rekomendasi:</strong> ${escapeHtml(selected?.reason || 'Perlu dilengkapi oleh tim BloomLab.')}
        </div>
        ${products.length ? `<div class="product-grid">${products.map(renderProductCard).join('')}</div>` : renderEmpty('Belum ada produk terpetakan', selected?.reason || 'Perlu dilengkapi oleh tim BloomLab.')}
      </div>
    </section>
  `;

  bindImageFallbacks();
}

function renderIngredientsPage() {
  setTitle('ingredients');
  const ingredients = state.data.ingredients || [];
  const selected = ingredients.find((item) => item.name === state.selectedIngredient) || ingredients[0];
  if (selected) state.selectedIngredient = selected.name;
  const products = (selected?.productIds || []).map(productById).filter(Boolean);

  app.innerHTML = `
    <section class="content-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Active Ingredients</p>
          <h2>Daftar kandungan aktif</h2>
          <p>Klik bahan untuk melihat manfaat sederhana dan produk yang menggunakan bahan tersebut.</p>
        </div>
      </div>
      <div class="ingredients-grid">
        ${ingredients.map((ingredient) => `
          <button class="ingredient-button ${ingredient.name === state.selectedIngredient ? 'active' : ''}" data-ingredient="${escapeHtml(ingredient.name)}">
            <strong>${escapeHtml(ingredient.name)}</strong>
          </button>
        `).join('')}
      </div>
      <div class="ingredient-detail">
        ${selected ? `
          <article class="ingredient-card">
            <p class="eyebrow">Kandungan Aktif</p>
            <h3>${escapeHtml(selected.name)}</h3>
            <p><strong>Manfaat:</strong> ${escapeHtml(selected.benefit)}</p>
            <p><strong>Penjelasan sederhana:</strong> ${escapeHtml(selected.simple)}</p>
            <div class="detail-section">
              <h3>Produk yang menggunakan bahan ini</h3>
              ${products.length ? `<div class="product-grid">${products.map(renderProductCard).join('')}</div>` : renderEmpty('Belum ada produk terpetakan', 'Perlu dilengkapi oleh tim BloomLab.')}
            </div>
          </article>
        ` : renderEmpty('Kandungan belum tersedia', 'Perlu dilengkapi oleh tim BloomLab.')}
      </div>
    </section>
  `;

  bindImageFallbacks();
}

function renderComparePage() {
  setTitle('compare');
  const selectedProducts = state.compareIds.map(productById).filter(Boolean);

  app.innerHTML = `
    <section class="content-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Product Comparison</p>
          <h2>Pilih maksimal 3 produk</h2>
          <p>Bandingkan harga, isi, target, manfaat, kandungan, cara konsumsi, keunggulan, dan FAQ.</p>
        </div>
        <button class="button-ghost" id="resetCompare">Reset Pilihan</button>
      </div>
      <div class="compare-select-grid">
        ${state.data.products.map((product) => `
          <label class="compare-option">
            <input type="checkbox" data-compare-checkbox="${escapeHtml(product.id)}" ${state.compareIds.includes(product.id) ? 'checked' : ''}>
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
            <span><strong>${escapeHtml(product.name)}</strong><br><small>${escapeHtml(product.category)}</small></span>
          </label>
        `).join('')}
      </div>
      ${selectedProducts.length ? renderCompareTable(selectedProducts) : renderEmpty('Belum ada produk dipilih', 'Pilih 1–3 produk untuk mulai membandingkan.')}
    </section>
  `;

  document.getElementById('resetCompare')?.addEventListener('click', () => {
    state.compareIds = [];
    renderComparePage();
  });

  bindImageFallbacks();
}

function renderCompareTable(products) {
  const rows = [
    ['Harga', (product) => moneyLike(product.price)],
    ['Isi', (product) => product.content],
    ['Target', (product) => inlineList(product.targetUsers)],
    ['Manfaat', (product) => inlineList(product.benefits)],
    ['Kandungan', (product) => inlineList(product.activeIngredients)],
    ['Cara konsumsi', (product) => inlineList(product.consumption)],
    ['Keunggulan', (product) => inlineList(product.advantages)],
    ['FAQ', (product) => (product.faq || []).map((item) => `<strong>${escapeHtml(item.q)}</strong><br>${escapeHtml(item.a)}`).join('<br><br>') || 'Perlu dilengkapi oleh tim BloomLab.']
  ];

  return `
    <div class="compare-panel">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Aspek</th>
            ${products.map((product) => `<th>${escapeHtml(product.name)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(([label, getter]) => `
            <tr>
              <td>${escapeHtml(label)}</td>
              ${products.map((product) => `<td>${getter(product)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFaqPage() {
  setTitle('faq');
  const productFaqs = state.data.products.flatMap((product) =>
    (product.faq || []).slice(0, 2).map((item) => ({
      q: `${item.q} — ${product.name}`,
      a: item.a
    }))
  );
  const faqs = [...(state.data.globalFaq || []), ...productFaqs];

  app.innerHTML = `
    <section class="content-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">FAQ Produk</p>
          <h2>Pertanyaan umum sales</h2>
          <p>Semua jawaban menggunakan Bahasa Indonesia dan menandai data yang perlu diverifikasi.</p>
        </div>
      </div>
      <div class="faq-list">
        ${renderFaqItems(faqs)}
      </div>
    </section>
  `;
}

function renderFaqItems(faqs = []) {
  return faqs.map((item, index) => `
    <article class="faq-item ${index === 0 ? 'open' : ''}">
      <button class="faq-question" data-faq-toggle>
        <span>${escapeHtml(item.q)}</span>
        <span>＋</span>
      </button>
      <div class="faq-answer">${escapeHtml(item.a)}</div>
    </article>
  `).join('');
}

function renderEmpty(title, message) {
  return `
    <div class="empty-state">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

async function copyText(text, label) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
    showToast(`${label} berhasil disalin.`);
  } catch (error) {
    showToast('Gagal menyalin. Silakan copy manual.');
  }
}

function downloadImage(product) {
  if (!product.image) {
    showToast('Gambar belum tersedia. Tambahkan foto produk di folder /images.');
    return;
  }

  const link = document.createElement('a');
  link.href = product.image;
  const extension = product.image.split('.').pop().split('?')[0] || 'png';
  link.download = `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast(`Gambar ${product.name} disiapkan untuk diunduh.`);
}

init();
