const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRouter = require('./routes/auth');
const movementsRouter = require('./routes/movements');
const settingsRouter = require('./routes/settings');
const savingsRouter = require('./routes/savings');

const SECRET = 'familyfund_super_secreto';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Guardamos io y secret en app
app.set('io', io);
app.set('jwtSecret', SECRET);

// Rutas públicas
app.use('/api/auth', authRouter);

// Middleware de autenticación HTTP
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Rutas protegidas
app.use('/api/movements', authMiddleware, movementsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/savings', authMiddleware, savingsRouter);

// Frontend estático
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Socket.IO: conexión y rooms por usuario
io.on('connection', socket => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) {
    socket.disconnect();
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    const userId = decoded.id;
    const room = `user-${userId}`;
    socket.join(room);
    console.log(`Socket conectado a room ${room}`);

    socket.on('disconnect', () => {
      console.log(`Socket desconectado de room ${room}`);
    });
  } catch (e) {
    socket.disconnect();
  }
});

// Helper para emitir cambios a un usuario
function emitUserUpdate(userId) {
  const room = `user-${userId}`;
  io.to(room).emit('dataUpdated');
}

app.set('emitUserUpdate', emitUserUpdate);

server.listen(PORT, () => {
  console.log(`Servidor FamilyFund en http://localhost:${PORT}`);
});
