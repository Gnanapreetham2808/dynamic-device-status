// Configuration
const API_BASE = `http://${window.location.hostname}:5000/api`;
const REFRESH_INTERVAL = 3000; // 3 seconds
const MAX_DATA_POINTS = 40;

// State
let charts = {};
let currentDeviceId = null;
let refreshTimer = null;

// Chart.js default config
Chart.defaults.color = '#9ca3af';
Chart.defaults.borderColor = '#2a3441';

// Initialize charts
function initCharts() {
    const chartConfig = {
        temperature: { color: '#ef4444', label: 'Temperature' },
        humidity: { color: '#3b82f6', label: 'Humidity' },
        vibration: { color: '#8b5cf6', label: 'Vibration' },
        voltage: { color: '#f59e0b', label: 'Voltage' },
        current: { color: '#10b981', label: 'Current' },
        rpm: { color: '#ec4899', label: 'RPM' },
        power: { color: '#06b6d4', label: 'Power' },
        noise: { color: '#6366f1', label: 'Noise' }
    };

    const canvasIds = ['tempChart', 'humidityChart', 'vibrationChart', 'voltageChart', 
                       'currentChart', 'rpmChart', 'powerChart', 'noiseChart'];
    
    const keys = Object.keys(chartConfig);

    canvasIds.forEach((canvasId, index) => {
        const key = keys[index];
        const config = chartConfig[key];
        const ctx = document.getElementById(canvasId).getContext('2d');

        charts[key] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: config.label,
                    data: [],
                    borderColor: config.color,
                    backgroundColor: `${config.color}20`,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1a1f2e',
                        titleColor: '#e4e7eb',
                        bodyColor: '#9ca3af',
                        borderColor: '#2a3441',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false
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
                            color: '#2a3441',
                            drawBorder: false
                        },
                        ticks: {
                            maxTicksLimit: 5,
                            font: { size: 11 }
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

// Update chart with new data
function updateChart(chartKey, value) {
    const chart = charts[chartKey];
    if (!chart) return;

    const dataset = chart.data.datasets[0];
    dataset.data.push(value);

    // Keep only last MAX_DATA_POINTS
    if (dataset.data.length > MAX_DATA_POINTS) {
        dataset.data.shift();
        chart.data.labels.shift();
    }

    chart.data.labels.push('');
    chart.update('none'); // Update without animation
}

// Update display value
function updateValue(id, value, decimals = 1) {
    const element = document.getElementById(id);
    if (element && value !== null && value !== undefined) {
        element.textContent = typeof value === 'number' ? value.toFixed(decimals) : '--';
    }
}

// Fetch and update readings
async function fetchReadings() {
    if (!currentDeviceId) return;

    try {
        const response = await fetch(`${API_BASE}/readings/device/${currentDeviceId}?limit=50`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const readings = await response.json();
        
        if (readings && readings.length > 0) {
            // Get latest reading for display values
            const latest = readings[readings.length - 1];
            
            updateValue('temp-value', latest.temperature);
            updateValue('humidity-value', latest.humidity);
            updateValue('vibration-value', latest.vibration, 2);
            updateValue('voltage-value', latest.voltage, 2);
            updateValue('current-value', latest.current, 2);
            updateValue('rpm-value', latest.rpm, 0);
            updateValue('power-value', latest.power_watts, 1);
            updateValue('noise-value', latest.noise_db, 1);

            // Update charts with latest value only (for smooth real-time updates)
            updateChart('temperature', latest.temperature);
            updateChart('humidity', latest.humidity);
            updateChart('vibration', latest.vibration);
            updateChart('voltage', latest.voltage);
            updateChart('current', latest.current);
            updateChart('rpm', latest.rpm);
            updateChart('power', latest.power_watts);
            updateChart('noise', latest.noise_db);

            // Update status
            document.getElementById('lastUpdate').textContent = 
                `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    } catch (error) {
        console.error('Failed to fetch readings:', error);
    }
}

// Load initial data (populate charts with historical data)
async function loadInitialData() {
    if (!currentDeviceId) return;

    try {
        const response = await fetch(`${API_BASE}/readings/device/${currentDeviceId}?limit=50`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const readings = await response.json();
        
        if (readings && readings.length > 0) {
            // Clear existing chart data
            Object.values(charts).forEach(chart => {
                chart.data.labels = [];
                chart.data.datasets[0].data = [];
            });

            // Populate with historical data
            readings.forEach(reading => {
                charts.temperature.data.datasets[0].data.push(reading.temperature);
                charts.humidity.data.datasets[0].data.push(reading.humidity);
                charts.vibration.data.datasets[0].data.push(reading.vibration);
                charts.voltage.data.datasets[0].data.push(reading.voltage);
                charts.current.data.datasets[0].data.push(reading.current);
                charts.rpm.data.datasets[0].data.push(reading.rpm);
                charts.power.data.datasets[0].data.push(reading.power_watts);
                charts.noise.data.datasets[0].data.push(reading.noise_db);
                
                Object.values(charts).forEach(chart => chart.data.labels.push(''));
            });

            // Update all charts
            Object.values(charts).forEach(chart => chart.update('none'));

            // Update display values
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
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
}

// Start auto-refresh
function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(fetchReadings, REFRESH_INTERVAL);
    
    document.querySelector('.status-indicator').classList.add('active');
    document.getElementById('statusText').textContent = 'Live';
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    
    document.querySelector('.status-indicator').classList.remove('active');
    document.getElementById('statusText').textContent = 'Paused';
}

// Fetch companies
async function loadCompanies() {
    try {
        const response = await fetch(`${API_BASE}/companies/`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const companies = await response.json();
        const select = document.getElementById('companySelect');
        
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.id;
            option.textContent = company.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load companies:', error);
    }
}

// Fetch devices for company
async function loadDevices(companyId) {
    try {
        const response = await fetch(`${API_BASE}/devices/company/${companyId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const devices = await response.json();
        const select = document.getElementById('deviceSelect');
        
        // Clear existing options
        select.innerHTML = '<option value="">-- Select Device --</option>';
        
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.device_id;
            option.textContent = device.device_name;
            select.appendChild(option);
        });
        
        select.disabled = false;
    } catch (error) {
        console.error('Failed to load devices:', error);
    }
}

// Event Listeners
document.getElementById('companySelect').addEventListener('change', async (e) => {
    const companyId = e.target.value;
    const deviceSelect = document.getElementById('deviceSelect');
    
    if (companyId) {
        await loadDevices(companyId);
    } else {
        deviceSelect.innerHTML = '<option value="">-- Select Device --</option>';
        deviceSelect.disabled = true;
        stopAutoRefresh();
        currentDeviceId = null;
        document.getElementById('statusText').textContent = 'No device selected';
    }
});

document.getElementById('deviceSelect').addEventListener('change', async (e) => {
    const deviceId = e.target.value;
    
    if (deviceId) {
        currentDeviceId = deviceId;
        document.getElementById('statusText').textContent = 'Loading...';
        
        // Load initial historical data
        await loadInitialData();
        
        // Start auto-refresh
        startAutoRefresh();
    } else {
        stopAutoRefresh();
        currentDeviceId = null;
        document.getElementById('statusText').textContent = 'No device selected';
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    initCharts();
    await loadCompanies();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    Object.values(charts).forEach(chart => chart.destroy());
});
