const express = require('express');
const crypto = require('crypto');
const store = require('../lib/store');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = ['Living Room', 'Bedroom', 'Workspace', 'Bespoke'];

// ---- Products (public read) ----

router.get('/products', async (req, res) => {
  try {
    const products = await store.getProducts();
    const { category } = req.query;
    const filtered = category && category !== 'All'
      ? products.filter((p) => p.category === category)
      : products;
    res.json({ products: filtered, categories: CATEGORIES });
  } catch (err) {
    res.status(500).json({ error: 'Could not load products.' });
  }
});

// ---- Products (admin write) ----

router.post('/products', requireAdmin, async (req, res) => {
  try {
    const { name, category, price, priceOnRequest, description } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Choose a valid category.' });
    }

    const isOnRequest = !!priceOnRequest || price === '' || price === null || price === undefined;

    const product = {
      id: `p-${crypto.randomUUID()}`,
      name: name.trim(),
      category,
      price: isOnRequest ? null : Number(price),
      priceOnRequest: isOnRequest,
      description: (description || '').trim(),
      createdAt: new Date().toISOString(),
    };

    const products = await store.getProducts();
    products.unshift(product);
    await store.saveProducts(products);

    res.status(201).json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Could not add the product.' });
  }
});

router.put('/products/:id', requireAdmin, async (req, res) => {
  try {
    const products = await store.getProducts();
    const idx = products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found.' });

    const { name, category, price, priceOnRequest, description } = req.body || {};
    const isOnRequest = !!priceOnRequest || price === '' || price === null || price === undefined;

    products[idx] = {
      ...products[idx],
      name: name ? name.trim() : products[idx].name,
      category: CATEGORIES.includes(category) ? category : products[idx].category,
      price: isOnRequest ? null : Number(price),
      priceOnRequest: isOnRequest,
      description: description !== undefined ? description.trim() : products[idx].description,
    };

    await store.saveProducts(products);
    res.json({ product: products[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Could not update the product.' });
  }
});

router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const products = await store.getProducts();
    const next = products.filter((p) => p.id !== req.params.id);

    if (next.length === products.length) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    await store.saveProducts(next);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not remove the product.' });
  }
});

// ---- Enquiries (public write, admin read) ----

router.post('/enquiries', async (req, res) => {
  try {
    const { name, phone, message, productName } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone number are required.' });
    }

    const enquiry = {
      id: `e-${crypto.randomUUID()}`,
      name: name.trim(),
      phone: phone.trim(),
      message: (message || '').trim(),
      productName: productName || null,
      createdAt: new Date().toISOString(),
    };

    const enquiries = await store.getEnquiries();
    enquiries.unshift(enquiry);
    await store.saveEnquiries(enquiries);

    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not send your enquiry — please try WhatsApp or call instead.' });
  }
});

router.get('/enquiries', requireAdmin, async (req, res) => {
  try {
    const enquiries = await store.getEnquiries();
    res.json({ enquiries });
  } catch (err) {
    res.status(500).json({ error: 'Could not load enquiries.' });
  }
});

module.exports = router;
