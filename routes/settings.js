const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const FILE = path.join(__dirname, '..', 'data', 'settings.json');

function read() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function write(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getUserSettings(all, userId) {
  let s = all.find(x => x.userId === userId);
  if (!s) {
    s = {
      userId,
      maxCapacity: null,
      savingsPercent: 0,
      savingsManual: 0,
      savingsBoxes: []
    };
    all.push(s);
  }
  return s;
}

// Obtener configuración del usuario
router.get('/', (req, res) => {
  const all = read();
  const s = getUserSettings(all, req.userId);
  res.json(s);
});

// Guardar configuración general
router.post('/', (req, res) => {
  const { maxCapacity, savingsPercent, savingsManual } = req.body;
  const all = read();
  const s = getUserSettings(all, req.userId);

  if (maxCapacity !== undefined) {
    const parsedMax = parseFloat(maxCapacity);
    if (!parsedMax || parsedMax <= 0) {
      return res.status(400).json({ error: 'Capacidad inválida' });
    }
    s.maxCapacity = parsedMax;
  }

  if (savingsPercent !== undefined) {
    const parsedPercent = parseFloat(savingsPercent);
    if (isNaN(parsedPercent) || parsedPercent < 0) {
      return res.status(400).json({ error: 'Porcentaje de ahorro inválido' });
    }
    s.savingsPercent = parsedPercent;
  }

  if (savingsManual !== undefined) {
    const parsedManual = parseFloat(savingsManual);
    if (isNaN(parsedManual) || parsedManual < 0) {
      return res.status(400).json({ error: 'Ahorro manual inválido' });
    }
    s.savingsManual = parsedManual;
  }

  write(all);

  const emitUserUpdate = req.app.get('emitUserUpdate');
  emitUserUpdate && emitUserUpdate(req.userId);

  res.json(s);
});

module.exports = router;
