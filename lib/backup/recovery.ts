/**
 * Recovery Service
 * Handles database and file restoration from backups
 * Supports point-in-time recovery, dry-run testing, and rollback
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { databaseBackupService, BackupMetadata } from './database-backup';
import { fileBackupService, FileBackupMetadata } from './file-backup';

const execAsync = promisify(exec);

export interface RecoveryOptions {
  backupId: string;
  dryRun?: boolean;
  targetDatabase?: string;
  targetDirectory?: string;
  verify?: boolean;
}

export interface RecoveryResult {
  success: boolean;
  backupId: string;
  type: 'database' | 'files' | 'full';
  startTime: Date;
  endTime: Date;
  duration: number;
  itemsRestored: number;
  errors: string[];
  warnings: string[];
}

export interface PointInTimeRecoveryOptions {
  targetTime: Date;
  backupId?: string;
}

export class RecoveryService {
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

    // Encryption key
    const encryptionSecret = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-backup-key';
    this.encryptionKey = crypto.scryptSync(encryptionSecret, 'salt', 32);
  }

  /**
   * Restore database from backup
   */
  async restoreDatabase(options: RecoveryOptions): Promise<RecoveryResult> {
    console.log(`[Recovery] Starting database restoration from backup: ${options.backupId}`);

    const result: RecoveryResult = {
      success: false,
      backupId: options.backupId,
      type: 'database',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      itemsRestored: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Load backup metadata
      const backups = await databaseBackupService.listBackups();
      const backup = backups.find(b => b.id === options.backupId);

      if (!backup) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }

      console.log('[Recovery] Backup metadata loaded:', backup);

      // Verify backup if requested
      if (options.verify) {
        console.log('[Recovery] Verifying backup integrity...');
        const isValid = await databaseBackupService.verifyBackup(options.backupId);
        if (!isValid) {
          throw new Error('Backup verification failed');
        }
        console.log('[Recovery] Backup verification successful');
      }

      // Decrypt backup if encrypted
      let restoreFile = backup.filePath;
      if (backup.encrypted) {
        console.log('[Recovery] Decrypting backup...');
        const decryptedFile = path.join(this.backupDir, 'temp', `${options.backupId}_decrypted`);
        await fs.mkdir(path.dirname(decryptedFile), { recursive: true });
        await this.decryptFile(backup.filePath, decryptedFile);
        restoreFile = decryptedFile;
      }

      // Decompress backup if compressed
      if (backup.compressed) {
        console.log('[Recovery] Decompressing backup...');
        const decompressedFile = restoreFile.replace(/\.gz$/, '');
        await this.decompressFile(restoreFile, decompressedFile);

        // Clean up encrypted file if it was created
        if (backup.encrypted) {
          await fs.unlink(restoreFile);
        }

        restoreFile = decompressedFile;
      }

      // Dry run mode - just verify we can read the file
      if (options.dryRun) {
        console.log('[Recovery] DRY RUN MODE - No actual restoration will be performed');

        // Check if we can read the SQL file
        const stats = await fs.stat(restoreFile);
        console.log(`[Recovery] Backup file readable: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

        result.success = true;
        result.warnings.push('Dry run mode - no actual restoration performed');

        // Cleanup temp files
        await this.cleanupTempFiles(restoreFile);

        return result;
      }

      // Perform actual database restoration
      console.log('[Recovery] Restoring database...');
      console.warn('[Recovery] WARNING: This will OVERWRITE the current database!');

      const targetDb = options.targetDatabase || this.pgDatabase;

      // Restore database
      await this.executePgRestore(restoreFile, targetDb);

      console.log('[Recovery] Database restoration completed successfully');

      result.success = true;
      result.itemsRestored = 1; // Database restored

      // Cleanup temp files
      await this.cleanupTempFiles(restoreFile);

    } catch (error) {
      console.error('[Recovery] Database restoration failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.success = false;
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();

    return result;
  }

  /**
   * Restore files from backup
   */
  async restoreFiles(options: RecoveryOptions): Promise<RecoveryResult> {
    console.log(`[Recovery] Starting file restoration from backup: ${options.backupId}`);

    const result: RecoveryResult = {
      success: false,
      backupId: options.backupId,
      type: 'files',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      itemsRestored: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Load backup metadata
      const backups = await fileBackupService.listBackups();
      const backup = backups.find(b => b.id === options.backupId);

      if (!backup) {
        throw new Error(`File backup not found: ${options.backupId}`);
      }

      console.log('[Recovery] File backup metadata loaded:', {
        id: backup.id,
        files: backup.filesBackedUp,
        size: backup.totalSize,
      });

      // Verify backup if requested
      if (options.verify) {
        console.log('[Recovery] Verifying backup integrity...');
        const isValid = await fileBackupService.verifyBackup(options.backupId);
        if (!isValid) {
          throw new Error('Backup verification failed');
        }
      }

      if (backup.archivePath === 'none') {
        console.log('[Recovery] No files to restore (empty backup)');
        result.success = true;
        return result;
      }

      // Extract archive
      const extractDir = options.targetDirectory || process.cwd();

      if (options.dryRun) {
        console.log('[Recovery] DRY RUN MODE - Listing files in backup...');
        await this.listArchiveContents(backup.archivePath);
        result.success = true;
        result.warnings.push('Dry run mode - no actual restoration performed');
        return result;
      }

      console.log(`[Recovery] Extracting files to: ${extractDir}`);
      console.warn('[Recovery] WARNING: This will OVERWRITE existing files!');

      await this.extractArchive(backup.archivePath, extractDir);

      result.success = true;
      result.itemsRestored = backup.filesBackedUp;

      console.log(`[Recovery] File restoration completed: ${backup.filesBackedUp} files restored`);

    } catch (error) {
      console.error('[Recovery] File restoration failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.success = false;
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();

    return result;
  }

  /**
   * Restore both database and files (full system restore)
   */
  async restoreFull(options: RecoveryOptions): Promise<RecoveryResult> {
    console.log(`[Recovery] Starting full system restoration...`);

    const result: RecoveryResult = {
      success: false,
      backupId: options.backupId,
      type: 'full',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      itemsRestored: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Restore database
      console.log('[Recovery] Step 1: Restoring database...');
      const dbResult = await this.restoreDatabase(options);

      if (!dbResult.success) {
        result.errors.push(...dbResult.errors);
        throw new Error('Database restoration failed');
      }

      result.itemsRestored += dbResult.itemsRestored;
      result.warnings.push(...dbResult.warnings);

      // Restore files
      console.log('[Recovery] Step 2: Restoring files...');
      const fileResult = await this.restoreFiles({
        ...options,
        backupId: options.backupId.replace('caris_', 'file_'),
      });

      if (!fileResult.success) {
        result.warnings.push('File restoration failed, but database was restored successfully');
        result.warnings.push(...fileResult.errors);
      } else {
        result.itemsRestored += fileResult.itemsRestored;
      }

      result.success = dbResult.success;

      console.log('[Recovery] Full system restoration completed');

    } catch (error) {
      console.error('[Recovery] Full restoration failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.success = false;
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();

    return result;
  }

  /**
   * Point-in-time recovery
   * Restore database to a specific point in time
   */
  async pointInTimeRecovery(options: PointInTimeRecoveryOptions): Promise<RecoveryResult> {
    console.log(`[Recovery] Starting point-in-time recovery to: ${options.targetTime}`);

    const result: RecoveryResult = {
      success: false,
      backupId: options.backupId || 'auto-selected',
      type: 'database',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      itemsRestored: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Find the latest backup before the target time
      const backups = await databaseBackupService.listBackups();
      const validBackups = backups.filter(
        b => new Date(b.timestamp) <= options.targetTime && b.status === 'completed'
      );

      if (validBackups.length === 0) {
        throw new Error('No valid backups found before target time');
      }

      const selectedBackup = validBackups[0]; // Already sorted by timestamp descending
      console.log(`[Recovery] Selected backup: ${selectedBackup.id} (${selectedBackup.timestamp})`);

      result.backupId = selectedBackup.id;

      // Restore from the selected backup
      const restoreResult = await this.restoreDatabase({
        backupId: selectedBackup.id,
        verify: true,
      });

      result.success = restoreResult.success;
      result.itemsRestored = restoreResult.itemsRestored;
      result.errors = restoreResult.errors;
      result.warnings = restoreResult.warnings;

      if (result.success) {
        console.log(`[Recovery] Point-in-time recovery successful`);
        result.warnings.push(
          `Restored to backup from ${selectedBackup.timestamp}. ` +
          `Data changes after this time are lost.`
        );
      }

    } catch (error) {
      console.error('[Recovery] Point-in-time recovery failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.success = false;
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();

    return result;
  }

  /**
   * Test restoration (dry run)
   */
  async testRestore(backupId: string): Promise<boolean> {
    console.log(`[Recovery] Testing restoration for backup: ${backupId}`);

    try {
      const result = await this.restoreDatabase({
        backupId,
        dryRun: true,
        verify: true,
      });

      return result.success;
    } catch (error) {
      console.error('[Recovery] Restore test failed:', error);
      return false;
    }
  }

  // Private helper methods

  private async decryptFile(inputFile: string, outputFile: string): Promise<void> {
    const algorithm = 'aes-256-cbc';
    const input = createReadStream(inputFile);
    const output = createWriteStream(outputFile);

    // Read IV from the beginning of the file
    const ivBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      input.once('data', (chunk) => {
        const iv = chunk.slice(0, 16);
        const rest = chunk.slice(16);
        if (rest.length > 0) {
          chunks.push(rest);
        }
        resolve(iv);
      });
      input.once('error', reject);
    });

    const decipher = crypto.createDecipheriv(algorithm, this.encryptionKey, ivBuffer);

    // Continue reading the rest of the file
    await pipeline(input, decipher, output);
  }

  private async decompressFile(inputFile: string, outputFile: string): Promise<void> {
    const gunzip = zlib.createGunzip();
    const source = createReadStream(inputFile);
    const destination = createWriteStream(outputFile);
    await pipeline(source, gunzip, destination);
  }

  private async executePgRestore(sqlFile: string, targetDatabase: string): Promise<void> {
    // WARNING: This will drop and recreate the database
    const restoreCommand = `psql -h ${this.pgHost} -p ${this.pgPort} -U ${this.pgUser} -d ${targetDatabase} -f "${sqlFile}"`;

    await execAsync(restoreCommand, {
      env: {
        ...process.env,
        PGPASSWORD: this.pgPassword,
      },
    });
  }

  private async extractArchive(archivePath: string, extractDir: string): Promise<void> {
    const command = `tar -xzf "${archivePath}" -C "${extractDir}"`;
    await execAsync(command);
  }

  private async listArchiveContents(archivePath: string): Promise<void> {
    const command = `tar -tzf "${archivePath}" | head -n 20`;
    const { stdout } = await execAsync(command);
    console.log('[Recovery] Archive contents (first 20 files):');
    console.log(stdout);
  }

  private async cleanupTempFiles(filePath: string): Promise<void> {
    try {
      const tempDir = path.join(this.backupDir, 'temp');
      if (filePath.startsWith(tempDir)) {
        await fs.unlink(filePath);
        console.log('[Recovery] Temporary file cleaned up');
      }
    } catch (error) {
      console.warn('[Recovery] Failed to cleanup temp file:', error);
    }
  }
}

// Export singleton instance
export const recoveryService = new RecoveryService();
