import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Explicitly use IAM user credentials (not temporary credentials)
// This ensures pre-signed URLs remain valid for their full expiration time
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function getSecureS3Url(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.RULEBOOK_BUCKET,
      Key: key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600,
    });
    
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}
