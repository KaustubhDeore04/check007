(function () {
  const overlay = document.getElementById('admin-overlay');
  if (!overlay) return;

  const viewLogin = document.getElementById('admin-view-login');
  const viewDashboard = document.getElementById('admin-view-dashboard');
  const closeBtn = document.getElementById('admin-close-btn');
  const openLink = document.getElementById('admin-open-link');

  const steps = {
    login: document.getElementById('step-login'),
    forgotRequest: document.getElementById('step-forgot-request'),
    forgotVerify: document.getElementById('step-forgot-verify'),
    forgotReset: document.getElementById('step-forgot-reset'),
  };

  let currentResetId = null;

  function showStep(name) {
    Object.values(steps).forEach((el) => el.classList.remove('is-active'));
    steps[name].classList.add('is-active');
  }

  function showView(name) {
    viewLogin.classList.toggle('is-active', name === 'login');
    viewDashboard.classList.toggle('is-active', name === 'dashboard');
  }

  function openOverlay() {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (window.__lenis) window.__lenis.stop();
  }

  function closeOverlay() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (window.__lenis) window.__lenis.start();
    if (window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  async function checkAuthAndOpen() {
    openOverlay();
    try {
      const res = await fetch('/api/admin/me');
      const body = await res.json();
      if (body.authenticated) {
        document.getElementById('admin-username').textContent = body.username;
        showView('dashboard');
        loadProducts();
      } else {
        showView('login');
        showStep('login');
      }
    } catch {
      showView('login');
      showStep('login');
    }
  }

  if (openLink) {
    openLink.addEventListener('click', (e) => {
      e.preventDefault();
      checkAuthAndOpen();
    });
  }
  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeOverlay();
  });

  // Land straight in the admin overlay if the page is loaded with #admin.
  if (window.location.hash === '#admin') {
    checkAuthAndOpen();
  }

  // ---------------- Login ----------------
  const loginForm = document.getElementById('login-form');
  const loginErr = document.getElementById('login-error');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErr.textContent = '';
    const { username, password } = Object.fromEntries(new FormData(loginForm).entries());

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Login failed.');

      document.getElementById('admin-username').textContent = body.username;
      showView('dashboard');
      loadProducts();
    } catch (err) {
      loginErr.textContent = err.message;
    }
  });

  // ---------------- Forgot password flow ----------------
  document.getElementById('show-forgot').addEventListener('click', (e) => {
    e.preventDefault();
    showStep('forgotRequest');
  });

  document.querySelectorAll('.back-to-login').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      currentResetId = null;
      showStep('login');
    });
  });

  const forgotRequestForm = document.getElementById('forgot-request-form');
  const forgotRequestMsg = document.getElementById('forgot-request-msg');
  forgotRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotRequestMsg.textContent = '';
    forgotRequestMsg.className = 'form-msg';
    const { username } = Object.fromEntries(new FormData(forgotRequestForm).entries());

    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not send a code.');

      currentResetId = body.resetId || null;
      document.getElementById('otp-code').value = '';
      showStep('forgotVerify');

      const verifyMsg = document.getElementById('forgot-verify-msg');
      if (body.devCode) {
        // SMTP isn't configured yet, so the server sent the code straight
        // back instead of emailing it — see README.md to turn on real
        // email delivery.
        verifyMsg.textContent = `Email isn't set up yet — your code is ${body.devCode}.`;
        verifyMsg.className = 'form-msg';
      } else {
        verifyMsg.textContent = '';
        verifyMsg.className = 'form-msg';
      }
    } catch (err) {
      forgotRequestMsg.textContent = err.message;
      forgotRequestMsg.classList.add('error');
    }
  });

  const forgotVerifyForm = document.getElementById('forgot-verify-form');
  const forgotVerifyMsg = document.getElementById('forgot-verify-msg');
  forgotVerifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotVerifyMsg.textContent = '';
    forgotVerifyMsg.className = 'form-msg';

    if (!currentResetId) {
      forgotVerifyMsg.textContent = 'That reset request is invalid or has expired. Start again.';
      forgotVerifyMsg.classList.add('error');
      return;
    }

    const { code } = Object.fromEntries(new FormData(forgotVerifyForm).entries());

    try {
      const res = await fetch('/api/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetId: currentResetId, code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Incorrect code.');

      document.getElementById('forgot-reset-form').reset();
      showStep('forgotReset');
    } catch (err) {
      forgotVerifyMsg.textContent = err.message;
      forgotVerifyMsg.classList.add('error');
    }
  });

  const forgotResetForm = document.getElementById('forgot-reset-form');
  const forgotResetMsg = document.getElementById('forgot-reset-msg');
  forgotResetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotResetMsg.textContent = '';
    forgotResetMsg.className = 'form-msg';

    const { newPassword, confirmPassword } = Object.fromEntries(new FormData(forgotResetForm).entries());
    if (newPassword !== confirmPassword) {
      forgotResetMsg.textContent = 'Passwords do not match.';
      forgotResetMsg.classList.add('error');
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetId: currentResetId, newPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not reset the password.');

      currentResetId = null;
      loginErr.textContent = '';
      loginForm.reset();
      showStep('login');
      forgotResetMsg.textContent = '';
    } catch (err) {
      forgotResetMsg.textContent = err.message;
      forgotResetMsg.classList.add('error');
    }
  });

  // ---------------- Admin dashboard ----------------
  const CATEGORIES = ['Living Room', 'Bedroom', 'Workspace', 'Bespoke'];
  const tableBody = document.getElementById('product-table-body');
  const form = document.getElementById('product-form');
  const formTitle = document.getElementById('form-title');
  const cancelEditBtn = document.getElementById('cancel-edit');
  const priceInput = form.querySelector('[name="price"]');
  const onRequestInput = form.querySelector('[name="priceOnRequest"]');
  const formMsg = document.getElementById('product-form-msg');
  const enquiriesBody = document.getElementById('enquiries-body');
  let editingId = null;
  let currentProducts = [];

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function resetForm() {
    editingId = null;
    form.reset();
    formTitle.textContent = 'Add a product';
    cancelEditBtn.hidden = true;
    onRequestInput.checked = false;
    priceInput.disabled = false;
  }

  onRequestInput.addEventListener('change', () => {
    priceInput.disabled = onRequestInput.checked;
    if (onRequestInput.checked) priceInput.value = '';
  });

  cancelEditBtn.addEventListener('click', resetForm);

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderProducts(products) {
    if (!products.length) {
      tableBody.innerHTML = '<tr><td colspan="5">No products yet — add your first one.</td></tr>';
      return;
    }
    tableBody.innerHTML = products
      .map(
        (p) => `
      <tr data-id="${p.id}">
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category)}</td>
        <td>${p.priceOnRequest ? '<span class="badge-request">On request</span>' : '₹' + Number(p.price).toLocaleString('en-IN')}</td>
        <td>${fmtDate(p.createdAt)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-small edit-btn" type="button">Edit</button>
            <button class="btn btn-small btn-danger delete-btn" type="button">Delete</button>
          </div>
        </td>
      </tr>`
      )
      .join('');
  }

  async function loadProducts() {
    const res = await fetch('/api/products');
    const body = await res.json();
    currentProducts = body.products || [];
    renderProducts(currentProducts);
  }

  async function loadEnquiries() {
    const res = await fetch('/api/enquiries');
    if (!res.ok) return;
    const body = await res.json();
    const enquiries = body.enquiries || [];
    enquiriesBody.innerHTML = enquiries.length
      ? enquiries
          .map(
            (e) => `
        <tr>
          <td>${escapeHtml(e.name)}</td>
          <td>${escapeHtml(e.phone)}</td>
          <td>${escapeHtml(e.productName || '—')}</td>
          <td>${escapeHtml(e.message || '—')}</td>
          <td>${fmtDate(e.createdAt)}</td>
        </tr>`
          )
          .join('')
      : '<tr><td colspan="5">No enquiries yet.</td></tr>';
  }

  tableBody.addEventListener('click', async (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const id = row.dataset.id;
    const product = currentProducts.find((p) => p.id === id);
    if (!product) return;

    if (e.target.classList.contains('delete-btn')) {
      if (!confirm(`Remove "${product.name}"?`)) return;
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) loadProducts();
      return;
    }

    if (e.target.classList.contains('edit-btn')) {
      editingId = id;
      formTitle.textContent = `Editing "${product.name}"`;
      cancelEditBtn.hidden = false;
      form.name.value = product.name;
      form.category.value = product.category;
      form.description.value = product.description || '';
      onRequestInput.checked = product.priceOnRequest;
      priceInput.disabled = product.priceOnRequest;
      priceInput.value = product.priceOnRequest ? '' : product.price;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = '';
    formMsg.className = 'form-msg';

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.priceOnRequest = onRequestInput.checked;

    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not save the product.');

      formMsg.textContent = editingId ? 'Product updated.' : 'Product added.';
      formMsg.classList.add('success');
      resetForm();
      loadProducts();
    } catch (err) {
      formMsg.textContent = err.message;
      formMsg.classList.add('error');
    }
  });

  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('is-active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.getElementById(tab.dataset.panel).classList.add('is-active');
      if (tab.dataset.panel === 'panel-enquiries') loadEnquiries();
    });
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    showView('login');
    showStep('login');
    resetForm();
  });
})();
