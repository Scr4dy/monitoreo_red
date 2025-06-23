from scapy.all import sniff, DNSQR
from collections import Counter
import threading

contador_dominios = Counter()

def capturar_paquetes(packet):
    if packet.haslayer(DNSQR):
        dominio = packet[DNSQR].qname.decode().strip(".")
        contador_dominios[dominio] += 1

def iniciar_monitoreo_dns():
    hilo = threading.Thread(target=lambda: sniff(
        filter="udp port 53", prn=capturar_paquetes, store=0
    ), daemon=True)
    hilo.start()

def obtener_top_dominios(n=10):
    return [{"domain": d, "visits": v} for d, v in contador_dominios.most_common(n)]