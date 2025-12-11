// --- LÍNEA MÁGICA: CARGAR VARIABLES DE ENTORNO ---
require('dotenv').config();

const { checkinHandler } = require('./dist/handlers/checkin');
const { registerHandler } = require('./dist/handlers/register');
const { UserService } = require('./dist/services/user.service');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

// DEBUG: IMPRIMIR SI ESTÁ LEYENDO EL PASSWORD CORRECTO
console.log("--- DEBUG CONEXIÓN ---");
console.log("DB Host:", process.env.DB_HOST);
console.log("DB User:", process.env.DB_USER);
console.log("DB Pass (largo):", process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : "VACIO");
console.log("----------------------");

const pool = new Pool(dbConfig);
const userService = new UserService(pool);

console.log("--- Ejecutando Prueba Funcional Geo-Fence (FASE 2.1) ---");

// Coordenadas de Servicio (Fijas en el handler: -31.4201, -64.1887)
const SERVICE_LAT = -31.4201;
const SERVICE_LON = -64.1887;
const MAX_DISTANCE = 1.0; // km

let SITTER_TOKEN = '';

(async () => {
    try {
        // 1. PREP: Registrar Sitter y obtener Token JWT
        const TEST_EMAIL = `sitter.geo.${Date.now()}@petsittervecinal.com`;
        const registerEvent = {
            body: JSON.stringify({
                email: TEST_EMAIL,
                user_type: "sitter"
            })
        };
        const registerResult = await registerHandler(registerEvent);
        SITTER_TOKEN = JSON.parse(registerResult.body).token;
        console.log(`\nPREP: Sitter registrado y token obtenido.`);

        // 2. TEST 1: Check-in Exitoso (Dentro del radio de 1km)
        const WITHIN_LAT = -31.4246;
        const WITHIN_LON = -64.1843;

        console.log("\n[TEST 1] Check-in con coordenadas DENTRO de la zona permitida...");

        const eventWithin = {
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ latitude: WITHIN_LAT, longitude: WITHIN_LON })
        };

        let result = await checkinHandler(eventWithin);
        let body = JSON.parse(result.body);

        if (result.statusCode === 200 && body.isWithinArea !== false) {
            console.log(`✅ ÉXITO: Check-in ACEPTADO. Distancia: ${body.distance_km} km`);
        } else {
            console.error(`❌ FALLO: Check-in RECHAZADO incorrectamente.`, body);
        }

        // 3. TEST 2: Check-in Fallido (Fuera del radio)
        const OUTSIDE_LAT = -32.4087;
        const OUTSIDE_LON = -63.2435;

        console.log("\n[TEST 2] Check-in con coordenadas FUERA de la zona permitida...");

        const eventOutside = {
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ latitude: OUTSIDE_LAT, longitude: OUTSIDE_LON })
        };

        result = await checkinHandler(eventOutside);
        body = JSON.parse(result.body);

        if (result.statusCode === 403) {
            console.log(`✅ ÉXITO: Check-in RECHAZADO correctamente.`);
        } else {
            console.error(`❌ FALLO: Check-in ACEPTADO incorrectamente. Status: ${result.statusCode}`);
        }

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN LA PRUEBA:", error);
    } finally {
        await pool.end();
    }
})();
