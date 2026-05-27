const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const FILE = path.join(__dirname, '..', 'data', 'movements.json');

function read() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function write(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Obtener movimientos del usuario
router.get('/', (req, res) => {
  const all = read();
  const userMovements = all.filter(m => m.userId === req.userId);
  res.json(userMovements);
});

// Crear movimiento
router.post('/', (req, res) => {
  const all = read();
  const { description, amount, type } = req.body;

  const parsedAmount = parseFloat(amount);

  if (!description || isNaN(parsedAmount) || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const movement = {
    id: Date.now(),
    userId: req.userId,
    description,
    amount: type === 'expense' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
    type,
    date: new Date().toISOString()
  };

  all.push(movement);
  write(all);

  // Emitir actualización en tiempo real
  const emitUserUpdate = req.app.get('emitUserUpdate');
  emitUserUpdate && emitUserUpdate(req.userId);

  res.status(201).json(movement);
});

module.exports = router;
