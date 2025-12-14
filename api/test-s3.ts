test-s3.tsimport { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.status(200).json({
    ok: true,
    message: "test-s3 funciona"
  });
}
