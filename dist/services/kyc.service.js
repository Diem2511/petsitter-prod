"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KYCService = void 0;
class KYCService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Simula la llamada a una API de KYC (Renaper/MetaMap) para validar identidad y biometría.
     * En producción, esta función haría una llamada HTTP segura.
     * @param validationToken Simulación de un token de éxito (ej. DNI + hash de biometría)
     * @returns boolean Si la verificación fue exitosa.
     */
    async simulateExternalKYCApi(validationToken) {
        // Validación de prueba: solo los tokens que terminan en 'OK' son válidos.
        if (validationToken.endsWith('_OK')) {
            console.log(`[KYC MOCK] Token ${validationToken} validado externamente como OK.`);
            return true;
        }
        console.warn(`[KYC MOCK] Token ${validationToken} rechazado por la API externa.`);
        return false;
    }
    /**
     * Actualiza el estado de verificación KYC para un usuario.
     * Solo Sitters pueden ser VERIFIED.
     */
    async verifyUserIdentity(userId, userType, validationToken) {
        if (userType !== 'sitter') {
            throw new Error("Solo los Sitters requieren verificación KYC.");
        }
        // 1. Verificar el token con la API externa simulada
        const isValid = await this.simulateExternalKYCApi(validationToken);
        if (!isValid) {
            await this.updateKYCStatus(userId, 'FAILED');
            throw new Error("Verificación de identidad fallida o token inválido.");
        }
        // 2. Actualizar estado a VERIFIED
        await this.updateKYCStatus(userId, 'VERIFIED');
    }
    /**
     * Helper para actualizar el campo en la BBDD.
     */
    async updateKYCStatus(userId, status) {
        await this.pool.query('UPDATE users SET kyc_status = $1 WHERE user_id = $2', [status, userId]);
    }
    /**
     * Obtiene el estado actual de KYC.
     */
    async getKYCStatus(userId) {
        const result = await this.pool.query('SELECT kyc_status FROM users WHERE user_id = $1', [userId]);
        if (result.rows.length === 0)
            throw new Error("Usuario no encontrado.");
        return result.rows[0].kyc_status;
    }
}
exports.KYCService = KYCService;
