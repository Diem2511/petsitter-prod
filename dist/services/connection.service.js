"use strict";
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
exports.ConnectionService = void 0;
class ConnectionService {
    constructor(pool) {
        this.pool = pool;
    }
    addConnection(connectionId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // En una app real usaríamos DynamoDB. Aquí usamos PG para simplificar.
            yield this.pool.query('INSERT INTO ws_connections (connection_id, user_id) VALUES ($1, $2) ON CONFLICT (connection_id) DO UPDATE SET user_id = EXCLUDED.user_id', [connectionId, userId]);
        });
    }
    removeConnection(connectionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pool.query('DELETE FROM ws_connections WHERE connection_id = $1', [connectionId]);
        });
    }
    getUserIdByConnectionId(connectionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.pool.query('SELECT user_id FROM ws_connections WHERE connection_id = $1', [connectionId]);
            return result.rows.length > 0 ? result.rows[0].user_id : null;
        });
    }
}
exports.ConnectionService = ConnectionService;
