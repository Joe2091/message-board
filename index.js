const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database('db.sqlite3');
const bcrypt = require('bcrypt');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(helmet());
app.use(morgan('combined'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(
  session({
    secret: 'securesecret', // moved to .env for most secure practices
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 30,
    },
  })
);

app.use(cookieParser());

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Create table
db.run('CREATE TABLE IF NOT EXISTS messages (name TEXT, message TEXT)');

app.get('/', (req, res) => {
  db.all('SELECT * FROM messages', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.render('index', { messages: rows });
  });
});

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`);

app.get('/auth', (req, res) => {
  res.render('auth', { csrfToken: req.csrfToken() });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
    if (err) {
      return res.redirect('/auth');
    }
    res.redirect('/auth'); // Registration successful, return to login form
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.redirect('/auth');
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.username = user.username;
      res.redirect('/');
    } else {
      res.redirect('/auth');
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error logging out');
    }
    res.redirect('/');
  });
});

app.post('/message', (req, res) => {
  const { name, message } = req.body;
  db.run('INSERT INTO messages (name, message) VALUES (?, ?)', [name, message], (err) => {
    // Correct Parameterized Queries to avoid SQL Injection
    if (err) {
      return res.status(500).send('Failed to post message');
    }
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('message board application running at http://localhost:3000');
});
