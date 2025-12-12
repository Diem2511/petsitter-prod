"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const uuid_1 = require("uuid");
class UserService {
    constructor(pool) {
        this.pool = pool;
        this.JWT_SECRET = process.env.JWT_SECRET || 'mi-clave-ultra-secreta-de-32-caracteres'; // Leer del .env
    }
    registerUser(email, userType, password, firstName, lastName) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = (0, uuid_1.v4)();
            let passwordHash = undefined;
            if (password) {
                passwordHash = yield bcrypt.hash(password, 10);
            }
            else {
                // Generar hash para el campo requerido, incluso si el password es opcional en la prueba.
                passwordHash = yield bcrypt.hash('default-password', 10);
            }
            try {
                const query = `
                INSERT INTO users (user_id, first_name, last_name, email, password_hash, user_type, kyc_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING user_id;
            `;
                const values = [userId, firstName, lastName, email, passwordHash, userType, 'NOT_STARTED'];
                yield this.pool.query(query, values);
                const token = this.generateToken(userId, email, userType);
                return { token, userId };
            }
            catch (error) {
                console.error("Database error during registration:", error);
                // Re-lanzar error con un mensaje más claro para el handler
                throw new Error("Fallo en la base de datos durante el registro.");
            }
        });
    }
    getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            SELECT user_id, first_name, last_name, email, password_hash, user_type, kyc_status
            FROM users 
            WHERE email = $1;
        `;
            const result = yield this.pool.query(query, [email]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            SELECT user_id, first_name, last_name, email, password_hash, user_type, kyc_status
            FROM users 
            WHERE user_id = $1;
        `;
            const result = yield this.pool.query(query, [userId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    }
    generateToken(userId, email, userType) {
        return jwt.sign({ userId, email, userType }, this.JWT_SECRET, { expiresIn: '7d' });
    }
    verifyToken(authHeader) {
        const token = authHeader.replace('Bearer ', '');
        try {
            return jwt.verify(token, this.JWT_SECRET);
        }
        catch (error) {
            throw new Error("Invalid or expired token.");
        }
    }
}
exports.UserService = UserService;
