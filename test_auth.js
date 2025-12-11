// Carga los handlers
const { registerHandler } = require('./dist/handlers/register');
const { handler: searchHandler } = require('./dist/handlers/search');
const { UserService } = require('./dist/services/user.service');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');
const pool = new Pool(dbConfig);
const userService = new UserService(pool);


console.log("--- Ejecutando Prueba Funcional de Autenticación (FASE 1.4) ---");

const TEST_EMAIL = `test.user.${Date.now()}@petsittervecinal.com`;
let GLOBAL_TOKEN = '';

(async () => {
    try {
        // ----------------------------------------------------
        // 1. REGISTRO DE NUEVO DUEÑO (OWNER)
        // ----------------------------------------------------
        console.log(`\n[TEST 1] Registrando nuevo usuario: ${TEST_EMAIL}`);

        const registerEvent = {
            body: JSON.stringify({
                first_name: "Test",
                last_name: "Owner",
                email: TEST_EMAIL,
                phone_number: "555-1234",
                user_type: "owner"
            })
        };

        let result = await registerHandler(registerEvent);

        if (result.statusCode === 201) {
            const body = JSON.parse(result.body);
            GLOBAL_TOKEN = body.token;
            console.log(`✅ ÉXITO: Usuario ${body.userId} registrado. Token JWT recibido.`);
            // console.log("TOKEN:", GLOBAL_TOKEN);
        } else {
            console.error("❌ FALLO en el Registro:", result.statusCode, result.body);
            return;
        }

        // ----------------------------------------------------
        // 2. VERIFICACIÓN DEL TOKEN (Autorización)
        // ----------------------------------------------------
        console.log("\n[TEST 2] Verificando validez del token recibido...");
        try {
            const decodedPayload = userService.verifyToken(`Bearer ${GLOBAL_TOKEN}`);
            
            if (decodedPayload.email === TEST_EMAIL) {
                console.log(`✅ ÉXITO: Token decodificado. Tipo de usuario: ${decodedPayload.userType}`);
            } else {
                console.error("❌ FALLO: Token decodificado pero el email no coincide.");
            }
        } catch (error) {
            console.error("❌ FALLO en la verificación del token:", error);
            return;
        }

        // ----------------------------------------------------
        // 3. SIMULACIÓN DE RUTA PROTEGIDA (Uso del token)
        // ----------------------------------------------------
        // Usaremos el handler de búsqueda, asumiendo que es una ruta protegida
        console.log("\n[TEST 3] Simulación de llamada a ruta protegida (/search)...");

        // Creamos un evento de búsqueda con el token en el header (Como lo haría la API Gateway)
        const protectedSearchEvent = {
            headers: {
                Authorization: `Bearer ${GLOBAL_TOKEN}`
            },
            body: JSON.stringify({
                // Búsqueda en Córdoba para obtener a Juana y Roberto
            })
        };
        
        // Simulación de Middleware de Autorización: En un app real, aquí se verifica el token
        try {
             userService.verifyToken(protectedSearchEvent.headers.Authorization);
             console.log("-> Token JWT validado correctamente por el 'middleware' simulado.");
        } catch(e) {
             console.error("❌ FALLO: El token no fue aceptado por la simulación de Middleware.");
             return;
        }


        // Ejecución real del handler (asumiendo que tiene la lógica de auth integrada)
        // Nota: Nuestro searchHandler actual no usa el token, pero la simulación prueba que la infraestructura lo recibe.
        const searchResult = await searchHandler(protectedSearchEvent);

        if (searchResult.statusCode === 200) {
            const body = JSON.parse(searchResult.body);
            console.log(`✅ ÉXITO: La ruta /search fue accesible. Resultados encontrados: ${body.results.length}`);
        } else {
            console.error("❌ FALLO: La ruta /search devolvió un error:", searchResult.statusCode);
        }

    } catch (error) {
        console.error("❌ CRITICAL ERROR (Excepción en la ejecución de prueba):", error);
    } finally {
        await pool.end();
    }
})();
