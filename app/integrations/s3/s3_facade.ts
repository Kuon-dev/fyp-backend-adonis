import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import env from "#start/env"

export class S3Facade {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: env.get('AWS_REGION'),
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: env.get("AWS_SECRET_ACCESS_KEY")!,
        sessionToken: env.get("AWS_SESSION_TOKEN"),
      },
    });
    this.bucketName = env.get("AWS_S3_BUCKET_NAME")!;
  }

  /**
   * @uploadFile
   * @description Uploads a file to S3 and creates a Media record in the database.
   * @param file The file to upload
   * @param fileType The MIME type of the file
   * @param tx The Prisma transaction object
   * @returns The created Media object
   */
  async uploadFile(
    file: Buffer,
    fileType: string,
    tx: any,
    path?: string
  ): Promise<{ media: any; signedUrl: string }> {
    const fileKey = `${randomUUID()}-${Date.now()}`;
    const putObjectCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key:`${path ? path + '/' : ''}${fileKey}`,
      Body: file,
      ContentType: fileType,
    });

    await this.s3Client.send(putObjectCommand);

    const signedUrl = await getSignedUrl(this.s3Client, putObjectCommand, {
      expiresIn: 3600,
    });

    const media = await tx.media.create({
      data: {
        url: `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`,
        type: fileType,
      },
    });

    return { media, signedUrl };
  }

  /**
   * @getSignedUrl
   * @description Generates a signed URL for accessing a file in S3.
   * @param fileKey The key of the file in S3
   * @returns The signed URL
   */
  async getSignedUrl(fileKey: string): Promise<string> {
    const getObjectCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    return getSignedUrl(this.s3Client, getObjectCommand, { expiresIn: 3600 });
  }
}

export const s3Facade = new S3Facade();
