/**
 * Admin Backup API - List Backups
 * GET /api/admin/backup/list
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { databaseBackupService } from '@/lib/backup/database-backup';
import { fileBackupService, type FileBackupMetadata } from '@/lib/backup/file-backup';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeFiles = searchParams.get('includeFiles') !== 'false';
    const includeStats = searchParams.get('includeStats') === 'true';

    // Get database backups
    const dbBackups = await databaseBackupService.listBackups();

    // Get file backups
    let fileBackups: FileBackupMetadata[] = [];
    if (includeFiles) {
      fileBackups = await fileBackupService.listBackups();
    }

    // Get storage stats if requested
    let stats = null;
    if (includeStats) {
      stats = await databaseBackupService.getStorageStats();
    }

    return NextResponse.json({
      success: true,
      data: {
        database: dbBackups.map(b => ({
          id: b.id,
          timestamp: b.timestamp,
          type: b.type,
          size: b.size,
          compressed: b.compressed,
          encrypted: b.encrypted,
          status: b.status,
          checksum: b.checksum,
        })),
        files: fileBackups.map(b => ({
          id: b.id,
          timestamp: b.timestamp,
          type: b.type,
          filesBackedUp: b.filesBackedUp,
          totalSize: b.totalSize,
          compressed: b.compressed,
          status: b.status,
        })),
        stats: stats ? {
          totalBackups: stats.totalBackups,
          totalSize: stats.totalSize,
          totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
          oldestBackup: stats.oldestBackup,
          newestBackup: stats.newestBackup,
          byType: stats.byType,
        } : null,
      },
    });

  } catch (error) {
    console.error('[API] Failed to list backups:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list backups',
      },
      { status: 500 }
    );
  }
}
