/**
 * Admin Backup API - Create Backup
 * POST /api/admin/backup/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { databaseBackupService } from '@/lib/backup/database-backup';
import { fileBackupService } from '@/lib/backup/file-backup';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { type = 'full', includeFiles = true } = body;

    if (!['full', 'incremental'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup type. Must be "full" or "incremental"' },
        { status: 400 }
      );
    }

    console.log(`[API] Creating ${type} backup (includeFiles: ${includeFiles})...`);

    // Create database backup
    const dbBackup = type === 'full'
      ? await databaseBackupService.createFullBackup()
      : await databaseBackupService.createIncrementalBackup();

    // Create file backup if requested
    let fileBackup = null;
    if (includeFiles) {
      fileBackup = type === 'full'
        ? await fileBackupService.createFullBackup()
        : await fileBackupService.createIncrementalBackup();
    }

    return NextResponse.json({
      success: true,
      data: {
        database: {
          id: dbBackup.id,
          type: dbBackup.type,
          size: dbBackup.size,
          timestamp: dbBackup.timestamp,
          status: dbBackup.status,
        },
        files: fileBackup ? {
          id: fileBackup.id,
          type: fileBackup.type,
          filesBackedUp: fileBackup.filesBackedUp,
          totalSize: fileBackup.totalSize,
          timestamp: fileBackup.timestamp,
          status: fileBackup.status,
        } : null,
      },
    });

  } catch (error) {
    console.error('[API] Backup creation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create backup',
      },
      { status: 500 }
    );
  }
}
