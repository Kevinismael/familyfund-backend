const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const FILE = path.join(__dirname, '..', 'data', 'users.json');

function readUsers() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function writeUsers(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getSecret(req) {
  return req.app.get('jwtSecret') || 'familyfund_super_secreto';
}

// Registro
router.post('/register', (req, res) => {
  const { email, password, familyName } = req.body;

  if (!email || !password || !familyName) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const users = readUsers();
  const exists = users.find(u => u.email === email);
  if (exists) return res.status(400).json({ error: 'Email ya registrado' });

  const hashed = bcrypt.hashSync(password, 10);

  const user = {
    id: Date.now(),
    email,
    password: hashed,
    familyName
  };

  users.push(user);
  writeUsers(users);

  const SECRET = getSecret(req);

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, {
    expiresIn: '7d'
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      familyName: user.familyName
    }
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Credenciales inválidas' });

  const SECRET = getSecret(req);

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, {
    expiresIn: '7d'
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      familyName: user.familyName
    }
  });
});

module.exports = router;
