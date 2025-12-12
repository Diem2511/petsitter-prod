import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { KYCService } from '../services/kyc.service';
import { UserService } from '../services/user.service';

const pool = new Pool(dbConfig);
const kycService = new KycService();
const userService = new UserService(pool);

/**
 * Handler para iniciar/actualizar el proceso de validación KYC del Sitter.
 * RUTA PROTEGIDA: Requiere JWT de un Sitter.
 */
export async function submitKycHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    
    // 1. AUTORIZACIÓN (Verificar JWT y obtener userId)
    if (!event.headers.Authorization || !event.body) {
        return { statusCode: 401, body: JSON.stringify({ message: "Autorización o cuerpo de solicitud requeridos." }) };
    }
    
    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'sitter') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo Sitters pueden enviar KYC." }) };
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido o expirado." }) };
    }

    const { documentId, biometricHash, declaredAddressHash } = JSON.parse(event.body);
    const userId = payload.userId;

    if (!documentId || !biometricHash || !declaredAddressHash) {
        return { statusCode: 400, body: JSON.stringify({ message: "Faltan campos KYC obligatorios (documentId, biometricHash, declaredAddressHash)." }) };
    }

    try {
        // 2. Ejecutar Validaciones
        const identityResult = await kycService.validateIdentity(documentId, biometricHash);
        const domicileResult = await kycService.validateDomicile(userId, declaredAddressHash);

        let status = 'KYC_PENDING';
        let message = 'Proceso KYC en revisión.';
        let identityVerified = false;
        let domicileVerified = false;
        
        if (!identityResult.isVerified) {
             message = `Verificación de identidad fallida: ${identityResult.rejectionReason}`;
             status = 'KYC_FAILED_IDENTITY';
        } else {
             identityVerified = true;
        }

        if (identityVerified && !domicileResult.isVerified) {
             message = `Verificación de domicilio fallida: ${domicileResult.rejectionReason}`;
             status = 'KYC_FAILED_DOMICILE';
        } else if (identityVerified && domicileResult.isVerified) {
             message = "¡KYC COMPLETO! El Sitter está completamente verificado.";
             status = 'KYC_VERIFIED';
             domicileVerified = true;
        }

        // 3. Actualizar estado del Sitter en PostgreSQL
        const updateQuery = `
            UPDATE users SET 
                kyc_status = $1, 
                identity_verified = $2, 
                domicile_verified = $3, 
                document_id = $4 
            WHERE user_id = $5;
        `;
        const updateValues = [status, identityVerified, domicileVerified, documentId, userId];
        await pool.query(updateQuery, updateValues);
        
        return {
            statusCode: status === 'KYC_VERIFIED' ? 200 : 409, // 409 Conflict si falla una verificación
            body: JSON.stringify({ message: message, status: status })
        };

    } catch (error) {
        console.error("Error en submitKycHandler:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Error interno del servidor durante KYC." }) };
    }
}
