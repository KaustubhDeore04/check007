(function () {
  const grid = document.getElementById('product-grid');
  const filterRow = document.getElementById('filter-row');
  if (!grid) return;

  const WHATSAPP_NUMBER = '919146949480';
  let allProducts = [];
  let activeCategory = 'All';

  const ICONS = {
    'Living Room':
      '<path d="M4 32V18a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v14" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 32h40v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 24v-4a2 2 0 0 1 2-2h28a2 2 0 0 1 2 2v4" fill="none" stroke="currentColor" stroke-width="2"/>',
    Bedroom:
      '<rect x="4" y="20" width="36" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 20v-6a3 3 0 0 1 3-3h22a3 3 0 0 1 3 3v6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 34v6M40 34v6" stroke="currentColor" stroke-width="2"/>',
    Workspace:
      '<rect x="5" y="10" width="34" height="20" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 30v6M39 30v6M14 30v6M30 30v6" stroke="currentColor" stroke-width="2"/>',
    Bespoke:
      '<path d="M22 4v10M22 30v10M4 22h10M30 22h10" stroke="currentColor" stroke-width="2"/><circle cx="22" cy="22" r="8" fill="none" stroke="currentColor" stroke-width="2"/>',
  };

  function iconFor(category) {
    return ICONS[category] || ICONS['Bespoke'];
  }

  function formatPrice(p) {
    if (p.priceOnRequest || p.price == null) return null;
    return '₹' + Number(p.price).toLocaleString('en-IN');
  }

  function waLink(product) {
    const msg = encodeURIComponent(`Hi Alpha Furnishings, I'd like to enquire about the ${product.name}.`);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  }

  function render() {
    const items =
      activeCategory === 'All' ? allProducts : allProducts.filter((p) => p.category === activeCategory);

    if (!items.length) {
      grid.innerHTML = '<p class="empty-state">No pieces listed in this category yet — enquire and we\'ll help you find the right fit.</p>';
      return;
    }

    grid.innerHTML = items
      .map((p) => {
        const price = formatPrice(p);
        return `
        <article class="product-card">
          <svg class="product-icon" viewBox="0 0 44 44" fill="none">${iconFor(p.category)}</svg>
          <h3>${escapeHtml(p.name)}</h3>
          <div class="cat-label">${escapeHtml(p.category)}</div>
          <p>${escapeHtml(p.description || '')}</p>
          <div class="product-price ${price ? '' : 'on-request'}">${price || 'Price on request'}</div>
          <div class="product-actions">
            <a class="btn btn-whatsapp btn-small" href="${waLink(p)}" target="_blank" rel="noopener">WhatsApp enquiry</a>
            <button type="button" class="btn btn-small get-quote-btn" data-product="${escapeHtml(p.name)}">Get a quote</button>
          </div>
        </article>`;
      })
      .join('');

    if (window.gsap) {
      gsap.fromTo(
        grid.querySelectorAll('.product-card'),
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power2.out' }
      );
    } else {
      grid.querySelectorAll('.product-card').forEach((c) => (c.style.opacity = 1));
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function setActiveChip() {
    filterRow.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.category === activeCategory);
    });
  }

  function setCategory(category) {
    activeCategory = category || 'All';
    setActiveChip();
    render();
  }
  // Exposed so links elsewhere on the page (Home's category strip,
  // Collection's "Browse ___" links) can filter the Shop section
  // in place instead of navigating to a separate catalogue page.
  window.AlphaShop = { setCategory };

  filterRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    setCategory(chip.dataset.category);
  });

  // Any link on the page with data-category (Home's cat-strip, Collection's
  // showcase cards) filters the catalogue and scrolls to it, all in place.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-category]');
    if (!link) return;
    e.preventDefault();
    setCategory(link.dataset.category);
    if (window.AlphaScrollTo) window.AlphaScrollTo('shop');
  });

  // "Get a quote" on a product card prefills the enquiry form and scrolls
  // to Contact, instead of reloading a separate contact page.
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.get-quote-btn');
    if (!btn) return;
    if (window.AlphaContact) window.AlphaContact.prefillProduct(btn.dataset.product);
    if (window.AlphaScrollTo) window.AlphaScrollTo('contact');
  });

  fetch('/api/products')
    .then((r) => r.json())
    .then((data) => {
      allProducts = data.products || [];
      setActiveChip();
      render();
    })
    .catch(() => {
      grid.innerHTML = '<p class="empty-state">Could not load the catalogue right now — please call or WhatsApp us directly.</p>';
    });
})();
