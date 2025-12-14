import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  try {
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "sa-east-1",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
      tls: false,
    });

    const data = await s3.send(new ListBucketsCommand({}));

    res.status(200).json({
      success: true,
      buckets: data.Buckets?.length || 0,
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
}

