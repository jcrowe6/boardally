import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!
});

export async function getSecureS3Url(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.RULEBOOK_BUCKET,
      Key: key,
    });
    
    // Generate a pre-signed URL that expires in 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });
    
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}
