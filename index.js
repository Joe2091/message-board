const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database('db.sqlite3');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

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

app.post('/message', (req, res) => {
  const name = req.body.name;
  const message = req.body.message;

  //SQL Injection
  const query = `INSERT INTO messages (name, message) VALUES ('${name}', '${message}')`;
  db.run(query, (err) => {
    console.log('Executing query:', query);
    if (err) {
      return res.status(500).send('Failed to post message');
    }
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('message board application running at http://localhost:3000');
});
