const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Ruta absoluta al archivo de usuarios
const usersFile = path.join(__dirname, '..', 'data', 'users.json');

// Leer usuarios desde archivo
function loadUsers() {
  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Guardar usuarios en archivo
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Registro de usuario
router.post('/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const users = loadUsers();

  // Verificar si ya existe
  if (users.find(u => u.email === email))
    return res.status(400).json({ error: 'El email ya está registrado' });

  // Crear usuario
  const hashed = bcrypt.hashSync(password, 10);
  const newUser = {
    id: Date.now(),
    email,
    password: hashed
  };

  users.push(newUser);
  saveUsers(users);

  return res.json({ message: 'Usuario registrado correctamente' });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const users = loadUsers();
  const user = users.find(u => u.email === email);

  if (!user)
    return res.status(400).json({ error: 'Usuario no encontrado' });

  if (!bcrypt.compareSync(password, user.password))
    return res.status(400).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign({ id: user.id }, req.app.get('jwtSecret'), {
    expiresIn: '7d'
  });

  return res.json({ token });
});

module.exports = router;
