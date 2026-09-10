import crypto from 'crypto';
import path from 'path';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.ts';
import { StorageHealthStatus } from '../../src/types.ts';

export const GOVEXAM_STORAGE_BUCKETS = [
  'govexam-notifications',
  'govexam-syllabus',
  'govexam-pyq',
  'govexam-answer-keys',
  'govexam-visuals',
  'govexam-exports'
] as const;

export type GovExamBucket = typeof GOVEXAM_STORAGE_BUCKETS[number];

export interface UploadDocumentOptions {
  bucket: GovExamBucket;
  examId: string;
  recruitmentCycle: string;
  filename: string;
  fileBuffer: Buffer;
  mimeType?: string;
}

export interface UploadDocumentResult {
  bucket: string;
  storagePath: string;
  contentHash: string;
  fileSize: number;
  isExistingReused: boolean;
}

/**
 * Computes SHA-256 hash of a file buffer
 */
export function computeBufferSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generates canonical, content-addressed storage path:
 * {exam_id}/{recruitment_cycle}/{content_hash}/{filename}
 */
export function buildStoragePath(
  examId: string,
  recruitmentCycle: string,
  contentHash: string,
  filename: string
): string {
  const sanitizedCycle = (recruitmentCycle || 'general')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const sanitizedFile = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${examId}/${sanitizedCycle}/${contentHash}/${sanitizedFile}`;
}

/**
 * Uploads a document with automatic content-addressed deduplication.
 */
export async function uploadDocument(
  options: UploadDocumentOptions
): Promise<UploadDocumentResult> {
  const { bucket, examId, recruitmentCycle, filename, fileBuffer, mimeType } = options;
  const contentHash = computeBufferSha256(fileBuffer);
  const storagePath = buildStoragePath(examId, recruitmentCycle, contentHash, filename);

  if (!isSupabaseConfigured()) {
    // Return mock/local storage result when database client is not active
    return {
      bucket,
      storagePath,
      contentHash,
      fileSize: fileBuffer.length,
      isExistingReused: false
    };
  }

  const supabase = getSupabaseClient();

  // Storage Deduplication Check: check if object already exists at storagePath
  const { data: existingList, error: listError } = await supabase.storage
    .from(bucket)
    .list(path.dirname(storagePath));

  const targetFilename = path.basename(storagePath);
  const alreadyExists = !listError && existingList?.some(item => item.name === targetFilename);

  if (alreadyExists) {
    return {
      bucket,
      storagePath,
      contentHash,
      fileSize: fileBuffer.length,
      isExistingReused: true
    };
  }

  // Upload new object (standard/binary upload with contentType)
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType || 'application/pdf',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`STORAGE_UPLOAD_FAILED: Failed to upload ${filename} to ${bucket}/${storagePath}: ${uploadError.message}`);
  }

  return {
    bucket,
    storagePath,
    contentHash,
    fileSize: fileBuffer.length,
    isExistingReused: false
  };
}

/**
 * Downloads a document from Supabase Storage
 */
export async function downloadDocument(
  bucket: GovExamBucket | string,
  storagePath: string
): Promise<Buffer> {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED: Cannot download storage document without active Supabase client.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);

  if (error || !data) {
    throw new Error(`STORAGE_DOWNLOAD_FAILED: Failed to download ${storagePath} from ${bucket}: ${error?.message || 'Empty response'}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Non-destructive Storage Health Check
 * Validates bucket existence, small upload, download, hash verification, and cleanup
 */
export async function checkStorageHealth(): Promise<StorageHealthStatus> {
  if (!isSupabaseConfigured()) {
    return {
      healthy: false,
      buckets_accessible: [],
      upload_download_verified: false,
      hash_verified: false,
      cleanup_verified: false,
      error: 'Supabase credentials not configured'
    };
  }

  try {
    const supabase = getSupabaseClient();
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      return {
        healthy: false,
        buckets_accessible: [],
        upload_download_verified: false,
        hash_verified: false,
        cleanup_verified: false,
        error: `Failed to list buckets: ${bucketError.message}`
      };
    }

    const accessible = (buckets || []).map(b => b.name);
    const testBucket = accessible.includes('govexam-exports')
      ? 'govexam-exports'
      : accessible[0];

    if (!testBucket) {
      return {
        healthy: false,
        buckets_accessible: [],
        upload_download_verified: false,
        hash_verified: false,
        cleanup_verified: false,
        error: 'No storage buckets available'
      };
    }

    // Health check ping object
    const testContent = Buffer.from(`govexam_health_check_${Date.now()}`, 'utf8');
    const expectedHash = computeBufferSha256(testContent);
    const testPath = `_health_checks/ping_${Date.now()}.txt`;

    // 1. Upload test object
    const { error: upErr } = await supabase.storage.from(testBucket).upload(testPath, testContent, {
      contentType: 'text/plain',
      upsert: true
    });
    if (upErr) throw new Error(`Health check upload failed: ${upErr.message}`);

    // 2. Download and verify hash
    const { data: downData, error: downErr } = await supabase.storage.from(testBucket).download(testPath);
    if (downErr || !downData) throw new Error(`Health check download failed: ${downErr?.message}`);

    const downloadedBuf = Buffer.from(await downData.arrayBuffer());
    const downloadedHash = computeBufferSha256(downloadedBuf);
    const hashVerified = downloadedHash === expectedHash;

    // 3. Clean up health check object
    const { error: rmErr } = await supabase.storage.from(testBucket).remove([testPath]);
    const cleanupVerified = !rmErr;

    return {
      healthy: hashVerified && cleanupVerified,
      buckets_accessible: accessible,
      upload_download_verified: true,
      hash_verified: hashVerified,
      cleanup_verified: cleanupVerified
    };
  } catch (err: any) {
    return {
      healthy: false,
      buckets_accessible: [],
      upload_download_verified: false,
      hash_verified: false,
      cleanup_verified: false,
      error: err?.message || String(err)
    };
  }
}
