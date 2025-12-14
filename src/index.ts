import express from "express";

const app = express();

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
