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

// Obtener cajas del usuario
router.get('/', (req, res) => {
  const all = read();
  const s = getUserSettings(all, req.userId);
  res.json(s.savingsBoxes || []);
});

// Crear caja
router.post('/', (req, res) => {
  const { name, percent, manual } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const all = read();
  const s = getUserSettings(all, req.userId);

  const newBox = {
    id: Date.now(),
    name,
    percent: parseFloat(percent) || 0,
    manual: parseFloat(manual) || 0
  };

  s.savingsBoxes.push(newBox);
  write(all);

  const emitUserUpdate = req.app.get('emitUserUpdate');
  emitUserUpdate && emitUserUpdate(req.userId);

  res.json(newBox);
});

// Editar caja
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, percent, manual } = req.body;

  const all = read();
  const s = getUserSettings(all, req.userId);

  const box = s.savingsBoxes.find(b => b.id === id);
  if (!box) return res.status(404).json({ error: 'Caja no encontrada' });

  if (name !== undefined) box.name = name;
  if (percent !== undefined) box.percent = parseFloat(percent) || 0;
  if (manual !== undefined) box.manual = parseFloat(manual) || 0;

  write(all);

  const emitUserUpdate = req.app.get('emitUserUpdate');
  emitUserUpdate && emitUserUpdate(req.userId);

  res.json(box);
});

// Borrar caja
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);

  const all = read();
  const s = getUserSettings(all, req.userId);

  s.savingsBoxes = s.savingsBoxes.filter(b => b.id !== id);
  write(all);

  const emitUserUpdate = req.app.get('emitUserUpdate');
  emitUserUpdate && emitUserUpdate(req.userId);

  res.json({ success: true });
});

module.exports = router;
