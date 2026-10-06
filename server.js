const path = require('path');
const express = require('express');
const session = require('express-session');

const apiRoutes = require('./routes/api');
const adminAuthRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(
  session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'alpha-furnishings-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

app.use('/api/admin', adminAuthRoutes);
app.use('/api', apiRoutes);

app.use(express.static(path.join(__dirname, 'public')));

// The whole site (home, collection, shop, contact and the admin panel) now
// lives on one scrolling page, public/index.html — sections are jumped to
// with in-page anchors instead of separate page loads. These old URLs are
// kept working as redirects in case they're bookmarked or linked anywhere.
const legacyRedirects = {
  '/index.html': '/',
  '/collection': '/#collection',
  '/collection.html': '/#collection',
  '/shop': '/#shop',
  '/shop.html': '/#shop',
  '/contact': '/#contact',
  '/contact.html': '/#contact',
  '/admin-login': '/#admin',
  '/admin-login.html': '/#admin',
  '/admin-dashboard': '/#admin',
  '/admin-dashboard.html': '/#admin',
};
Object.entries(legacyRedirects).forEach(([from, to]) => {
  app.get(from, (req, res) => res.redirect(302, to));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Alpha Furnishings site running at http://localhost:${PORT}`);
});
