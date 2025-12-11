require('dotenv').config();

const { registerHandler } = require('./dist/handlers/register');
const { createBookingHandler } = require('./dist/handlers/createBooking');
const { createPaymentHandler } = require('./dist/handlers/createPayment');
const { updateBookingStatusHandler } = require('./dist/handlers/updateBookingStatus');
const { getSitterEarningsHandler } = require('./dist/handlers/getSitterEarnings');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const PASSWORD = 'password123';
const CLIENT_EMAIL = 'earnings_client@test.com';
const SITTER_EMAIL = 'earnings_sitter@test.com';

let CLIENT_TOKEN, SITTER_TOKEN, SITTER_ID;

// Montos de prueba (Total $150.00)
const BOOKINGS_AMOUNTS = [65.50, 24.50, 60.00];
const EXPECTED_TOTAL = 150.00;
const EXPECTED_COMMISSION = 15.00; // 10%
const EXPECTED_NET = 135.00;

async function setup() {
    // 0. Limpieza (Aseguramos que la tabla payments ya existe del paso anterior)
    await pool.query('TRUNCATE TABLE payments, reviews, bookings RESTART IDENTITY CASCADE;');
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [CLIENT_EMAIL, SITTER_EMAIL]);

    // Registrar Sitter
    const sitterRes = await registerHandler({ body: JSON.stringify({ email: SITTER_EMAIL, user_type: "sitter", password: PASSWORD }) });
    SITTER_TOKEN = JSON.parse(sitterRes.body).token;
    SITTER_ID = JSON.parse(sitterRes.body).userId;

    // Registrar Cliente
    const clientRes = await registerHandler({ body: JSON.stringify({ email: CLIENT_EMAIL, user_type: "client", password: PASSWORD }) });
    CLIENT_TOKEN = JSON.parse(clientRes.body).token;

    console.log("SETUP: Usuarios y limpieza listos.");
}

async function createAndPayBooking(amount) {
    // 1. Crear la Reserva (PENDING)
    const futureDate = new Date();
    const startTime = futureDate.toISOString();
    futureDate.setHours(futureDate.getHours() + 2);
    const endTime = futureDate.toISOString();

    const createEvent = {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
        body: JSON.stringify({ sitterId: SITTER_ID, petType: 'Dog', serviceType: 'Walk', startTime, endTime, totalPrice: amount })
    };
    const createRes = await createBookingHandler(createEvent);
    const bookingId = JSON.parse(createRes.body).bookingId;
    
    // 2. Aceptar la Reserva
    const acceptEvent = {
        headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
        body: JSON.stringify({ bookingId, status: 'ACCEPTED' })
    };
    await updateBookingStatusHandler(acceptEvent);

    // 3. Pagar la Reserva (COMPLETED)
    const paymentEvent = {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
        body: JSON.stringify({
            bookingId: bookingId,
            amount: amount,
            paymentMethod: 'TRANSFER'
        })
    };
    await createPaymentHandler(paymentEvent);
    console.log(`   - Reserva ${bookingId.slice(-4)} ($${amount}) Creada y Pagada.`);
    
    return bookingId;
}

(async () => {
    try {
        await setup();

        // ----------------------------------------------------
        // 1. Crear y Pagar Múltiples Reservas
        // ----------------------------------------------------
        console.log("\n🔄 Creando y pagando 3 reservas para el Sitter...");
        for (const amount of BOOKINGS_AMOUNTS) {
            await createAndPayBooking(amount);
        }

        // ----------------------------------------------------
        // 2. Obtener Ganancias del Sitter
        // ----------------------------------------------------
        console.log("\n💰 Obteniendo el resumen de ganancias...");
        const earningsEvent = {
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({})
        };
        const earningsRes = await getSitterEarningsHandler(earningsEvent);
        const earningsBody = JSON.parse(earningsRes.body);
        const earnings = earningsBody.earnings;
        
        console.log(`   - Total Pagado: $${earnings.totalPaid}`);
        console.log(`   - Comisión Retenida (10%): $${earnings.platformFee}`);
        console.log(`   - Neto del Sitter: $${earnings.sitterNet}`);

        // 3. Verificación
        let success = true;
        if (earnings.totalPaid !== EXPECTED_TOTAL) {
            console.error(`❌ ERROR: Total Pagado, Esperado $${EXPECTED_TOTAL}, Obtenido $${earnings.totalPaid}`);
            success = false;
        }
        if (earnings.platformFee !== EXPECTED_COMMISSION) {
            console.error(`❌ ERROR: Comisión, Esperado $${EXPECTED_COMMISSION}, Obtenido $${earnings.platformFee}`);
            success = false;
        }
        if (earnings.sitterNet !== EXPECTED_NET) {
            console.error(`❌ ERROR: Neto Sitter, Esperado $${EXPECTED_NET}, Obtenido $${earnings.sitterNet}`);
            success = false;
        }

        if (success) {
            console.log("✅ ÉXITO: El cálculo de ganancias es correcto.");
        } else {
            console.error("❌ FALLO: El cálculo de ganancias es incorrecto.");
        }


    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        await pool.end();
    }
})();
