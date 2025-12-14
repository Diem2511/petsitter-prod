export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: "S3 test route funcionando"
  });
}



