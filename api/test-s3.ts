import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

export default async function handler(req: any, res: any) {
  try {
    const client = new S3Client({
      region: "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const result = await client.send(new ListBucketsCommand({}));

    res.status(200).json({
      success: true,
      message: "S3 / R2 OK",
      buckets: result.Buckets?.length ?? 0,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
