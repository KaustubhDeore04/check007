(function () {
  const form = document.getElementById('enquiry-form');
  if (!form) return;

  const msgEl = document.getElementById('form-msg');
  let productName = null;

  // Called by shop.js when someone clicks "Get a quote" on a product card,
  // so the message field is prefilled without a page reload or query param.
  function prefillProduct(name) {
    productName = name || null;
    const messageField = form.querySelector('[name="message"]');
    if (messageField && name) {
      messageField.value = `I'd like a quote for the ${name}.`;
    }
  }
  window.AlphaContact = { prefillProduct };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.textContent = '';
    msgEl.className = 'form-msg';

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, productName }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Something went wrong.');

      msgEl.textContent = "Thanks — we'll get back to you shortly.";
      msgEl.classList.add('success');
      form.reset();
      productName = null;
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.classList.add('error');
    }
  });
})();
