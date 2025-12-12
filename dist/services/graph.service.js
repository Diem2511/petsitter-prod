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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDriver = getDriver;
exports.closeDriver = closeDriver;
exports.getTrustLevel = getTrustLevel;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// --- PATRÓN SINGLETON PARA EL DRIVER ---
let driver = null;
function getDriver() {
    if (!driver) {
        driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'petsitter123'));
    }
    return driver;
}
function closeDriver() {
    return __awaiter(this, void 0, void 0, function* () {
        if (driver) {
            yield driver.close();
            driver = null;
        }
    });
}
// --- FUNCIÓN REQUERIDA POR SEARCH.TS ---
function getTrustLevel(sourceId, targetId) {
    return __awaiter(this, void 0, void 0, function* () {
        const driver = getDriver();
        const session = driver.session();
        // Lógica simplificada: Si hay relación directa TRUSTS, devuelve el nivel.
        // Si no, devuelve 0.0. (Aquí luego iría el algoritmo BFS/Dijkstra)
        const query = `
        MATCH (a:Person {id: $sourceId})-[r:TRUSTS]->(b:Person {id: $targetId})
        RETURN r.level AS level
    `;
        try {
            const result = yield session.run(query, { sourceId, targetId });
            if (result.records.length > 0) {
                // Convertimos el numero de Neo4j a JS number
                return result.records[0].get('level');
            }
            return 0.0;
        }
        catch (error) {
            console.error("Error obteniendo Trust Level:", error);
            return 0.0; // Fallback seguro
        }
        finally {
            yield session.close();
        }
    });
}
