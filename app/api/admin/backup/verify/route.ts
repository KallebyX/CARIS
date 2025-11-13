/**
 * Admin Backup API - Verify Backup Integrity
 * POST /api/admin/backup/verify
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
    const { backupId, type = 'database' } = body;

    if (!backupId) {
      return NextResponse.json(
        { success: false, error: 'backupId is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Verifying ${type} backup: ${backupId}`);

    let isValid = false;
    let details: any = {};

    switch (type) {
      case 'database':
        isValid = await databaseBackupService.verifyBackup(backupId);
        break;

      case 'files':
        isValid = await fileBackupService.verifyBackup(backupId);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid backup type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        backupId,
        type,
        isValid,
        message: isValid ? 'Backup verification successful' : 'Backup verification failed',
        details,
      },
    });

  } catch (error) {
    console.error('[API] Backup verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify backup',
      },
      { status: 500 }
    );
  }
}
