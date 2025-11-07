const API_BASE = "http://localhost:5000/api";
let currentCompanyId = null;
let devicesCache = [];
let pollHandle = null;
let autoRefresh = true;
let statusFilter = 'all'; // all | online | offline
let searchTerm = '';

// Fetch
async function getJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
const getCompanies = () => getJSON(`${API_BASE}/companies/`);
const getDevices = (companyId) => getJSON(`${API_BASE}/devices/company/${companyId}`);

// UI helpers
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString() : 'never';
const nowStr = () => new Date().toLocaleTimeString();

function setLastUpdated(){
  const el = qs('#lastUpdated');
  if (el) el.textContent = `Updated ${nowStr()}`;
}

function setLoading(show){
  const skeleton = qs('#loading');
  const grid = qs('#devicesGrid');
  if (show){
    grid.innerHTML = '';
    skeleton.innerHTML = '';
    for (let i=0;i<6;i++){
      const s = document.createElement('div');
      s.className = 'skeleton';
      skeleton.appendChild(s);
    }
    skeleton.classList.remove('hidden');
  } else {
    skeleton.classList.add('hidden');
    skeleton.innerHTML = '';
  }
}

function toast(msg){
  const wrap = qs('#toast');
  const div = document.createElement('div');
  div.className = 'toast__msg';
  div.textContent = msg;
  wrap.appendChild(div);
  setTimeout(()=> div.remove(), 3500);
}

// Renderers
function renderCompanyOptions(companies){
  const sel = qs('#companySelect');
  sel.innerHTML = '';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Choose company --';
  sel.appendChild(defaultOpt);
  companies.forEach(c=>{
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.name;
    sel.appendChild(o);
  });
}

function applyFilters(list){
  let out = list;
  if (statusFilter !== 'all') out = out.filter(d => d.status === statusFilter);
  if (searchTerm.trim()){
    const s = searchTerm.trim().toLowerCase();
    out = out.filter(d => (d.device_name || '').toLowerCase().includes(s));
  }
  return out;
}

function renderDevices(devices){
  devicesCache = devices;
  const grid = qs('#devicesGrid');
  grid.innerHTML = '';
  const filtered = applyFilters(devices);

  qs('#emptyState').classList.toggle('hidden', filtered.length !== 0);

  filtered.forEach(d => {
    const card = document.createElement('div');
    card.className = 'card';
    const badgeCls = d.status === 'online' ? 'badge badge--online' : 'badge badge--offline';
    card.innerHTML = `
      <div class="card__top">
        <div class="card__name">${d.device_name}</div>
        <span class="${badgeCls}">${d.status}</span>
      </div>
      <div class="card__meta">
        <span class="ago">Last seen: ${fmtTime(d.last_read_at)}</span>
        <span>ID: ${d.device_id}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Data flow
async function loadCompanies(){
  setLoading(true);
  try{
    const companies = await getCompanies();
    renderCompanyOptions(companies);
  } finally {
    setLoading(false);
  }
}

async function refreshDevices(){
  if (!currentCompanyId) return;
  setLoading(true);
  try{
    const newDevices = await getDevices(currentCompanyId);
    // Notify if any device flipped offline->online
    const prev = Object.fromEntries((devicesCache||[]).map(d => [d.device_id, d.status]));
    newDevices.forEach(d => {
      if (prev[d.device_id] === 'offline' && d.status === 'online') {
        toast(`${d.device_name} is now online`);
      }
    });
    renderDevices(newDevices);
    setLastUpdated();
  } finally {
    setLoading(false);
  }
}

function startPolling(){
  if (pollHandle) clearInterval(pollHandle);
  if (!autoRefresh) return;
  pollHandle = setInterval(refreshDevices, 10000);
}

// Events
function wireEvents(){
  qs('#companySelect').addEventListener('change', async (e)=>{
    currentCompanyId = e.target.value;
    await refreshDevices();
    startPolling();
  });

  qs('#refreshBtn').addEventListener('click', refreshDevices);

  qsa('.btn-group .btn').forEach(btn => btn.addEventListener('click', (e)=>{
    qsa('.btn-group .btn').forEach(b => b.classList.remove('is-active'));
    e.currentTarget.classList.add('is-active');
    statusFilter = e.currentTarget.getAttribute('data-filter');
    renderDevices(devicesCache);
  }));

  qs('#searchInput').addEventListener('input', (e)=>{
    searchTerm = e.target.value;
    renderDevices(devicesCache);
  });

  qs('#autoRefresh').addEventListener('change', (e)=>{
    autoRefresh = e.target.checked;
    startPolling();
  });
}

// Init
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadCompanies();
  wireEvents();
});
