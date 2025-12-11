require('dotenv').config();

const { registerHandler } = require('./dist/handlers/register');
const { verifyUserIdentityHandler } = require('./dist/handlers/verifyUserIdentity');
const { KYCService } = require('./dist/services/kyc.service');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const kycService = new KYCService(pool);

const SITTER_EMAIL = 'kyc_sitter@test.com';
const FAILED_SITTER_EMAIL = 'kyc_fail@test.com';

let SITTER_TOKEN, SITTER_ID;
let FAILED_SITTER_TOKEN, FAILED_SITTER_ID;

const VALID_TOKEN = 'DNI_123456_BIOMETRY_OK';
const INVALID_TOKEN = 'DNI_999999_BIOMETRY_FAIL';

async function setup() {
    // 0. Limpieza
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [SITTER_EMAIL, FAILED_SITTER_EMAIL]);

    // Registrar Sitter Exitoso
    const sitterRes = await registerHandler({ body: JSON.stringify({ email: SITTER_EMAIL, user_type: "sitter", password: 'password123' }) });
    SITTER_TOKEN = JSON.parse(sitterRes.body).token;
    SITTER_ID = JSON.parse(sitterRes.body).userId;

    // Registrar Sitter Fallido
    const failedSitterRes = await registerHandler({ body: JSON.stringify({ email: FAILED_SITTER_EMAIL, user_type: "sitter", password: 'password123' }) });
    FAILED_SITTER_TOKEN = JSON.parse(failedSitterRes.body).token;
    FAILED_SITTER_ID = JSON.parse(failedSitterRes.body).userId;

    console.log(`SETUP: Dos Sitters registrados con estado inicial: ${await kycService.getKYCStatus(SITTER_ID)}`);
}

async function checkKYCStatus(userId) {
    const result = await pool.query('SELECT kyc_status FROM users WHERE user_id = $1', [userId]);
    return result.rows.length > 0 ? result.rows[0].kyc_status : 'NOT_FOUND';
}

(async () => {
    try {
        await setup();

        // ----------------------------------------------------
        // TEST 1: Verificación Exitosa
        // ----------------------------------------------------
        console.log("\n[TEST 1] Ejecutando Verificación Exitosa...");
        const successEvent = {
            headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
            body: JSON.stringify({ validationToken: VALID_TOKEN })
        };
        const successRes = await verifyUserIdentityHandler(successEvent);
        const successBody = JSON.parse(successRes.body);
        const statusCheck1 = await checkKYCStatus(SITTER_ID);
        
        if (successRes.statusCode === 200 && statusCheck1 === 'VERIFIED') {
            console.log(`✅ ÉXITO: Sitter verificado. Status DB: ${statusCheck1}`);
        } else {
            console.error(`❌ FALLO: Verificación exitosa. Status: ${successRes.statusCode}, DB: ${statusCheck1}`);
        }

        // ----------------------------------------------------
        // TEST 2: Verificación Fallida (Token Inválido)
        // ----------------------------------------------------
        console.log("\n[TEST 2] Ejecutando Verificación Fallida (Token Inválido)...");
        const failEvent = {
            headers: { Authorization: `Bearer ${FAILED_SITTER_TOKEN}` },
            body: JSON.stringify({ validationToken: INVALID_TOKEN })
        };
        const failRes = await verifyUserIdentityHandler(failEvent);
        const statusCheck2 = await checkKYCStatus(FAILED_SITTER_ID);

        if (failRes.statusCode === 403 && statusCheck2 === 'FAILED') {
            console.log(`✅ ÉXITO: Sitter rechazado. Status Handler: ${failRes.statusCode}, Status DB: ${statusCheck2}`);
        } else {
            console.error(`❌ FALLO: Verificación fallida. Status: ${failRes.statusCode}, DB: ${statusCheck2}`);
        }

    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        await pool.end();
    }
})();
