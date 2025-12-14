"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get("/", (req, res) => {
    res.send("OK");
});
app.get("/test-s3", (req, res) => {
    res.json({ ok: true });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor levantado en puerto", PORT);
});
