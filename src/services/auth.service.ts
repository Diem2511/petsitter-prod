import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../utils/db';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Definimos los tipos correctamente para que TypeScript no genere errores con jwt.sign()
const JWT_SECRET: string = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRATION: string | number = process.env.JWT_EXPIRATION || '24h';
const SALT_ROUNDS = 10;

/**
 * Hashea la contraseña usando bcrypt.
 */
export const hashPassword = (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compara una contraseña de texto plano con un hash.
 */
export const comparePassword = (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

/**
 * Genera un token JWT para un usuario.
 * Se usa 'as jwt.SignOptions' para satisfacer el compilador TS.
 */
export const generateToken = (userId: string, userType: string): string => {
    const payload = {
        userId,
        userType,
        iat: Math.floor(Date.now() / 1000) - 30, // Issued at 30 seconds ago
    };
    // **CORRECCION TS2769 APLICADA**
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION } as jwt.SignOptions);
};

/**
 * Registra un nuevo usuario en la base de datos (PostgreSQL).
 */
export const registerUser = async (
    firstName: string, 
    lastName: string, 
    email: string, 
    password_hash: string, 
    userType: 'owner' | 'sitter'
): Promise<any> => {
    const sql = `
        INSERT INTO users (first_name, last_name, email, password_hash, user_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING user_id, email, user_type, created_at;
    `;
    const result = await query(sql, [firstName, lastName, email, password_hash, userType]);
    return result.rows[0];
};
