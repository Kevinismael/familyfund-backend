const API_BASE = 'http://localhost:3000/api';
const API_AUTH = `${API_BASE}/auth`;
const API_MOV = `${API_BASE}/movements`;
const API_SET = `${API_BASE}/settings`;
const API_SAV = `${API_BASE}/savings`;

let token = null;
let currentUser = null;

let maxCapacity = null;
let saldoActual = 0;
let movements = [];
let chart = null;

let savingsPercent = 0;
let savingsManual = 0;
let savingsBoxes = [];

let socket = null;

// DOM
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const familyLabel = document.getElementById('familyLabel');
const btnLogout = document.getElementById('btnLogout');

const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const btnLogin = document.getElementById('btnLogin');
const loginError = document.getElementById('loginError');

const registerFamily = document.getElementById('registerFamily');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const btnRegister = document.getElementById('btnRegister');
const registerError = document.getElementById('registerError');

const tankWater = document.getElementById('tank-water');
const saldoText = document.getElementById('saldoText');
const capacidadText = document.getElementById('capacidadText');
const ahorroText = document.getElementById('ahorroText');
const totalesText = document.getElementById('totalesText');
const modal = document.getElementById('modal');
const maxInput = document.getElementById('maxInput');
const list = document.getElementById('movementList');

const savingsSummary = document.getElementById('savingsSummary');
const savingsPercentInput = document.getElementById('savingsPercentInput');
const savingsManualInput = document.getElementById('savingsManualInput');

const boxNameInput = document.getElementById('boxName');
const boxPercentInput = document.getElementById('boxPercent');
const boxManualInput = document.getElementById('boxManual');
const boxesList = document.getElementById('boxesList');

const descInput = document.getElementById('description');
const amountInput = document.getElementById('amount');

// Helpers sesión
function saveSession(t, user) {
  token = t;
  currentUser = user;
  localStorage.setItem('ff_token', t);
  localStorage.setItem('ff_user', JSON.stringify(user));
}

function loadSession() {
  const t = localStorage.getItem('ff_token');
  const u = localStorage.getItem('ff_user');
  if (t && u) {
    token = t;
    currentUser = JSON.parse(u);
    return true;
  }
  return false;
}

function clearSession() {
  token = null;
  currentUser = null;
  localStorage.removeItem('ff_token');
  localStorage.removeItem('ff_user');
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

async function authFetch(url, options = {}) {
  if (!token) throw new Error('No token');
  const headers = options.headers || {};
  headers['Authorization'] = `Bearer ${token}`;
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  return fetch(url, { ...options, headers });
}

// Tabs auth
tabLogin.onclick = () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
};

tabRegister.onclick = () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
};

// Login
btnLogin.onclick = async () => {
  loginError.textContent = '';
  try {
    const res = await fetch(`${API_AUTH}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginEmail.value.trim(),
        password: loginPassword.value
      })
    });
    const data = await res.json();
    if (!res.ok) {
      loginError.textContent = data.error || 'Error al iniciar sesión';
      return;
    }
    saveSession(data.token, data.user);
    await enterApp();
  } catch (e) {
    loginError.textContent = 'Error de conexión';
  }
};

// Registro
btnRegister.onclick = async () => {
  registerError.textContent = '';
  try {
    const res = await fetch(`${API_AUTH}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familyName: registerFamily.value.trim(),
        email: registerEmail.value.trim(),
        password: registerPassword.value
      })
    });
    const data = await res.json();
    if (!res.ok) {
      registerError.textContent = data.error || 'Error al registrarse';
      return;
    }
    saveSession(data.token, data.user);
    await enterApp();
  } catch (e) {
    registerError.textContent = 'Error de conexión';
  }
};

// Logout
btnLogout.onclick = () => {
  clearSession();
  appContainer.classList.add('hidden');
  authContainer.classList.remove('hidden');
};

// Conectar Socket.IO
function connectSocket() {
  if (!token) return;
  if (socket) socket.disconnect();

  socket = io('http://localhost:3000', {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('Socket conectado');
  });

  socket.on('disconnect', () => {
    console.log('Socket desconectado');
  });

  // Cuando el backend emite dataUpdated, recargamos datos
  socket.on('dataUpdated', async () => {
    console.log('Actualización en tiempo real recibida');
    await reloadAllData();
  });
}

// Entrar a la app
async function enterApp() {
  authContainer.classList.add('hidden');
  appContainer.classList.remove('hidden');
  familyLabel.textContent = `Familia: ${currentUser.familyName} (${currentUser.email})`;

  connectSocket();
  await initAppData();
}

// Init app
async function initAppData() {
  await loadSettings();
  await loadSavingsBoxes();
  await loadMovements();

  if (!maxCapacity) {
    modal.style.display = 'flex';
  } else {
    updateAll();
  }
}

async function reloadAllData() {
  await loadSettings();
  await loadSavingsBoxes();
  await loadMovements();
  updateAll();
}

// Settings
async function loadSettings() {
  const res = await authFetch(API_SET);
  const data = await res.json();
  maxCapacity = data.maxCapacity;
  savingsPercent = data.savingsPercent || 0;
  savingsManual = data.savingsManual || 0;

  if (maxCapacity) {
    capacidadText.textContent = `Capacidad máxima: € ${maxCapacity}`;
  } else {
    capacidadText.textContent = 'Capacidad máxima: —';
  }

  savingsPercentInput.value = savingsPercent;
  savingsManualInput.value = savingsManual;
}

document.getElementById('saveMax').onclick = async () => {
  const value = parseFloat(maxInput.value);
  if (!value || value <= 0) return;

  const res = await authFetch(API_SET, {
    method: 'POST',
    body: JSON.stringify({ maxCapacity: value })
  });

  const data = await res.json();
  maxCapacity = data.maxCapacity;
  capacidadText.textContent = `Capacidad máxima: € ${maxCapacity}`;
  modal.style.display = 'none';
  updateAll();
};

document.getElementById('saveSavings').onclick = async () => {
  const percentVal = parseFloat(savingsPercentInput.value) || 0;
  const manualVal = parseFloat(savingsManualInput.value) || 0;

  const res = await authFetch(API_SET, {
    method: 'POST',
    body: JSON.stringify({
      savingsPercent: percentVal,
      savingsManual: manualVal
    })
  });

  const data = await res.json();
  savingsPercent = data.savingsPercent;
  savingsManual = data.savingsManual;

  updateAll();
};

// Cajas de ahorro
async function loadSavingsBoxes() {
  const res = await authFetch(API_SAV);
  savingsBoxes = await res.json();
  renderBoxes();
}

function renderBoxes() {
  boxesList.innerHTML = '';
  savingsBoxes.forEach(box => {
    const li = document.createElement('li');
    li.className = 'box-item';

    const title = document.createElement('span');
    title.textContent = box.name;

    const details = document.createElement('span');
    details.textContent =
      `Auto: ${box.percent}% — Manual: € ${box.manual.toFixed(2)}`;

    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Eliminar';
    btnDelete.onclick = async () => {
      await authFetch(`${API_SAV}/${box.id}`, { method: 'DELETE' });
      // El backend emitirá dataUpdated y se recargará solo
    };

    li.appendChild(title);
    li.appendChild(details);
    li.appendChild(btnDelete);
    boxesList.appendChild(li);
  });
}

document.getElementById('addBox').onclick = async () => {
  const name = boxNameInput.value.trim();
  const percent = parseFloat(boxPercentInput.value) || 0;
  const manual = parseFloat(boxManualInput.value) || 0;

  if (!name) return;

  await authFetch(API_SAV, {
    method: 'POST',
    body: JSON.stringify({ name, percent, manual })
  });

  boxNameInput.value = '';
  boxPercentInput.value = '';
  boxManualInput.value = '';
  // El backend emitirá dataUpdated y se recargará solo
};

// Movimientos
async function loadMovements() {
  const res = await authFetch(API_MOV);
  movements = await res.json();
  recalc();
  renderList();
  updateChart();
}

function recalc() {
  saldoActual = movements.reduce((acc, m) => acc + m.amount, 0);

  const now = new Date();
  const currentYear = now.getFullYear();

  let totalIncomeYear = 0;
  let totalExpenseYear = 0;

  movements.forEach(m => {
    const d = new Date(m.date || now);
    if (d.getFullYear() === currentYear) {
      if (m.amount > 0) totalIncomeYear += m.amount;
      else totalExpenseYear += Math.abs(m.amount);
    }
  });

  saldoText.textContent = `Saldo actual: € ${saldoActual.toFixed(2)}`;
  totalesText.textContent =
    `Ingresos año: € ${totalIncomeYear.toFixed(2)} — Gastos año: € ${totalExpenseYear.toFixed(2)}`;

  let ahorroPorcentaje = 0;
  if (totalIncomeYear > 0) {
    ahorroPorcentaje = (saldoActual / totalIncomeYear) * 100;
  }
  ahorroText.textContent =
    `Ahorro: ${ahorroPorcentaje.toFixed(1)}% del total ingresado`;

  const autoSavingsGeneral = totalIncomeYear * (savingsPercent / 100);
  const totalGeneral = autoSavingsGeneral + savingsManual;

  let autoBoxes = 0;
  let manualBoxes = 0;
  savingsBoxes.forEach(box => {
    autoBoxes += totalIncomeYear * (box.percent / 100);
    manualBoxes += box.manual;
  });

  const totalSavings = totalGeneral + autoBoxes + manualBoxes;

  let savingsPercentOfIncome = 0;
  if (totalIncomeYear > 0) {
    savingsPercentOfIncome = (totalSavings / totalIncomeYear) * 100;
  }

  savingsSummary.textContent =
    `Ahorro total: € ${totalSavings.toFixed(2)} (${savingsPercentOfIncome.toFixed(1)}% del total ingresado)`;
}

function renderList() {
  list.innerHTML = '';
  movements
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(m => {
      const li = document.createElement('li');
      li.textContent = `${m.description}`;
      const span = document.createElement('span');
      span.textContent = `€ ${m.amount.toFixed(2)}`;

      if (m.amount < 0) li.classList.add('negative');
      else li.classList.add('positive');

      li.appendChild(span);
      list.appendChild(li);
    });
}

// Tanque
function updateTank() {
  if (!maxCapacity) return;

  const nivel = Math.min((saldoActual / maxCapacity) * 100, 100);
  const safeNivel = isNaN(nivel) ? 0 : nivel;
  tankWater.style.width = safeNivel + '%';

  if (saldoActual < 500) {
    tankWater.style.background = '#ff3b3b';
  } else if (saldoActual < 1000) {
    tankWater.style.background = '#ffcc00';
  } else {
    tankWater.style.background = '#1e90ff';
  }
}

// Gráfico anual
function updateChart() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const monthsIncome = Array(12).fill(0);
  const monthsExpense = Array(12).fill(0);

  movements.forEach(m => {
    const d = new Date(m.date || now);
    if (d.getFullYear() === currentYear) {
      const month = d.getMonth();
      if (m.amount > 0) monthsIncome[month] += m.amount;
      else monthsExpense[month] += Math.abs(m.amount);
    }
  });

  const ctx = document.getElementById('yearChart').getContext('2d');

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
      datasets: [
        {
          label: 'Ingresos',
          data: monthsIncome,
          backgroundColor: 'rgba(46, 204, 113, 0.7)'
        },
        {
          label: 'Gastos',
          data: monthsExpense,
          backgroundColor: 'rgba(231, 76, 60, 0.7)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#ffffff' } }
      },
      scales: {
        x: {
          ticks: { color: '#ffffff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          ticks: { color: '#ffffff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    }
  });
}

// Actualizar todo
function updateAll() {
  recalc();
  updateTank();
  updateChart();
}

// Movimientos: botones
document.getElementById('btnIngreso').onclick = () => handleMovement('income');
document.getElementById('btnGasto').onclick = () => handleMovement('expense');

async function handleMovement(type) {
  const description = descInput.value.trim();
  const amount = parseFloat(amountInput.value);

  if (!description || !amount || amount <= 0) return;

  await authFetch(API_MOV, {
    method: 'POST',
    body: JSON.stringify({ description, amount, type })
  });

  descInput.value = '';
  amountInput.value = '';
  // El backend emitirá dataUpdated y se recargará solo
}

// Botón ajustes
document.getElementById('btnAjustes').onclick = () => {
  maxInput.value = maxCapacity || '';
  modal.style.display = 'flex';
};

// Cerrar modal clickeando afuera
modal.addEventListener('click', e => {
  if (e.target === modal) modal.style.display = 'none';
});

// Inicio
(async function start() {
  const hasSession = loadSession();
  if (hasSession) {
    await enterApp();
  }
})();
