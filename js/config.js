export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDoa6b_-ZOaHxvzHdS5UcpgIS1b5YN16iY",
  authDomain: "sistemas-it-petromark.firebaseapp.com",
  databaseURL: "https://sistemas-it-petromark-default-rtdb.firebaseio.com",
  projectId: "sistemas-it-petromark",
  storageBucket: "sistemas-it-petromark.firebasestorage.app",
  messagingSenderId: "611261608047",
  appId: "1:611261608047:web:56ec6b1b3b311e99361d9a"
};

export const SALT        = "SIT_PETROMARK_2026_v1_salt";
export const SESSION_KEY = "sit_session_v1";
export const USE_DUMMY = false;

export const TONER_LOW       = 25;
export const TONER_CRITICAL  = 10;
export const STALE_MINUTES   = 15;
export const VIEWS_WITH_PRINTERS = ["dashboard", "impresoras", "admin_printers"];

export const SNMP_VERSIONS = ["1", "2c", "3"];
export const DEPARTAMENTOS_SUGERIDOS = ["IT", "Administración", "Operaciones", "RRHH", "Gerencia", "Logística"];

// Ubicaciones físicas predefinidas (sedes / yacimientos)
export const UBICACIONES = ['BASE NQ', 'BASE AÑ', 'ADM CO', 'BASE CO', 'BASE CR', 'BASE CD', 'NOVADRILL', 'BASE SB', 'BASE LH'];

// Default sugerido para el rango CIDR del scanner
export const SCAN_DEFAULT_CIDR = "192.168.0.0/24";
