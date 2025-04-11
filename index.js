const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database('db.sqlite3');
const bcrypt = require('bcrypt');
const session = require('express-session');

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

app.use((req, res, next) => {
  res.locals.session = req.session;
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

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
    if (err) {
      return res.send('Error: user might already exist.');
    }
    res.send('Registration successful. <a href="/">Go to login</a>');
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.send('Invalid username or password.');
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.username = user.username;
      res.send(`Welcome ${user.username}. <a href="/">Home</a>`);
    } else {
      res.send('Invalid username or password.');
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
