require('dotenv').config();

const { registerHandler } = require('./dist/handlers/register');
const { searchSittersHandler } = require('./dist/handlers/searchSitters');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const TEST_PASSWORD = 'password123';

// UUIDs VÁLIDOS
const CLIENT_ID_PREFIX = '00000000-0000-0000-0000-00000000';
const CLIENT_EMAIL_NAME = 'testclient'; 
const DUMMY_CLIENT = '99999999-9999-9999-9999-999999999999'; 

// Coordenadas fijas
const CLIENT_LAT = -31.420; 
const CLIENT_LON = -64.188;

// Sitters de Prueba
const SITTERS = [
    // 1. Sitter de ALTO ICV: Cerca (2km), KYC OK, 5.0 Rating
    { id: CLIENT_ID_PREFIX + '00A1', lat: -31.402, lon: -64.195, rating: 5, status: 'KYC_VERIFIED', social: 0.2, name: 'Sitter A (HIGH ICV)' },
    
    // 2. Sitter de MEDIO ICV: Muy cerca (0.5km), KYC OK, Rating 4
    { id: CLIENT_ID_PREFIX + '00B2', lat: -31.416, lon: -64.185, rating: 4, status: 'KYC_VERIFIED', social: 0.5, name: 'Sitter B (MED ICV)' },
    
    // 3. Sitter de BAJO ICV: Lejos (8km) -> Filtrado por distancia
    { id: CLIENT_ID_PREFIX + '00C3', lat: -31.350, lon: -64.250, rating: 5, status: 'KYC_VERIFIED', social: 0.2, name: 'Sitter C (LEJOS)' },
    
    // 4. Sitter de BAJO KYC: Cerca (2km), KYC FAILED -> Filtrado por KYC
    { id: CLIENT_ID_PREFIX + '00D4', lat: -31.402, lon: -64.195, rating: 5, status: 'NOT_STARTED', social: 0.8, name: 'Sitter D (LOW KYC)' },
];

async function injectUser(user) {
    const passwordHash = await require('bcryptjs').hash(TEST_PASSWORD, 10);
    const query = `
        INSERT INTO users (user_id, first_name, email, password_hash, user_type, kyc_status, latitude, longitude, identity_verified, domicile_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            email = EXCLUDED.email,
            kyc_status = EXCLUDED.kyc_status,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            identity_verified = EXCLUDED.identity_verified,
            domicile_verified = EXCLUDED.domicile_verified;
    `;
    const identityVerified = user.status === 'KYC_VERIFIED';
    await pool.query(query, [
        user.id, user.name || user.id, `${user.id}@test.com`, passwordHash,
        user.id === DUMMY_CLIENT ? 'client' : 'sitter',
        user.status || 'NOT_STARTED',
        user.lat ? user.lat.toString() : null,
        user.lon ? user.lon.toString() : null,
        identityVerified, identityVerified
    ]);
}

async function injectReview(sitterId, rating) {
    const query = `
        INSERT INTO reviews (sitter_id, client_id, rating, comment)
        VALUES ($1, $2, $3, $4);
    `;
    const ratingInt = Math.round(rating); 

    for (let i = 0; i < 5; i++) { 
        await pool.query(query, [sitterId, DUMMY_CLIENT, ratingInt, `Review ${i}`]);
    }
}

(async () => {
    try {
        console.log("PREP: Limpieza e Inyección de datos de prueba...");
        
        // --- CORRECCIÓN AQUÍ: Orden de borrado ---
        // 1. Primero borramos las REVIEWS (Tablas Hijas)
        await pool.query('TRUNCATE TABLE reviews RESTART IDENTITY CASCADE;');

        // 2. Ahora sí podemos borrar los USUARIOS (Tablas Padres) sin romper Foreign Keys
        await pool.query(`DELETE FROM users WHERE email = $1`, [`${CLIENT_EMAIL_NAME}@test.com`]);
        await pool.query('DELETE FROM users WHERE user_type = \'sitter\' OR user_id = $1;', [DUMMY_CLIENT]);
        // -----------------------------------------

        await injectUser({ id: DUMMY_CLIENT, name: 'Client Dummy', lat: CLIENT_LAT, lon: CLIENT_LON, status: 'KYC_VERIFIED' });

        console.log("PREP: Registrando Cliente Real...");
        const registerResult = await registerHandler({ 
            body: JSON.stringify({ 
                email: `${CLIENT_EMAIL_NAME}@test.com`, 
                user_type: "client", 
                password: TEST_PASSWORD 
            }) 
        });
        
        // Manejo robusto de token
        let CLIENT_TOKEN;
        if (registerResult.statusCode === 201) {
             CLIENT_TOKEN = JSON.parse(registerResult.body).token;
        } else if (registerResult.body && registerResult.body.includes('already exists')) {
             console.log("INFO: Cliente ya existía (ignorando error de duplicado).");
             // En un caso real haríamos login, aquí asumimos que falló la limpieza anterior pero el user existe
             // Para que el script no muera, usaremos un token ficticio o null, pero esto fallará en la búsqueda.
             // Lo ideal es que la LIMPIEZA (arriba) funcione bien.
             throw new Error("El usuario no se borró correctamente en la fase de limpieza.");
        } else {
             throw new Error(`Fallo al registrar cliente: ${registerResult.body}`);
        }
        
        // 4. ACTUALIZAR COORDENADAS DEL CLIENTE
        await pool.query(
            `UPDATE users SET latitude = $1, longitude = $2 WHERE email = $3`,
            [CLIENT_LAT, CLIENT_LON, `${CLIENT_EMAIL_NAME}@test.com`]
        );
        console.log(`PREP: Cliente ubicado en Lat: ${CLIENT_LAT}, Lon: ${CLIENT_LON}.`);

        // 5. Inyectar Sitters y Reviews
        for (const sitter of SITTERS) {
            await injectUser(sitter);
            if (sitter.rating !== undefined) {
                await injectReview(sitter.id, sitter.rating);
            }
        }
        console.log("PREP: Sitters inyectados.");

        // ----------------------------------------------------
        // TEST FINAL: Búsqueda
        // ----------------------------------------------------
        console.log("\n[TEST FINAL] Ejecutando búsqueda para Cliente...");

        const searchEvent = {
            headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
            body: JSON.stringify({
                latitude: CLIENT_LAT.toString(),
                longitude: CLIENT_LON.toString(),
                maxDistanceKM: 5
            })
        };

        const result = await searchSittersHandler(searchEvent);
        const sittersFound = JSON.parse(result.body);

        console.log(`\nResultados encontrados (${sittersFound.length}):`);
        sittersFound.forEach((s, index) => {
            console.log(`  ${index + 1}. ${s.first_name} (ICV: ${s.icv_score}, Dist: ${s.distance_km} km)`);
        });

        const expectedCount = 2;

        if (sittersFound.length !== expectedCount) {
            console.error(`❌ FALLO: Número incorrecto de Sitters. Esperado: ${expectedCount}. Obtenido: ${sittersFound.length}`);
        } else {
            console.log(`✅ ÉXITO: Número de Sitters correcto.`);
            
            if (sittersFound.length > 1 && sittersFound[0].icv_score >= sittersFound[1].icv_score) {
                 console.log('✅ ÉXITO: Ordenamiento por ICV correcto.');
            } else {
                 console.error('❌ FALLO: El ordenamiento no parece correcto.');
            }
        }

    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
    } finally {
        await pool.end();
    }
})();
