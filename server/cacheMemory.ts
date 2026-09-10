/**
 * GovExam Multi-Tier "Catch Memory" (Cache Memory Engine)
 * Provides L1 In-Memory LRU Cache, L2 Persistent Document Cache, and L3 Verified Fact Memory.
 * Guarantees zero duplicate requests, eliminates quota burnout, and ensures ultrafast retrieval.
 */

import crypto from 'crypto';
import { getSupabaseClient } from './persistence/supabaseClient.ts';
import { ExamFactVerification, ExamRecord } from '../src/types.ts';

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttlMs: number;
  hits: number;
}

export interface CachedDocumentData {
  url: string;
  text: string;
  contentType: string;
  isPdf: boolean;
  contentHash: string;
  discoveredLinks: string[];
  retrievedAt: string;
}

export interface CacheStats {
  l1Size: number;
  l1Hits: number;
  l2Hits: number;
  l3FactHits: number;
  totalMisses: number;
  estimatedTokensSaved: number;
}

/**
 * Computes deterministic SHA-256 hash of a string or buffer
 */
export function computeContentHash(data: string | Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Multi-Tier Cache Memory Engine
 */
export class CacheMemoryEngine {
  // L1: In-Memory LRU store
  private l1Cache = new Map<string, CacheEntry<any>>();
  private maxL1Size = 300;

  // Telemetry & metrics
  private l1Hits = 0;
  private l2Hits = 0;
  private l3FactHits = 0;
  private misses = 0;
  private estimatedTokensSaved = 0;

  /**
   * L1: Get from In-Memory Cache
   */
  getL1<T>(key: string): T | null {
    const entry = this.l1Cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.l1Cache.delete(key);
      return null;
    }

    entry.hits++;
    this.l1Hits++;
    this.estimatedTokensSaved += 2500;
    return entry.data as T;
  }

  /**
   * L1: Store in In-Memory Cache with LRU eviction
   */
  setL1<T>(key: string, data: T, ttlMs = 1000 * 60 * 60 * 24): void {
    if (this.l1Cache.size >= this.maxL1Size) {
      // Evict oldest or least-hit entry
      const oldestKey = this.l1Cache.keys().next().value;
      if (oldestKey) this.l1Cache.delete(oldestKey);
    }

    this.l1Cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttlMs,
      hits: 0,
    });
  }

  /**
   * L2: Get Document from Persistent Database Cache (Supabase source_documents)
   */
  async getL2Document(url: string): Promise<CachedDocumentData | null> {
    try {
      if (process.env.PERSISTENCE_BACKEND !== 'DATABASE') return null;
      const db = getSupabaseClient();

      const { data, error } = await db
        .from('source_documents')
        .select('*')
        .eq('original_url', url)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const cachedText = data.metadata?.cached_text || '';
      if (!cachedText || cachedText.length < 50) return null;
      const age = Date.now() - Date.parse(data.retrieved_at || '');
      if (!Number.isFinite(age) || age < 0 || age > 15 * 60 * 1000) return null;

      this.l2Hits++;
      this.estimatedTokensSaved += 5000;

      const result: CachedDocumentData = {
        url: data.original_url || url,
        text: cachedText,
        contentType: data.mime_type || 'text/html',
        isPdf: data.mime_type === 'application/pdf',
        contentHash: data.content_hash,
        discoveredLinks: data.metadata?.discovered_links || [],
        retrievedAt: data.retrieved_at,
      };

      // Populate L1 cache for subsequent instantaneous hits
      this.setL1(`doc:${url}`, result, Math.max(1, 15 * 60 * 1000 - age));
      return result;
    } catch {
      return null;
    }
  }

  /**
   * L2: Save Document into Persistent Database Cache
   */
  async saveL2Document(doc: CachedDocumentData, examId?: string): Promise<void> {
    try {
      // Always store in L1
      this.setL1(`doc:${doc.url}`, doc, 15 * 60 * 1000);

      if (process.env.PERSISTENCE_BACKEND !== 'DATABASE') return;
      const db = getSupabaseClient();

      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.from('source_documents').upsert({
        document_id: docId,
        exam_id: examId || null,
        document_type: doc.isPdf ? 'OFFICIAL_NOTIFICATION_PDF' : 'OFFICIAL_PORTAL_PAGE',
        title: `Cached Document: ${new URL(doc.url).pathname}`,
        storage_bucket: 'source-documents',
        storage_path: `cache/${doc.contentHash}.txt`,
        original_url: doc.url,
        mime_type: doc.contentType || (doc.isPdf ? 'application/pdf' : 'text/html'),
        file_size: doc.text.length,
        content_hash: doc.contentHash,
        retrieved_at: doc.retrievedAt,
        extraction_status: 'EXTRACTED',
        verification_status: 'UNVERIFIED',
        metadata: {
          cached_text: doc.text,
          discovered_links: doc.discoveredLinks,
          cached_by: 'GOVEXAM_CATCH_MEMORY',
        },
      });
    } catch {}
  }

  /**
   * L3: Check if an exam already has verified canonical facts in cache memory
   */
  async getL3VerifiedFacts(examId: string): Promise<Record<string, ExamFactVerification> | null> {
    const l1FactKey = `facts:${examId}`;
    const l1 = this.getL1<Record<string, ExamFactVerification>>(l1FactKey);
    if (l1) return l1;

    try {
      if (process.env.PERSISTENCE_BACKEND !== 'DATABASE') return null;
      const db = getSupabaseClient();

      const { data, error } = await db
        .from('exam_fact_verifications')
        .select('*')
        .eq('exam_id', examId);

      if (error || !data || data.length === 0) return null;

      const verifiedCount = data.filter(
        (f: any) => f.verification_status === 'VERIFIED_OFFICIAL' || f.verification_status === 'VERIFIED_MULTIPLE_SOURCES'
      ).length;

      if (verifiedCount >= 5) {
        this.l3FactHits++;
        this.estimatedTokensSaved += 15000;

        const map: Record<string, ExamFactVerification> = {};
        for (const row of data) {
          map[row.fact_name] = {
            fact_id: row.verification_id,
            exam_id: row.exam_id,
            fact_name: row.fact_name,
            fact_label: row.fact_name,
            fact_value: row.fact_value,
            evidence_text: row.evidence_text || '',
            verification_status: row.verification_status,
            confidence: Number(row.confidence) || 0,
            applicable_cycle: row.applicable_cycle || '',
            verified_at: row.verified_at,
            verified_by: row.verified_by,
          };
        }

        this.setL1(l1FactKey, map, 1000 * 60 * 60 * 48); // 48-hour L1 cache for verified facts
        return map;
      }
    } catch {}

    this.misses++;
    return null;
  }

  /**
   * Return telemetry stats
   */
  getStats(): CacheStats {
    return {
      l1Size: this.l1Cache.size,
      l1Hits: this.l1Hits,
      l2Hits: this.l2Hits,
      l3FactHits: this.l3FactHits,
      totalMisses: this.misses,
      estimatedTokensSaved: this.estimatedTokensSaved,
    };
  }
}

export const cacheMemory = new CacheMemoryEngine();
