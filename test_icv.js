require('dotenv').config();

const { registerHandler } = require('./dist/handlers/register');
const { getSitterRecommendationsHandler } = require('./dist/handlers/getSitterRecommendations');
const { TrustGraphService } = require('./dist/services/trustGraph.service');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const trustGraphService = new TrustGraphService(pool);

const CLIENT_EMAIL = 'icv_client@test.com';
const CLIENT_LOC = { lat: -31.41700000, lon: -64.18300000, hash: 'CASA_CLIENTE_A' }; // Córdoba, Argentina

// --- SITTERS DE PRUEBA ---
const SITTERS_DATA = [
    { email: 'sitter_A@test.com', lat: -31.41650000, lon: -64.18300000, hash: 'EDIF_A', aval: ['CONSORCIO', 'VECINO_DIRECTO'] }, // Muy cerca, 2 avales (Alto ICV)
    { email: 'sitter_B@test.com', lat: -31.41705000, lon: -64.18305000, hash: 'EDIF_B', aval: [] }, // Súper cerca, 0 avales (Bajo ICV)
    { email: 'sitter_C@test.com', lat: -31.39400000, lon: -64.18300000, hash: 'EDIF_C', aval: ['CONSORCIO'] } // Lejos, 1 aval (ICV Medio)
];

let CLIENT_TOKEN, CLIENT_ID;
let SITTER_IDS = {};

async function setup() {
    // Limpieza
    await pool.query('TRUNCATE TABLE user_trust_avals, user_locations, ws_connections, payments, reviews, bookings RESTART IDENTITY CASCADE;');
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);

    // Registrar Cliente
    const clientRes = await registerHandler({ body: JSON.stringify({ email: CLIENT_EMAIL, user_type: "client", password: 'password123' }) });
    CLIENT_TOKEN = JSON.parse(clientRes.body).token;
    CLIENT_ID = JSON.parse(clientRes.body).userId;

    // Registrar Ubicación del Cliente
    await trustGraphService.setInitialLocation(CLIENT_ID, CLIENT_LOC.lat, CLIENT_LOC.lon, CLIENT_LOC.hash);

    // Registrar Sitters, Ubicaciones y Avales
    for (const data of SITTERS_DATA) {
        const sitterRes = await registerHandler({ body: JSON.stringify({ email: data.email, user_type: "sitter", password: 'password123' }) });
        const sitterId = JSON.parse(sitterRes.body).userId;
        SITTER_IDS[data.email] = sitterId;

        // Registrar Ubicación
        await trustGraphService.setInitialLocation(sitterId, data.lat, data.lon, data.hash);

        // Añadir Avales
        for (const avalType of data.aval) {
            // Usamos el ID del Cliente como si fuera el validador (simplificación)
            await trustGraphService.addTrustAval(sitterId, CLIENT_ID, avalType);
        }
    }

    console.log("SETUP: Cliente, 3 Sitters y sus Avales/Ubicaciones listos.");
}


(async () => {
    try {
        await setup();

        // ----------------------------------------------------
        // 1. Obtener Recomendaciones ICV
        // ----------------------------------------------------
        console.log("\n💰 Obteniendo ranking de Sitters por ICV...");
        
        const recommendationsEvent = {
            headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
            body: JSON.stringify({})
        };

        const res = await getSitterRecommendationsHandler(recommendationsEvent);
        const body = JSON.parse(res.body);
        const ranking = body.recommendations;
        
        console.log("--- RESULTADOS ICV ---");
        
        // 2. Imprimir y Verificar Ranking
        let success = true;
        const sitterARank = ranking.find(r => r.sitterId === SITTER_IDS[SITTERS_DATA[0].email]);
        const sitterBRank = ranking.find(r => r.sitterId === SITTERS_DATA[1].email);
        const sitterCRank = ranking.find(r => r.sitterId === SITTERS_DATA[2].email);
        
        console.table(ranking.map(r => ({ 
            Sitter: r.sitterId.slice(0, 4) + '...', 
            ICV: r.finalICV, 
            Distancia_KM: r.distanceKM,
            Avales: r.avalScore,
            Puntos_Dist: r.distanceScore
        })));
        
        // Verificación del orden: Sitter A (110) > Sitter C (65) > Sitter B (59)
        if (ranking[0].sitterId === SITTER_IDS[SITTERS_DATA[0].email] &&
            ranking[1].sitterId === SITTER_IDS[SITTERS_DATA[2].email] &&
            ranking[2].sitterId === SITTER_IDS[SITTERS_DATA[1].email]) {
            
            console.log("\n✅ ÉXITO: El ranking de ICV es correcto (A > C > B).");
            // Nota: La verificación del ICV exacto es sensible a decimales, por eso solo verificamos el orden.
        } else {
            console.error("\n❌ FALLO: El orden del ranking de ICV es incorrecto.");
            success = false;
        }


    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        await pool.end();
    }
})();
