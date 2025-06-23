from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from scapy.all import ARP, Ether, srp
from speedtest import SpeedtestBestServerFailure
from backend.dns_monitor import iniciar_monitoreo_dns, obtener_top_dominios

import subprocess
import speedtest
import re
import os
import socket
import httpx
import dotenv

# Cargar variables de entorno desde .env
dotenv.load_dotenv()
API_KEY = os.getenv("API_KEY")

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

RED = "192.168.0.1/24"

templates = Jinja2Templates(directory=os.path.join(BASE_DIR))

estilos = os.path.join(BASE_DIR, "css")
javaScript = os.path.join(BASE_DIR, "js")
componentes = os.path.join(BASE_DIR, "components")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/css", StaticFiles(directory=estilos), name="css")
app.mount("/js", StaticFiles(directory=javaScript), name="js")
app.mount("/components", StaticFiles(directory=componentes), name="components")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/latency")
def get_latency():
    try:
        output = subprocess.check_output(["ping", "-n", "1", "8.8.8.8"], text=True)
        match = re.search(r"tiempo=([\d]+)ms", output)
        return {"latency": int(match.group(1)) if match else 0}
    except:
        return {"latency": 0}

@app.get("/api/speed")
def get_speed():
    try:
        s = speedtest.Speedtest()
        s.get_best_server()
        download = round(s.download() / 1_000_000, 2)  # Mbps
        return {"speed": download}
    except SpeedtestBestServerFailure:
        # No se pudo conectar con servidores para medir velocidad
        return {"speed": 0}
    except Exception as e:
        # Captura cualquier otro error inesperado
        print(f"Error en get_speed: {e}")
        return {"speed": 0}

@app.get("/api/devices")
def get_devices():
    red_local = RED
    dispositivos = escanear_red(red_local)
    return {"devices": len(dispositivos)}

@app.get("/api/devices/list")
def get_devices_list():
    dispositivos = escanear_red(RED)
    return {"devices": dispositivos}  # Aquí devuelve lista, no solo cantidad

def escanear_red(red=RED):
    ether = Ether(dst="ff:ff:ff:ff:ff:ff")
    arp = ARP(pdst=red)
    paquete = ether / arp

    resultado = srp(paquete, timeout=2, verbose=0)[0]

    dispositivos = []

    for _, recibido in resultado:
        ip = recibido.psrc
        mac = recibido.hwsrc
        try:
            nombre = socket.gethostbyaddr(ip)[0]
        except socket.herror:
            nombre = "Desconocido"

        dispositivos.append({"ip": ip, "mac": mac, "nombre": nombre})

    return dispositivos

# Iniciar monitor DNS al arranque del servidor
iniciar_monitoreo_dns()

@app.get("/api/top-sites")
def get_top_sites():
    top = obtener_top_dominios()
    for site in top:
        site["protocol"] = "HTTPS" if site["domain"].startswith("www.") else "HTTP"
        site["traffic"] = f"{round(site['visits'] * 0.05, 2)} MB"
        site["status"] = "Seguro" if site["protocol"] == "HTTPS" else "No seguro"
    return {"sites": top}
