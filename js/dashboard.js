let latencyData = [];
let speedData = [];
let devicesData = [];

let latencyChart, speedChart, devicesChart;
let protocolChart, domainChart;

let usarSimulados = false; // Cambia a true para usar datos simulados

function setModoSimulado(simulado) {
    usarSimulados = simulado;
}

function logout() {
    localStorage.removeItem("loggedIn");
    window.location.href = "/";
}

function initDashboard() {
    if (localStorage.getItem("loggedIn") !== "true") {
        alert("Acceso no autorizado.");
        window.location.href = "index.html";
        return;
    }

    document.getElementById("toggleSimulados").addEventListener("change", e => {
        setModoSimulado(e.target.checked);
        actualizarDesdeBackend();  // Actualiza inmediatamente con el modo cambiado
    });

    function crearGraficaLinea(id, label, color) {
        return new Chart(document.getElementById(id), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    borderColor: color,
                    backgroundColor: color + '22',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: false },
                    y: { beginAtZero: true }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // Crear gráficas de línea
    latencyChart = crearGraficaLinea("latencyChart", "Latencia", "#10B981");
    speedChart = crearGraficaLinea("speedChart", "Velocidad", "#3B82F6");
    devicesChart = crearGraficaLinea("devicesChart", "Dispositivos", "#F59E0B");

    // Crear gráficas de barras y pastel
    protocolChart = new Chart(document.getElementById('protocolChart'), {
        type: 'bar',
        data: {
            labels: ['HTTP', 'HTTPS', 'DNS', 'FTP', 'SSH'],
            datasets: [{
                label: 'Uso (%)',
                data: generarDatosProtocolos(),
                backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0', '#9966ff']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    domainChart = new Chart(document.getElementById('domainChart'), {
        type: 'pie',
        data: {
            labels: ['google.com', 'youtube.com', 'facebook.com', 'tiktok.com', 'x.com (twitter)'],
            datasets: [{
                data: generarDatosSitios(),
                backgroundColor: ['#fbbe0d', '#ff0808', '#106aff', '#08f7f0', '#080808']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Actualizar todo cada 5 segundos
    setInterval(() => {
        actualizarDesdeBackend();
        actualizarGraficasEstaticas();
        cargarTopSites();
    }, 5000);

    actualizarDesdeBackend();
    cargarTopSites();
}

async function actualizarDesdeBackend() {
    if (usarSimulados) {
        // Mostrar datos simulados
        const latenciaSimulada = Math.floor(Math.random() * 50) + 10;
        const velocidadSimulada = Math.floor(Math.random() * 40) + 20;
        const dispositivosSimulados = Math.floor(Math.random() * 10) + 5;

        document.getElementById("latency").textContent = `${latenciaSimulada} ms`;
        document.getElementById("speed").textContent = `${velocidadSimulada} Mbps`;
        document.getElementById("devices").textContent = dispositivosSimulados;

        actualizarGraficas(latencyChart, latencyData, latenciaSimulada);
        actualizarGraficas(speedChart, speedData, velocidadSimulada);
        actualizarGraficas(devicesChart, devicesData, dispositivosSimulados);

    } else {
        // Obtener datos reales
        try {
            const [lat, speed, devices] = await Promise.all([
                fetch('/api/latency').then(r => r.json()).catch(() => ({ latency: 0 })),
                fetch('/api/speed').then(r => r.json()).catch(() => ({ speed: 0 })),
                fetch('/api/devices').then(r => r.json()).catch(() => ({ devices: 0 }))
            ]);

            if (lat.latency !== 0) {
                document.getElementById("latency").textContent = `${lat.latency} ms`;
                actualizarGraficas(latencyChart, latencyData, lat.latency);
            }

            if (speed.speed !== 0) {
                document.getElementById("speed").textContent = `${speed.speed} Mbps`;
                actualizarGraficas(speedChart, speedData, speed.speed);
            }

            if (devices.devices !== 0) {
                document.getElementById("devices").textContent = devices.devices;
                actualizarGraficas(devicesChart, devicesData, devices.devices);
            }

            await cargarDispositivos();

        } catch (error) {
            console.error("Error actualizando desde backend:", error);
        }
    }
}

// Genera datos simulados solo para gráficas estáticas
function generarDatosProtocolos() {
    return [
        Math.floor(Math.random() * 30) + 10,  // HTTP
        Math.floor(Math.random() * 40) + 30,  // HTTPS
        Math.floor(Math.random() * 10) + 5,   // DNS
        Math.floor(Math.random() * 5),        // FTP
        Math.floor(Math.random() * 5)         // SSH
    ];
}

function generarDatosSitios() {
    return [
        Math.floor(Math.random() * 50) + 20,
        Math.floor(Math.random() * 40) + 10,
        Math.floor(Math.random() * 30) + 10,
        Math.floor(Math.random() * 20),
        Math.floor(Math.random() * 15)
    ];
}

// Actualiza las gráficas de barras y pastel
function actualizarGraficasEstaticas() {
    protocolChart.data.datasets[0].data = generarDatosProtocolos();
    domainChart.data.datasets[0].data = generarDatosSitios();
    protocolChart.update();
    domainChart.update();
}

// Agrega nuevo valor a una gráfica de línea (latencia, velocidad, dispositivos)
function actualizarGraficas(chart, array, valor) {
    if (array.length >= 10) array.shift(); // mantener 10 valores
    array.push(valor);
    chart.data.labels = array.map(() => ""); // ocultar eje X
    chart.data.datasets[0].data = array;
    chart.update();
}

async function cargarDispositivos() {
    try {
        const response = await fetch('/api/devices/list');
        const data = await response.json();

        const tbody = document.getElementById('tabla-dispositivos');
        tbody.innerHTML = ''; // Limpiar tabla

        // Verifica que data.devices sea arreglo antes de iterar
        if (Array.isArray(data.devices)) {
            data.devices.forEach(disp => {
                const fila = document.createElement('tr');

                fila.innerHTML = `
                    <td>${disp.ip}</td>
                    <td>${disp.mac}</td>
                    <td>${disp.nombre}</td>
                `;

                tbody.appendChild(fila);
            });
        } else {
            console.warn("No es un arreglo:", data.devices);
        }
    } catch (error) {
        console.error("Error cargando dispositivos:", error);
    }
}

async function cargarTopSites() {
    try {
        const res = await fetch("/api/top-sites");
        const data = await res.json();

        const tbody = document.getElementById("tabla-top-sitios");
        tbody.innerHTML = "";

        data.sites.forEach(site => {
            const fila = document.createElement("tr");
            fila.classList.add("border-b", "border-gray-700");

            fila.innerHTML = `
                <td class="py-2">${site.domain}</td>
                <td class="py-2"><span class="bg-green-600 text-xs px-2 py-1 rounded">${site.protocol}</span></td>
                <td class="py-2">${site.visits}</td>
                <td class="py-2">${site.traffic}</td>
                <td class="py-2"><span class="bg-green-600 text-xs px-2 py-1 rounded">${site.status}</span></td>
            `;
            tbody.appendChild(fila);
        });
    } catch (e) {
        console.error("Error al cargar top sites:", e);
    }
}

initDashboard();