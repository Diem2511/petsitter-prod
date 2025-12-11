require('dotenv').config();

const { registerHandler } = require('./dist/handlers/register');
const { createBookingHandler } = require('./dist/handlers/createBooking');
const { updateBookingStatusHandler } = require('./dist/handlers/updateBookingStatus');
const { uploadEvidenceHandler } = require('./dist/handlers/uploadEvidence');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const PASSWORD = 'password123';
const CLIENT_EMAIL = 'evidence_client@test.com';
const SITTER_EMAIL = 'evidence_sitter@test.com';

let CLIENT_TOKEN, SITTER_TOKEN, SITTER_ID;
let TEST_BOOKING_ID;
const TEST_LAT = -31.4170; 
const TEST_LON = -64.1830;
const DUMMY_FILE_DATA = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; // Pixel blanco base64

async function setup() {
    // 0. Limpieza
    await pool.query('TRUNCATE TABLE evidence_files, user_trust_avals, user_locations, ws_connections, payments, reviews, bookings RESTART IDENTITY CASCADE;');
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [CLIENT_EMAIL, SITTER_EMAIL]);

    // Registrar Sitter y Cliente
    const sitterRes = await registerHandler({ body: JSON.stringify({ email: SITTER_EMAIL, user_type: "sitter", password: PASSWORD }) });
    SITTER_TOKEN = JSON.parse(sitterRes.body).token;
    SITTER_ID = JSON.parse(sitterRes.body).userId;

    const clientRes = await registerHandler({ body: JSON.stringify({ email: CLIENT_EMAIL, user_type: "client", password: PASSWORD }) });
    CLIENT_TOKEN = JSON.parse(clientRes.body).token;
    
    // Crear y Aceptar la Reserva (para tener un bookingId)
    const futureDate = new Date();
    const startTime = futureDate.toISOString();
    futureDate.setHours(futureDate.getHours() + 2);
    const endTime = futureDate.toISOString();

    const createEvent = {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
        body: JSON.stringify({ sitterId: SITTER_ID, petType: 'Dog', serviceType: 'Walk', startTime, endTime, totalPrice: 30.00 })
    };
    const createRes = await createBookingHandler(createEvent);
    TEST_BOOKING_ID = JSON.parse(createRes.body).bookingId;

    const acceptEvent = {
        headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
        body: JSON.stringify({ bookingId: TEST_BOOKING_ID, status: 'ACCEPTED' })
    };
    await updateBookingStatusHandler(acceptEvent);

    // Actualizar estado a PAID o ACTIVE (simularemos que el servicio ya empezó)
    await pool.query("UPDATE bookings SET status = 'ACTIVE' WHERE booking_id = $1", [TEST_BOOKING_ID]);

    console.log(`SETUP: Reserva ${TEST_BOOKING_ID.slice(-4)} lista en estado ACTIVE.`);
}

async function checkEvidenceInDB(evidenceId) {
    const result = await pool.query('SELECT * FROM evidence_files WHERE evidence_id = $1', [evidenceId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

(async () => {
    try {
        await setup();

        // ----------------------------------------------------
        // TEST 1: Subida de Evidencia Fotográfica
        // ----------------------------------------------------
        console.log("\n[TEST 1] Ejecutando Subida de Evidencia (Foto Heces)...");
        
        const uploadEvent = {
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ 
                bookingId: TEST_BOOKING_ID, 
                fileData: DUMMY_FILE_DATA, 
                mimeType: 'image/jpeg',
                latitude: TEST_LAT, 
                longitude: TEST_LON
            })
        };
        const uploadRes = await uploadEvidenceHandler(uploadEvent);
        const uploadBody = JSON.parse(uploadRes.body);
        
        let success = false;
        if (uploadRes.statusCode === 200) {
            const dbCheck = await checkEvidenceInDB(uploadBody.evidenceId);
            
            if (dbCheck && uploadBody.fileUrl.includes(`lat=${TEST_LAT.toFixed(4)}`)) {
                 console.log(`✅ ÉXITO: Evidencia registrada. URL de S3 con marca de agua (latitud: ${dbCheck.latitude}) generada.`);
                 success = true;
            } else {
                 console.error("❌ FALLO: Registro de DB o URL de marca de agua incorrecta.");
            }
        } else {
             console.error(`❌ FALLO: El handler devolvió status ${uploadRes.statusCode}.`);
        }

        if (success) {
            console.log("✅ FASE 4.3 COMPLETADA: Módulo de Evidencia Listo.");
        }


    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        await pool.end();
    }
})();
