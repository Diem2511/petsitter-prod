import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  try {
    const s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.AWS_REGION || "sa-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
      tls: false,
    });

    const result = await s3.send(new ListBucketsCommand({}));

    res.status(200).json({
      success: true,
      message: "S3 OK",
      buckets: result.Buckets?.length || 0,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
}


