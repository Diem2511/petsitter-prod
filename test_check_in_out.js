require('dotenv').config();
const { registerHandler } = require('./dist/handlers/register');
const { createBookingHandler } = require('./dist/handlers/createBooking');
const { updateBookingStatusHandler } = require('./dist/handlers/updateBookingStatus');
const { createPaymentHandler } = require('./dist/handlers/createPayment');
const { checkInOutHandler } = require('./dist/handlers/checkInOut');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const PASSWORD = 'password123';
const CLIENT_EMAIL = 'check_client@test.com';
const SITTER_EMAIL = 'check_sitter@test.com';

let CLIENT_TOKEN, SITTER_TOKEN, SITTER_ID, TEST_BOOKING_ID;

async function setup() {
    await pool.query('TRUNCATE TABLE payments, reviews, bookings RESTART IDENTITY CASCADE;');
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [CLIENT_EMAIL, SITTER_EMAIL]);

    const sitterRes = await registerHandler({ body: JSON.stringify({ email: SITTER_EMAIL, user_type: "sitter", password: PASSWORD }) });
    SITTER_TOKEN = JSON.parse(sitterRes.body).token;
    SITTER_ID = JSON.parse(sitterRes.body).userId;

    const clientRes = await registerHandler({ body: JSON.stringify({ email: CLIENT_EMAIL, user_type: "client", password: PASSWORD }) });
    CLIENT_TOKEN = JSON.parse(clientRes.body).token;
    
    // Crear Reserva
    const futureDate = new Date();
    const startTime = futureDate.toISOString();
    futureDate.setHours(futureDate.getHours() + 2);
    const endTime = futureDate.toISOString();

    const createRes = await createBookingHandler({
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
        body: JSON.stringify({ sitterId: SITTER_ID, petType: 'Dog', serviceType: 'Walk', startTime, endTime, totalPrice: 50.00 })
    });
    TEST_BOOKING_ID = JSON.parse(createRes.body).bookingId;

    // Aceptar
    await updateBookingStatusHandler({
        headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
        body: JSON.stringify({ bookingId: TEST_BOOKING_ID, status: 'ACCEPTED' })
    });

    // Simular Pago
    await pool.query("UPDATE bookings SET status = 'PAID' WHERE booking_id = $1", [TEST_BOOKING_ID]);
    console.log(`SETUP: Reserva ${TEST_BOOKING_ID} lista (PAID).`);
}

(async () => {
    try {
        await setup();

        console.log("\n[TEST 1] Ejecutando Check-in...");
        const res1 = await checkInOutHandler({
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ bookingId: TEST_BOOKING_ID, action: 'CHECK_IN', latitude: -31.417, longitude: -64.183 })
        });
        console.log(`Check-in: ${res1.statusCode} - ${res1.body}`);

        console.log("\n[TEST 2] Ejecutando Check-out...");
        const res2 = await checkInOutHandler({
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ bookingId: TEST_BOOKING_ID, action: 'CHECK_OUT' })
        });
        console.log(`Check-out: ${res2.statusCode} - ${res2.body}`);

    } catch (error) {
        console.error("❌ ERROR:", error);
    } finally {
        await pool.end();
    }
})();
