/**
 * File Storage Backup Service
 * Handles backup of uploaded files (diary images, avatars, documents)
 * with deduplication, versioning, and cloud storage integration
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import * as zlib from 'zlib';

export interface FileBackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental';
  filesBackedUp: number;
  totalSize: number;
  compressed: boolean;
  checksum: string;
  archivePath: string;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  fileManifest: FileManifestEntry[];
}

export interface FileManifestEntry {
  originalPath: string;
  relativePath: string;
  size: number;
  checksum: string;
  modifiedAt: Date;
  isDeduped: boolean;
}

export interface CloudStorageConfig {
  provider: 'r2' | 's3' | 'local';
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class FileBackupService {
  private backupDir: string;
  private uploadDirs: string[];
  private lastBackupTimestamp: Date | null = null;
  private deduplicationMap: Map<string, string> = new Map();

  constructor() {
    this.backupDir = process.env.FILE_BACKUP_DIR || '/var/backups/caris/files';

    // Directories to backup
    this.uploadDirs = [
      path.join(process.cwd(), 'public/uploads'),
      path.join(process.cwd(), 'public/avatars'),
      path.join(process.cwd(), 'public/diary-images'),
      path.join(process.cwd(), 'public/documents'),
    ];
  }

  /**
   * Create a full file backup
   */
  async createFullBackup(): Promise<FileBackupMetadata> {
    console.log('[FileBackup] Starting full file backup...');

    const timestamp = new Date();
    const backupId = this.generateBackupId('full', timestamp);

    const metadata: FileBackupMetadata = {
      id: backupId,
      timestamp,
      type: 'full',
      filesBackedUp: 0,
      totalSize: 0,
      compressed: true,
      checksum: '',
      archivePath: '',
      status: 'pending',
      fileManifest: [],
    };

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Collect all files to backup
      const filesToBackup = await this.collectFiles(this.uploadDirs);
      console.log(`[FileBackup] Found ${filesToBackup.length} files to backup`);

      // Create temporary directory for staging
      const stagingDir = path.join(this.backupDir, 'staging', backupId);
      await fs.mkdir(stagingDir, { recursive: true });

      // Copy files with deduplication
      const manifest: FileManifestEntry[] = [];
      let totalSize = 0;

      for (const file of filesToBackup) {
        const fileChecksum = await this.calculateFileChecksum(file.path);
        const relativePath = this.getRelativePath(file.path);

        // Check if file already exists (deduplication)
        const isDeduped = this.deduplicationMap.has(fileChecksum);

        if (!isDeduped) {
          // Copy file to staging
          const destPath = path.join(stagingDir, relativePath);
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(file.path, destPath);

          this.deduplicationMap.set(fileChecksum, relativePath);
        }

        manifest.push({
          originalPath: file.path,
          relativePath,
          size: file.size,
          checksum: fileChecksum,
          modifiedAt: file.modifiedAt,
          isDeduped,
        });

        totalSize += file.size;
      }

      metadata.filesBackedUp = filesToBackup.length;
      metadata.totalSize = totalSize;
      metadata.fileManifest = manifest;

      // Create tarball
      console.log('[FileBackup] Creating archive...');
      const archivePath = path.join(this.backupDir, `${backupId}.tar.gz`);
      await this.createTarball(stagingDir, archivePath);

      // Cleanup staging directory
      await fs.rm(stagingDir, { recursive: true });

      metadata.archivePath = archivePath;

      // Calculate archive checksum
      metadata.checksum = await this.calculateFileChecksum(archivePath);
      metadata.status = 'completed';

      // Save metadata
      await this.saveMetadata(metadata);

      const archiveStats = await fs.stat(archivePath);
      console.log(`[FileBackup] Backup completed: ${(archiveStats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`[FileBackup] Deduplication saved: ${manifest.filter(f => f.isDeduped).length} files`);

      this.lastBackupTimestamp = timestamp;

      return metadata;

    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FileBackup] Backup failed:', error);
      await this.saveMetadata(metadata);
      throw error;
    }
  }

  /**
   * Create an incremental file backup (only changed files since last backup)
   */
  async createIncrementalBackup(): Promise<FileBackupMetadata> {
    console.log('[FileBackup] Starting incremental file backup...');

    if (!this.lastBackupTimestamp) {
      // Load last backup timestamp from metadata
      const backups = await this.listBackups();
      if (backups.length > 0) {
        this.lastBackupTimestamp = new Date(backups[0].timestamp);
      }
    }

    const timestamp = new Date();
    const backupId = this.generateBackupId('incremental', timestamp);

    const metadata: FileBackupMetadata = {
      id: backupId,
      timestamp,
      type: 'incremental',
      filesBackedUp: 0,
      totalSize: 0,
      compressed: true,
      checksum: '',
      archivePath: '',
      status: 'pending',
      fileManifest: [],
    };

    try {
      await fs.mkdir(this.backupDir, { recursive: true });

      // Collect files modified since last backup
      const allFiles = await this.collectFiles(this.uploadDirs);
      const changedFiles = this.lastBackupTimestamp
        ? allFiles.filter(f => f.modifiedAt > this.lastBackupTimestamp!)
        : allFiles;

      console.log(`[FileBackup] Found ${changedFiles.length} changed files since last backup`);

      if (changedFiles.length === 0) {
        console.log('[FileBackup] No changes detected, skipping backup');
        metadata.status = 'completed';
        metadata.archivePath = 'none';
        await this.saveMetadata(metadata);
        return metadata;
      }

      // Create staging directory
      const stagingDir = path.join(this.backupDir, 'staging', backupId);
      await fs.mkdir(stagingDir, { recursive: true });

      // Copy changed files
      const manifest: FileManifestEntry[] = [];
      let totalSize = 0;

      for (const file of changedFiles) {
        const fileChecksum = await this.calculateFileChecksum(file.path);
        const relativePath = this.getRelativePath(file.path);

        const destPath = path.join(stagingDir, relativePath);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(file.path, destPath);

        manifest.push({
          originalPath: file.path,
          relativePath,
          size: file.size,
          checksum: fileChecksum,
          modifiedAt: file.modifiedAt,
          isDeduped: false,
        });

        totalSize += file.size;
      }

      metadata.filesBackedUp = changedFiles.length;
      metadata.totalSize = totalSize;
      metadata.fileManifest = manifest;

      // Create archive
      const archivePath = path.join(this.backupDir, `${backupId}.tar.gz`);
      await this.createTarball(stagingDir, archivePath);

      // Cleanup staging
      await fs.rm(stagingDir, { recursive: true });

      metadata.archivePath = archivePath;
      metadata.checksum = await this.calculateFileChecksum(archivePath);
      metadata.status = 'completed';

      await this.saveMetadata(metadata);

      this.lastBackupTimestamp = timestamp;

      console.log(`[FileBackup] Incremental backup completed: ${changedFiles.length} files`);

      return metadata;

    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FileBackup] Incremental backup failed:', error);
      await this.saveMetadata(metadata);
      throw error;
    }
  }

  /**
   * Upload backup to cloud storage (Cloudflare R2 or S3)
   */
  async uploadToCloud(backupId: string, config: CloudStorageConfig): Promise<boolean> {
    console.log(`[FileBackup] Uploading backup ${backupId} to cloud...`);

    try {
      const metadata = await this.loadMetadata(backupId);

      if (config.provider === 'local') {
        console.log('[FileBackup] Cloud storage not configured, skipping upload');
        return false;
      }

      // In production, integrate with AWS SDK or Cloudflare R2 API
      // For now, this is a placeholder
      console.log(`[FileBackup] Cloud upload to ${config.provider} (placeholder)`);

      // Example S3/R2 upload would look like:
      // const s3 = new S3Client({ region: config.region, credentials: {...} });
      // await s3.send(new PutObjectCommand({
      //   Bucket: config.bucket,
      //   Key: `backups/${backupId}.tar.gz`,
      //   Body: createReadStream(metadata.archivePath)
      // }));

      return true;

    } catch (error) {
      console.error('[FileBackup] Cloud upload failed:', error);
      return false;
    }
  }

  /**
   * List all file backups
   */
  async listBackups(): Promise<FileBackupMetadata[]> {
    try {
      const metadataDir = path.join(this.backupDir, 'metadata');
      await fs.mkdir(metadataDir, { recursive: true });

      const files = await fs.readdir(metadataDir);
      const metadataFiles = files.filter(f => f.endsWith('.json') && f.startsWith('file_'));

      const backups = await Promise.all(
        metadataFiles.map(async (file) => {
          const content = await fs.readFile(path.join(metadataDir, file), 'utf-8');
          return JSON.parse(content) as FileBackupMetadata;
        })
      );

      return backups.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    } catch (error) {
      console.error('[FileBackup] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Verify file backup integrity
   */
  async verifyBackup(backupId: string): Promise<boolean> {
    console.log(`[FileBackup] Verifying backup: ${backupId}`);

    try {
      const metadata = await this.loadMetadata(backupId);

      // Check file exists
      try {
        await fs.access(metadata.archivePath);
      } catch {
        console.error('[FileBackup] Backup file not found');
        return false;
      }

      // Verify checksum
      const currentChecksum = await this.calculateFileChecksum(metadata.archivePath);
      if (currentChecksum !== metadata.checksum) {
        console.error('[FileBackup] Checksum mismatch - backup may be corrupted');
        return false;
      }

      console.log('[FileBackup] Backup verification successful');
      return true;

    } catch (error) {
      console.error('[FileBackup] Verification failed:', error);
      return false;
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  async cleanupOldBackups(retentionDays: number = 30): Promise<number> {
    console.log(`[FileBackup] Cleaning up backups older than ${retentionDays} days...`);

    const backups = await this.listBackups();
    const now = new Date();
    let deletedCount = 0;

    for (const backup of backups) {
      const backupDate = new Date(backup.timestamp);
      const daysOld = Math.floor((now.getTime() - backupDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOld > retentionDays) {
        try {
          // Delete archive file
          if (backup.archivePath && backup.archivePath !== 'none') {
            await fs.unlink(backup.archivePath);
          }

          // Delete metadata
          const metadataPath = path.join(this.backupDir, 'metadata', `${backup.id}.json`);
          await fs.unlink(metadataPath);

          deletedCount++;
          console.log(`[FileBackup] Deleted old backup: ${backup.id}`);

        } catch (error) {
          console.error(`[FileBackup] Failed to delete backup ${backup.id}:`, error);
        }
      }
    }

    console.log(`[FileBackup] Cleanup completed. Deleted ${deletedCount} old backups.`);
    return deletedCount;
  }

  // Private helper methods

  private async collectFiles(directories: string[]): Promise<Array<{
    path: string;
    size: number;
    modifiedAt: Date;
  }>> {
    const files: Array<{ path: string; size: number; modifiedAt: Date }> = [];

    for (const dir of directories) {
      try {
        await fs.access(dir);
        const dirFiles = await this.scanDirectory(dir);
        files.push(...dirFiles);
      } catch {
        console.warn(`[FileBackup] Directory not found or inaccessible: ${dir}`);
      }
    }

    return files;
  }

  private async scanDirectory(dirPath: string): Promise<Array<{
    path: string;
    size: number;
    modifiedAt: Date;
  }>> {
    const files: Array<{ path: string; size: number; modifiedAt: Date }> = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.scanDirectory(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        files.push({
          path: fullPath,
          size: stats.size,
          modifiedAt: stats.mtime,
        });
      }
    }

    return files;
  }

  private getRelativePath(filePath: string): string {
    const cwd = process.cwd();
    return path.relative(cwd, filePath);
  }

  private async createTarball(sourceDir: string, outputPath: string): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Create compressed tarball
    const command = `tar -czf "${outputPath}" -C "${sourceDir}" .`;
    await execAsync(command);
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private generateBackupId(type: string, timestamp: Date): string {
    const dateStr = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `file_${type}_${dateStr}`;
  }

  private async saveMetadata(metadata: FileBackupMetadata): Promise<void> {
    const metadataDir = path.join(this.backupDir, 'metadata');
    await fs.mkdir(metadataDir, { recursive: true });

    const metadataPath = path.join(metadataDir, `${metadata.id}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async loadMetadata(backupId: string): Promise<FileBackupMetadata> {
    const metadataPath = path.join(this.backupDir, 'metadata', `${backupId}.json`);
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  }
}

// Export singleton instance
export const fileBackupService = new FileBackupService();
