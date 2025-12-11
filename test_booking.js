require('dotenv').config();

const { registerHandler } = require('./dist/handlers/register');
const { createBookingHandler } = require('./dist/handlers/createBooking');
const { updateBookingStatusHandler } = require('./dist/handlers/updateBookingStatus');
const { checkinCheckoutHandler } = require('./dist/handlers/checkinCheckout');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const TEST_PASSWORD = 'password123';
const CLIENT_EMAIL = 'booking_client@test.com';
const SITTER_EMAIL = 'booking_sitter@test.com';

let CLIENT_TOKEN = '';
let SITTER_TOKEN = '';
let SITTER_ID = '';

async function setupUsers() {
    // 1. Limpieza
    await pool.query('TRUNCATE TABLE bookings RESTART IDENTITY CASCADE;');
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [CLIENT_EMAIL, SITTER_EMAIL]);
    
    // 2. Registrar Cliente y obtener Token
    const clientResult = await registerHandler({ body: JSON.stringify({ email: CLIENT_EMAIL, user_type: "client", password: TEST_PASSWORD }) });
    CLIENT_TOKEN = JSON.parse(clientResult.body).token;
    
    // 3. Registrar Sitter real y obtener Token/ID
    const sitterResult = await registerHandler({ body: JSON.stringify({ email: SITTER_EMAIL, user_type: "sitter", password: TEST_PASSWORD }) });
    SITTER_TOKEN = JSON.parse(sitterResult.body).token;
    SITTER_ID = JSON.parse(sitterResult.body).userId;

    console.log(`Setup: Usuarios registrados. Sitter ID: ${SITTER_ID}`);
}

async function createTestBooking(sitterId) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const startTime = futureDate.toISOString();
    
    futureDate.setHours(futureDate.getHours() + 24);
    const endTime = futureDate.toISOString();

    const bookingEvent = {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
        body: JSON.stringify({
            sitterId: sitterId,
            petType: 'Dog',
            serviceType: 'Boarding',
            startTime: startTime,
            endTime: endTime,
            totalPrice: 45.50
        })
    };
    const result = await createBookingHandler(bookingEvent);
    return JSON.parse(result.body).bookingId;
}

async function getBookingStatus(bookingId) {
    const result = await pool.query('SELECT status FROM bookings WHERE booking_id = $1', [bookingId]);
    return result.rows.length > 0 ? result.rows[0].status : null;
}

(async () => {
    let bookingIdFull;
    try {
        await setupUsers();
        
        // ----------------------------------------------------
        // TEST 1: Flujo Completo: PENDING -> ACCEPTED -> ACTIVE -> COMPLETED
        // ----------------------------------------------------
        bookingIdFull = await createTestBooking(SITTER_ID);
        console.log(`\n[TEST 1] Iniciando flujo completo para Reserva ${bookingIdFull} (Actual: PENDING)`);
        
        let currentStatus = await getBookingStatus(bookingIdFull);
        if (currentStatus !== 'PENDING') throw new Error(`Estado inicial incorrecto: ${currentStatus}`);
        
        // 1. PENDING -> ACCEPTED (Usando updateBookingStatusHandler)
        const acceptEvent = {
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ bookingId: bookingIdFull, status: 'ACCEPTED' })
        };
        await updateBookingStatusHandler(acceptEvent);
        currentStatus = await getBookingStatus(bookingIdFull);
        console.log(`   -> 1. ACCEPTED: ${currentStatus === 'ACCEPTED' ? '✅ OK' : '❌ FALLO'}`);
        if (currentStatus !== 'ACCEPTED') throw new Error("Fallo en PENDING -> ACCEPTED");
        
        // 2. ACCEPTED -> ACTIVE (Check-in)
        const checkinEvent = {
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ bookingId: bookingIdFull, action: 'CHECK_IN' })
        };
        await checkinCheckoutHandler(checkinEvent);
        currentStatus = await getBookingStatus(bookingIdFull);
        console.log(`   -> 2. ACTIVE (Check-in): ${currentStatus === 'ACTIVE' ? '✅ OK' : '❌ FALLO'}`);
        if (currentStatus !== 'ACTIVE') throw new Error("Fallo en ACCEPTED -> ACTIVE");
        
        // 3. ACTIVE -> COMPLETED (Check-out)
        const checkoutEvent = {
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ bookingId: bookingIdFull, action: 'CHECK_OUT' })
        };
        await checkinCheckoutHandler(checkoutEvent);
        currentStatus = await getBookingStatus(bookingIdFull);
        console.log(`   -> 3. COMPLETED (Check-out): ${currentStatus === 'COMPLETED' ? '✅ OK' : '❌ FALLO'}`);
        if (currentStatus !== 'COMPLETED') throw new Error("Fallo en ACTIVE -> COMPLETED");
        
        console.log(`✅ ÉXITO: Flujo de reserva completado (PENDING -> ACCEPTED -> ACTIVE -> COMPLETED).`);
        
        // ----------------------------------------------------
        // TEST 2: Estado Incorrecto (Intentar Check-out desde PENDING)
        // ----------------------------------------------------
        const bookingIdPending = await createTestBooking(SITTER_ID);
        console.log(`\n[TEST 2] Intentando Check-out desde PENDING (${bookingIdPending})...`);
        
        const pendingCheckoutEvent = {
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ bookingId: bookingIdPending, action: 'CHECK_OUT' })
        };
        const pendingCheckoutResult = await checkinCheckoutHandler(pendingCheckoutEvent);
        
        if (pendingCheckoutResult.statusCode === 403 && pendingCheckoutResult.body.includes("ACTIVE")) {
            console.log(`✅ ÉXITO: Rechazo por estado incorrecto (Status 403, Esperado: ACTIVE).`);
        } else {
            console.error(`❌ FALLO: Falla en la validación de estado. Status: ${pendingCheckoutResult.statusCode}, Mensaje: ${pendingCheckoutResult.body}`);
        }


    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
    } finally {
        await pool.end();
    }
})();
