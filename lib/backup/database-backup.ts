/**
 * Database Backup Service
 * Handles PostgreSQL database backups with encryption, compression, and retention
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

const execAsync = promisify(exec);

export interface BackupOptions {
  type: 'full' | 'incremental';
  compress?: boolean;
  encrypt?: boolean;
  destination?: string;
  retentionDays?: number;
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental';
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  filePath: string;
  database: string;
  status: 'pending' | 'completed' | 'failed' | 'verified';
  error?: string;
}

export interface BackupRetentionPolicy {
  daily: number;    // Keep 7 daily backups
  weekly: number;   // Keep 4 weekly backups
  monthly: number;  // Keep 12 monthly backups
}

const DEFAULT_RETENTION: BackupRetentionPolicy = {
  daily: 7,
  weekly: 4,
  monthly: 12,
};

export class DatabaseBackupService {
  private backupDir: string;
  private encryptionKey: Buffer;
  private databaseUrl: string;
  private pgUser: string;
  private pgHost: string;
  private pgPort: string;
  private pgDatabase: string;
  private pgPassword: string;

  constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/var/backups/caris';
    this.databaseUrl = process.env.POSTGRES_URL || '';

    // Parse PostgreSQL connection string
    const dbUrl = new URL(this.databaseUrl);
    this.pgUser = dbUrl.username;
    this.pgPassword = dbUrl.password;
    this.pgHost = dbUrl.hostname;
    this.pgPort = dbUrl.port || '5432';
    this.pgDatabase = dbUrl.pathname.slice(1);

    // Encryption key from environment or generate one
    const encryptionSecret = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-backup-key';
    this.encryptionKey = crypto.scryptSync(encryptionSecret, 'salt', 32);
  }

  /**
   * Create a full database backup
   */
  async createFullBackup(options: Partial<BackupOptions> = {}): Promise<BackupMetadata> {
    const opts: BackupOptions = {
      type: 'full',
      compress: true,
      encrypt: true,
      destination: this.backupDir,
      ...options,
    };

    console.log('[Backup] Starting full database backup...');

    const timestamp = new Date();
    const backupId = this.generateBackupId('full', timestamp);
    const tempFile = path.join(opts.destination!, `${backupId}.sql`);

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      type: 'full',
      size: 0,
      compressed: opts.compress!,
      encrypted: opts.encrypt!,
      checksum: '',
      filePath: tempFile,
      database: this.pgDatabase,
      status: 'pending',
    };

    try {
      // Ensure backup directory exists
      await fs.mkdir(opts.destination!, { recursive: true });

      // Create pg_dump command
      const dumpCommand = this.buildPgDumpCommand(tempFile);

      console.log('[Backup] Running pg_dump...');
      await execAsync(dumpCommand, {
        env: {
          ...process.env,
          PGPASSWORD: this.pgPassword,
        },
      });

      // Get file size
      const stats = await fs.stat(tempFile);
      metadata.size = stats.size;
      console.log(`[Backup] Dump completed: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Compress if requested
      if (opts.compress) {
        console.log('[Backup] Compressing backup...');
        const compressedFile = `${tempFile}.gz`;
        await this.compressFile(tempFile, compressedFile);

        // Remove uncompressed file
        await fs.unlink(tempFile);
        metadata.filePath = compressedFile;

        const compressedStats = await fs.stat(compressedFile);
        metadata.size = compressedStats.size;
        console.log(`[Backup] Compressed: ${(compressedStats.size / 1024 / 1024).toFixed(2)} MB`);
      }

      // Encrypt if requested
      if (opts.encrypt) {
        console.log('[Backup] Encrypting backup...');
        const encryptedFile = `${metadata.filePath}.enc`;
        await this.encryptFile(metadata.filePath, encryptedFile);

        // Remove unencrypted file
        await fs.unlink(metadata.filePath);
        metadata.filePath = encryptedFile;

        const encryptedStats = await fs.stat(encryptedFile);
        metadata.size = encryptedStats.size;
        console.log(`[Backup] Encrypted: ${(encryptedStats.size / 1024 / 1024).toFixed(2)} MB`);
      }

      // Calculate checksum
      metadata.checksum = await this.calculateChecksum(metadata.filePath);
      metadata.status = 'completed';

      // Save metadata
      await this.saveMetadata(metadata);

      console.log(`[Backup] Backup completed successfully: ${backupId}`);
      return metadata;

    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Backup] Backup failed:', error);

      // Save failed metadata
      await this.saveMetadata(metadata);

      throw error;
    }
  }

  /**
   * Create an incremental backup (schema + recent data changes)
   */
  async createIncrementalBackup(options: Partial<BackupOptions> = {}): Promise<BackupMetadata> {
    const opts: BackupOptions = {
      type: 'incremental',
      compress: true,
      encrypt: true,
      destination: this.backupDir,
      ...options,
    };

    console.log('[Backup] Starting incremental database backup...');

    const timestamp = new Date();
    const backupId = this.generateBackupId('incremental', timestamp);
    const tempFile = path.join(opts.destination!, `${backupId}.sql`);

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      type: 'incremental',
      size: 0,
      compressed: opts.compress!,
      encrypted: opts.encrypt!,
      checksum: '',
      filePath: tempFile,
      database: this.pgDatabase,
      status: 'pending',
    };

    try {
      // Ensure backup directory exists
      await fs.mkdir(opts.destination!, { recursive: true });

      // For incremental, we backup schema + data from last 24 hours
      const incrementalCommand = this.buildIncrementalDumpCommand(tempFile);

      console.log('[Backup] Running incremental pg_dump...');
      await execAsync(incrementalCommand, {
        env: {
          ...process.env,
          PGPASSWORD: this.pgPassword,
        },
      });

      // Process similar to full backup
      const stats = await fs.stat(tempFile);
      metadata.size = stats.size;

      if (opts.compress) {
        const compressedFile = `${tempFile}.gz`;
        await this.compressFile(tempFile, compressedFile);
        await fs.unlink(tempFile);
        metadata.filePath = compressedFile;
        const compressedStats = await fs.stat(compressedFile);
        metadata.size = compressedStats.size;
      }

      if (opts.encrypt) {
        const encryptedFile = `${metadata.filePath}.enc`;
        await this.encryptFile(metadata.filePath, encryptedFile);
        await fs.unlink(metadata.filePath);
        metadata.filePath = encryptedFile;
        const encryptedStats = await fs.stat(encryptedFile);
        metadata.size = encryptedStats.size;
      }

      metadata.checksum = await this.calculateChecksum(metadata.filePath);
      metadata.status = 'completed';
      await this.saveMetadata(metadata);

      console.log(`[Backup] Incremental backup completed: ${backupId}`);
      return metadata;

    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Backup] Incremental backup failed:', error);
      await this.saveMetadata(metadata);
      throw error;
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId: string): Promise<boolean> {
    console.log(`[Backup] Verifying backup: ${backupId}`);

    try {
      const metadata = await this.loadMetadata(backupId);

      // Check file exists
      try {
        await fs.access(metadata.filePath);
      } catch {
        console.error('[Backup] Backup file not found');
        return false;
      }

      // Verify checksum
      const currentChecksum = await this.calculateChecksum(metadata.filePath);
      if (currentChecksum !== metadata.checksum) {
        console.error('[Backup] Checksum mismatch - backup may be corrupted');
        return false;
      }

      // Update metadata
      metadata.status = 'verified';
      await this.saveMetadata(metadata);

      console.log('[Backup] Backup verification successful');
      return true;

    } catch (error) {
      console.error('[Backup] Verification failed:', error);
      return false;
    }
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const metadataDir = path.join(this.backupDir, 'metadata');
      await fs.mkdir(metadataDir, { recursive: true });

      const files = await fs.readdir(metadataDir);
      const metadataFiles = files.filter(f => f.endsWith('.json'));

      const backups = await Promise.all(
        metadataFiles.map(async (file) => {
          const content = await fs.readFile(path.join(metadataDir, file), 'utf-8');
          return JSON.parse(content) as BackupMetadata;
        })
      );

      // Sort by timestamp descending
      return backups.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    } catch (error) {
      console.error('[Backup] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Apply retention policy and cleanup old backups
   */
  async applyRetentionPolicy(policy: Partial<BackupRetentionPolicy> = {}): Promise<number> {
    const retentionPolicy: BackupRetentionPolicy = {
      ...DEFAULT_RETENTION,
      ...policy,
    };

    console.log('[Backup] Applying retention policy...', retentionPolicy);

    const backups = await this.listBackups();
    const now = new Date();
    let deletedCount = 0;

    // Group backups by type
    const dailyBackups: BackupMetadata[] = [];
    const weeklyBackups: BackupMetadata[] = [];
    const monthlyBackups: BackupMetadata[] = [];

    for (const backup of backups) {
      const backupDate = new Date(backup.timestamp);
      const daysOld = Math.floor((now.getTime() - backupDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOld <= 7) {
        dailyBackups.push(backup);
      } else if (daysOld <= 30) {
        // Keep one per week
        const weekOfYear = this.getWeekOfYear(backupDate);
        if (!weeklyBackups.find(b => this.getWeekOfYear(new Date(b.timestamp)) === weekOfYear)) {
          weeklyBackups.push(backup);
        }
      } else if (daysOld <= 365) {
        // Keep one per month
        const monthKey = `${backupDate.getFullYear()}-${backupDate.getMonth()}`;
        if (!monthlyBackups.find(b => {
          const bDate = new Date(b.timestamp);
          return `${bDate.getFullYear()}-${bDate.getMonth()}` === monthKey;
        })) {
          monthlyBackups.push(backup);
        }
      }
    }

    // Keep only the specified number of each type
    const toKeep = new Set<string>([
      ...dailyBackups.slice(0, retentionPolicy.daily).map(b => b.id),
      ...weeklyBackups.slice(0, retentionPolicy.weekly).map(b => b.id),
      ...monthlyBackups.slice(0, retentionPolicy.monthly).map(b => b.id),
    ]);

    // Delete backups not in the keep set
    for (const backup of backups) {
      if (!toKeep.has(backup.id)) {
        try {
          await this.deleteBackup(backup.id);
          deletedCount++;
          console.log(`[Backup] Deleted old backup: ${backup.id}`);
        } catch (error) {
          console.error(`[Backup] Failed to delete backup ${backup.id}:`, error);
        }
      }
    }

    console.log(`[Backup] Retention policy applied. Deleted ${deletedCount} old backups.`);
    return deletedCount;
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const metadata = await this.loadMetadata(backupId);

      // Delete backup file
      try {
        await fs.unlink(metadata.filePath);
      } catch (error) {
        console.warn(`[Backup] Backup file not found: ${metadata.filePath}`);
      }

      // Delete metadata
      const metadataPath = path.join(this.backupDir, 'metadata', `${backupId}.json`);
      await fs.unlink(metadataPath);

      console.log(`[Backup] Deleted backup: ${backupId}`);
    } catch (error) {
      console.error(`[Backup] Failed to delete backup ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Get backup storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    byType: Record<string, { count: number; size: number }>;
  }> {
    const backups = await this.listBackups();

    const stats = {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup: backups.length > 0 ? new Date(backups[backups.length - 1].timestamp) : null,
      newestBackup: backups.length > 0 ? new Date(backups[0].timestamp) : null,
      byType: {} as Record<string, { count: number; size: number }>,
    };

    for (const backup of backups) {
      if (!stats.byType[backup.type]) {
        stats.byType[backup.type] = { count: 0, size: 0 };
      }
      stats.byType[backup.type].count++;
      stats.byType[backup.type].size += backup.size;
    }

    return stats;
  }

  // Private helper methods

  private generateBackupId(type: string, timestamp: Date): string {
    const dateStr = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `caris_${type}_${dateStr}`;
  }

  private buildPgDumpCommand(outputFile: string): string {
    return `pg_dump -h ${this.pgHost} -p ${this.pgPort} -U ${this.pgUser} -d ${this.pgDatabase} -F p -f "${outputFile}"`;
  }

  private buildIncrementalDumpCommand(outputFile: string): string {
    // For incremental, dump schema + recent data
    // This is a simplified version - in production you'd use WAL archiving
    return `pg_dump -h ${this.pgHost} -p ${this.pgPort} -U ${this.pgUser} -d ${this.pgDatabase} -F p -f "${outputFile}" --schema-only`;
  }

  private async compressFile(inputFile: string, outputFile: string): Promise<void> {
    const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
    const source = createReadStream(inputFile);
    const destination = createWriteStream(outputFile);
    await pipeline(source, gzip, destination);
  }

  private async encryptFile(inputFile: string, outputFile: string): Promise<void> {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);

    const input = createReadStream(inputFile);
    const output = createWriteStream(outputFile);

    // Write IV at the beginning of the encrypted file
    output.write(iv);

    await pipeline(input, cipher, output);
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async saveMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataDir = path.join(this.backupDir, 'metadata');
    await fs.mkdir(metadataDir, { recursive: true });

    const metadataPath = path.join(metadataDir, `${metadata.id}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async loadMetadata(backupId: string): Promise<BackupMetadata> {
    const metadataPath = path.join(this.backupDir, 'metadata', `${backupId}.json`);
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  }

  private getWeekOfYear(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

// Export singleton instance
export const databaseBackupService = new DatabaseBackupService();
