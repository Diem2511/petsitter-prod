// src/services/user.service.ts
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export interface User {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    user_type: 'sitter' | 'client';
    latitude: string;
    longitude: string;
    kyc_status: string; // Nuevo campo para ICV
    identity_verified: boolean; // Nuevo campo para ICV
    domicile_verified: boolean; // Nuevo campo para ICV
    document_id: string; // Nuevo campo para ICV
    created_at: Date;
    password_hash?: string;
}

export class UserService {
    private readonly JWT_SECRET: string;
    private readonly pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
        this.JWT_SECRET = process.env.JWT_SECRET || 'mi-clave-ultra-secreta-de-32-caracteres'; // Leer del .env
    }

    public async registerUser(email: string, userType: 'sitter' | 'client', password?: string, firstName?: string, lastName?: string): Promise<{ token: string, userId: string }> {
        const userId = uuidv4();
        let passwordHash = undefined;

        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        } else {
             // Generar hash para el campo requerido, incluso si el password es opcional en la prueba.
             passwordHash = await bcrypt.hash('default-password', 10);
        }

        try {
            const query = `
                INSERT INTO users (user_id, first_name, last_name, email, password_hash, user_type, kyc_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING user_id;
            `;
            const values = [userId, firstName, lastName, email, passwordHash, userType, 'NOT_STARTED'];
            await this.pool.query(query, values);

            const token = this.generateToken(userId, email, userType);
            return { token, userId };
        } catch (error) {
            console.error("Database error during registration:", error);
            // Re-lanzar error con un mensaje más claro para el handler
            throw new Error("Fallo en la base de datos durante el registro.");
        }
    }

    public async getUserByEmail(email: string): Promise<User | null> {
        const query = `
            SELECT user_id, first_name, last_name, email, password_hash, user_type, kyc_status
            FROM users 
            WHERE email = $1;
        `;
        const result = await this.pool.query(query, [email]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    public async getUserById(userId: string): Promise<User | null> {
        const query = `
            SELECT user_id, first_name, last_name, email, password_hash, user_type, kyc_status
            FROM users 
            WHERE user_id = $1;
        `;
        const result = await this.pool.query(query, [userId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    public generateToken(userId: string, email: string, userType: 'sitter' | 'client'): string {
        return jwt.sign({ userId, email, userType }, this.JWT_SECRET, { expiresIn: '7d' });
    }

    public verifyToken(authHeader: string): { userId: string, email: string, userType: 'sitter' | 'client' } {
        const token = authHeader.replace('Bearer ', '');
        try {
            return jwt.verify(token, this.JWT_SECRET) as any;
        } catch (error) {
            throw new Error("Invalid or expired token.");
        }
    }
}
