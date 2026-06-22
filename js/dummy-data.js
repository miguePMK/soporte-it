const now = Date.now();
const minAgo = m => new Date(now - m * 60 * 1000).toISOString();
const daysAgo = d => now - d * 24 * 60 * 60 * 1000;

export const DUMMY_PRINTERS = {
  "p_001": {
    nombre: "HP LaserJet M404dn",
    marca: "HP", modelo: "LaserJet Pro M404dn",
    ip: "192.168.10.21", mac: "AA:BB:CC:11:22:33",
    ubicacion: "Oficina Central · Planta baja",
    departamento: "Administración",
    activo: true, monitorear: true,
    snmp_version: "2c", snmp_community: "public",
    fecha_adquisicion: daysAgo(420), garantia_hasta: daysAgo(-300),
    notas: "Impresora principal de admin",
    creado_en: daysAgo(420), creado_por: "u_seed",
    modificado_en: daysAgo(2), modificado_por: "u_seed"
  },
  "p_002": {
    nombre: "Xerox VersaLink C405",
    marca: "Xerox", modelo: "VersaLink C405",
    ip: "192.168.10.22",
    ubicacion: "Oficina Central · Piso 1",
    departamento: "Comercial",
    activo: true, monitorear: true,
    snmp_version: "2c", snmp_community: "public",
    creado_en: daysAgo(200), creado_por: "u_seed"
  }
};

export const DUMMY_STATUS = {
  "p_001": { online:true, last_seen:minAgo(2), toner_black_pct:68, pages_total:142567, status_msg:"Lista", error:null, updated_at:minAgo(2) },
  "p_002": { online:true, last_seen:minAgo(1), toner_black_pct:45, toner_cyan_pct:22, toner_magenta_pct:8, toner_yellow_pct:60, pages_total:89412, status_msg:"Lista", error:null, updated_at:minAgo(1) }
};
