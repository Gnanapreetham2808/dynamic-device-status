const API_BASE = `http://${window.location.hostname}:5000/api`;
const CHART_REFRESH_INTERVAL = 3000;
const MAX_DATA_POINTS = 40;

let currentCompanyId = null;
let devicesCache = [];
let pollHandle = null;
let autoRefresh = true;
let paused = false; // pause independent of autoRefresh checkbox
let statusFilter = 'all'; // all | online | offline
let searchTerm = '';

// Chart state
let charts = {};
let currentDeviceId = null;
let currentDeviceName = '';
let chartRefreshTimer = null;

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

  // Summary counts
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const totalCount = devices.length;
  const summaryEl = qs('#summaryCounts');
  if(summaryEl){
    summaryEl.textContent = `${onlineCount} online / ${totalCount} total`;
  }

  filtered.forEach(d => {
    const card = document.createElement('div');
    card.className = `card card--${d.status}`;
    card.style.cursor = 'pointer';
    card.dataset.deviceId = d.device_id;
    card.dataset.deviceName = d.device_name;
    
    const badgeCls = d.status === 'online' ? 'badge badge--online' : 'badge badge--offline';
    // Build sparkline placeholder (random small bars for now)
    const bars = Array.from({length:8},()=> Math.random());
    const sparkHTML = `<div class="sparkline">${bars.map(v => `<div class="sparkline__bar" style="height:${8+Math.round(v*20)}px"></div>`).join('')}</div>`;
    card.innerHTML = `
      <div class="card__top">
        <div class="card__name">${d.device_name}</div>
        <span class="${badgeCls}">${d.status}</span>
      </div>
      <div class="card__meta">
        <span class="ago">Last seen: ${fmtTime(d.last_read_at)}</span>
        <span>ID: ${d.device_id}</span>
      </div>
      ${sparkHTML}
    `;
    
    // Add click handler to open charts
    card.addEventListener('click', () => {
      openDeviceCharts(d.device_id, d.device_name);
    });
    
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
  if (!autoRefresh || paused) return;
  pollHandle = setInterval(()=>{ if(!paused) refreshDevices(); }, 10000);
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

  const pauseBtn = qs('#pauseBtn');
  pauseBtn.addEventListener('click', ()=>{
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if(!paused){
      refreshDevices();
    }
    startPolling();
  });

  qs('#closeChartsBtn').addEventListener('click', closeDeviceCharts);
  
  const dashboardBtn = qs('#dashboardBtn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      console.log('Dashboard button clicked', devicesCache);
      if (devicesCache.length > 0) {
        // Open dashboard with first device
        const firstDevice = devicesCache[0];
        console.log('Opening charts for:', firstDevice);
        openDeviceCharts(firstDevice.device_id, firstDevice.device_name);
      } else {
        toast('Please select a company first');
      }
    });
  }
}

// Charts functionality
function initCharts() {
  if (Object.keys(charts).length > 0) return; // Already initialized

  Chart.defaults.color = '#9ca3af';
  Chart.defaults.borderColor = '#1e293b';

  const chartConfig = {
    temperature: { 
      color: '#ef4444',
      gradient: ['#ef4444', '#dc2626'],
      label: 'Temperature',
      glow: 'rgba(239, 68, 68, 0.5)'
    },
    humidity: { 
      color: '#3b82f6',
      gradient: ['#3b82f6', '#2563eb'],
      label: 'Humidity',
      glow: 'rgba(59, 130, 246, 0.5)'
    },
    vibration: { 
      color: '#8b5cf6',
      gradient: ['#8b5cf6', '#7c3aed'],
      label: 'Vibration',
      glow: 'rgba(139, 92, 246, 0.5)'
    },
    voltage: { 
      color: '#f59e0b',
      gradient: ['#f59e0b', '#d97706'],
      label: 'Voltage',
      glow: 'rgba(245, 158, 11, 0.5)'
    },
    current: { 
      color: '#10b981',
      gradient: ['#10b981', '#059669'],
      label: 'Current',
      glow: 'rgba(16, 185, 129, 0.5)'
    },
    rpm: { 
      color: '#ec4899',
      gradient: ['#ec4899', '#db2777'],
      label: 'RPM',
      glow: 'rgba(236, 72, 153, 0.5)'
    },
    power: { 
      color: '#06b6d4',
      gradient: ['#06b6d4', '#0891b2'],
      label: 'Power',
      glow: 'rgba(6, 182, 212, 0.5)'
    },
    noise: { 
      color: '#6366f1',
      gradient: ['#6366f1', '#4f46e5'],
      label: 'Noise',
      glow: 'rgba(99, 102, 241, 0.5)'
    }
  };

  const canvasIds = ['tempChart', 'humidityChart', 'vibrationChart', 'voltageChart', 
                     'currentChart', 'rpmChart', 'powerChart', 'noiseChart'];
  
  const keys = Object.keys(chartConfig);

  canvasIds.forEach((canvasId, index) => {
    const key = keys[index];
    const config = chartConfig[key];
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, `${config.color}40`);
    gradient.addColorStop(1, `${config.color}05`);

    charts[key] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: config.label,
          data: [],
          borderColor: config.color,
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: config.color,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowBlur: 8,
          shadowColor: config.glow
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750,
          easing: 'easeInOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: config.color,
            borderWidth: 2,
            padding: 12,
            displayColors: false,
            cornerRadius: 8,
            titleFont: {
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              size: 14,
              weight: '600'
            },
            callbacks: {
              title: () => config.label,
              label: (context) => {
                return ` ${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: false,
            grid: { display: false }
          },
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(30, 41, 59, 0.5)',
              drawBorder: false,
              lineWidth: 1
            },
            border: {
              display: false
            },
            ticks: {
              maxTicksLimit: 5,
              font: { 
                size: 11,
                weight: '500'
              },
              color: '#64748b',
              padding: 8
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  });
}

function updateChart(chartKey, value) {
  const chart = charts[chartKey];
  if (!chart) return;

  const dataset = chart.data.datasets[0];
  dataset.data.push(value);

  if (dataset.data.length > MAX_DATA_POINTS) {
    dataset.data.shift();
    chart.data.labels.shift();
  }

  chart.data.labels.push('');
  chart.update('none');
}

// Track sensor history for min/max/trend calculations
const sensorHistory = {};

function updateValue(id, value, decimals = 1) {
  const element = document.getElementById(id);
  if (element && value !== null && value !== undefined) {
    const formattedValue = typeof value === 'number' ? value.toFixed(decimals) : '--';
    element.textContent = formattedValue;
    
    // Extract sensor name from id (e.g., "temp-value" -> "temp")
    const sensor = id.replace('-value', '');
    
    // Only track numeric values for stats
    if (typeof value === 'number') {
      // Initialize history array if needed
      if (!sensorHistory[sensor]) {
        sensorHistory[sensor] = [];
      }
      
      const history = sensorHistory[sensor];
      history.push(value);
      
      // Keep only last 50 readings for min/max
      if (history.length > 50) {
        history.shift();
      }
      
      // Calculate and update min/max/trend
      if (history.length >= 2) {
        const min = Math.min(...history);
        const max = Math.max(...history);
        
        const minEl = document.getElementById(`${sensor}-min`);
        const maxEl = document.getElementById(`${sensor}-max`);
        
        if (minEl) minEl.textContent = min.toFixed(decimals);
        if (maxEl) maxEl.textContent = max.toFixed(decimals);
        
        // Calculate trend (compare last 2 values)
        const previous = history[history.length - 2];
        const current = history[history.length - 1];
        const trendEl = document.getElementById(`${sensor}-trend`);
        
        if (trendEl) {
          if (current > previous) {
            trendEl.textContent = '↑';
            trendEl.className = 'stat-trend up';
          } else if (current < previous) {
            trendEl.textContent = '↓';
            trendEl.className = 'stat-trend down';
          } else {
            trendEl.textContent = '→';
            trendEl.className = 'stat-trend';
          }
        }
      }
    }
  }
}

async function fetchReadings() {
  if (!currentDeviceId) {
    console.log('No device ID selected');
    return;
  }

  try {
    console.log('Fetching readings for device:', currentDeviceId);
    const response = await fetch(`${API_BASE}/devices/readings/device/${currentDeviceId}?limit=50`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const readings = await response.json();
    console.log('Received readings:', readings.length, 'records');
    
    if (readings && readings.length > 0) {
      const latest = readings[readings.length - 1];
      console.log('Latest reading:', latest);
      
      updateValue('temp-value', latest.temperature);
      updateValue('humidity-value', latest.humidity);
      updateValue('vibration-value', latest.vibration, 2);
      updateValue('voltage-value', latest.voltage, 2);
      updateValue('current-value', latest.current, 2);
      updateValue('rpm-value', latest.rpm, 0);
      updateValue('power-value', latest.power_watts, 1);
      updateValue('noise-value', latest.noise_db, 1);

      updateChart('temperature', latest.temperature);
      updateChart('humidity', latest.humidity);
      updateChart('vibration', latest.vibration);
      updateChart('voltage', latest.voltage);
      updateChart('current', latest.current);
      updateChart('rpm', latest.rpm);
      updateChart('power', latest.power_watts);
      updateChart('noise', latest.noise_db);
    } else {
      console.warn('No readings data received');
    }
  } catch (err) {
    console.error('Error fetching readings:', err);
  }
}

async function loadInitialData() {
  if (!currentDeviceId) return;

  try {
    const response = await fetch(`${API_BASE}/devices/readings/device/${currentDeviceId}?limit=50`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const readings = await response.json();
    
    if (readings && readings.length > 0) {
      // Clear existing chart data
      Object.values(charts).forEach(chart => {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
      });

      // Load all historical data
      readings.forEach(reading => {
        updateChart('temperature', reading.temperature);
        updateChart('humidity', reading.humidity);
        updateChart('vibration', reading.vibration);
        updateChart('voltage', reading.voltage);
        updateChart('current', reading.current);
        updateChart('rpm', reading.rpm);
        updateChart('power', reading.power_watts);
        updateChart('noise', reading.noise_db);
      });

      // Update current values with latest reading
      const latest = readings[readings.length - 1];
      updateValue('temp-value', latest.temperature);
      updateValue('humidity-value', latest.humidity);
      updateValue('vibration-value', latest.vibration, 2);
      updateValue('voltage-value', latest.voltage, 2);
      updateValue('current-value', latest.current, 2);
      updateValue('rpm-value', latest.rpm, 0);
      updateValue('power-value', latest.power_watts, 1);
      updateValue('noise-value', latest.noise_db, 1);
    }
  } catch (err) {
    console.error('Error loading initial data:', err);
  }
}

function startChartRefresh() {
  if (chartRefreshTimer) clearInterval(chartRefreshTimer);
  chartRefreshTimer = setInterval(fetchReadings, CHART_REFRESH_INTERVAL);
}

function stopChartRefresh() {
  if (chartRefreshTimer) {
    clearInterval(chartRefreshTimer);
    chartRefreshTimer = null;
  }
}

function openDeviceCharts(deviceId, deviceName) {
  console.log('openDeviceCharts called with:', deviceId, deviceName);
  
  currentDeviceId = deviceId;
  currentDeviceName = deviceName;

  // Hide device grid and show charts
  qs('#devicesGrid').classList.add('hidden');
  qs('#emptyState').classList.add('hidden');
  qs('.toolbar').classList.add('hidden');
  qs('.legend').classList.add('hidden');
  
  const chartsSection = qs('#chartsSection');
  if (!chartsSection) {
    console.error('Charts section not found!');
    return;
  }
  chartsSection.classList.remove('hidden');
  
  const deviceNameEl = qs('#selectedDeviceName');
  if (deviceNameEl) deviceNameEl.textContent = deviceName;

  // Initialize charts if first time
  try {
    initCharts();
  } catch (err) {
    console.error('Error initializing charts:', err);
    toast('Error initializing charts');
    return;
  }

  // Load initial data and start refresh
  loadInitialData();
  startChartRefresh();

  // Stop device polling while viewing charts
  if (pollHandle) clearInterval(pollHandle);
}

function closeDeviceCharts() {
  stopChartRefresh();
  currentDeviceId = null;
  currentDeviceName = '';

  // Show device grid and hide charts
  qs('#chartsSection').classList.add('hidden');
  qs('#devicesGrid').classList.remove('hidden');
  qs('.toolbar').classList.remove('hidden');
  qs('.legend').classList.remove('hidden');

  // Restart device polling
  startPolling();
}

// Theme toggle
function initThemeToggle() {
  const themeToggle = qs('#themeToggle');
  const savedTheme = localStorage.getItem('theme');
  
  // Apply saved theme
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }
  
  // Toggle theme
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      const isLight = document.body.classList.contains('light-mode');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      
      // Update chart colors if charts are open
      if (currentDeviceId && charts) {
        updateChartTheme();
      }
    });
  }
}

function updateChartTheme() {
  const isLight = document.body.classList.contains('light-mode');
  const textColor = isLight ? '#0f172a' : '#e5e7eb';
  const gridColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  
  Object.values(charts).forEach(chart => {
    if (chart && chart.options) {
      chart.options.scales.y.ticks.color = textColor;
      chart.options.scales.y.grid.color = gridColor;
      chart.options.scales.x.ticks.color = textColor;
      chart.options.scales.x.grid.color = gridColor;
      chart.update('none');
    }
  });
}

// Init
document.addEventListener('DOMContentLoaded', async ()=>{
  initThemeToggle();
  await loadCompanies();
  wireEvents();
});
