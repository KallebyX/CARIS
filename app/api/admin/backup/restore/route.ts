/**
 * Admin Backup API - Restore from Backup
 * POST /api/admin/backup/restore
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recoveryService } from '@/lib/backup/recovery';

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
    const {
      backupId,
      type = 'database',
      dryRun = false,
      verify = true,
    } = body;

    if (!backupId) {
      return NextResponse.json(
        { success: false, error: 'backupId is required' },
        { status: 400 }
      );
    }

    if (!['database', 'files', 'full'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid restore type' },
        { status: 400 }
      );
    }

    console.log(`[API] ${dryRun ? 'Testing' : 'Performing'} ${type} restoration from backup: ${backupId}`);

    // Perform restoration based on type
    let result;
    switch (type) {
      case 'database':
        result = await recoveryService.restoreDatabase({
          backupId,
          dryRun,
          verify,
        });
        break;

      case 'files':
        result = await recoveryService.restoreFiles({
          backupId,
          dryRun,
          verify,
        });
        break;

      case 'full':
        result = await recoveryService.restoreFull({
          backupId,
          dryRun,
          verify,
        });
        break;

      default:
        throw new Error('Invalid restore type');
    }

    return NextResponse.json({
      success: result.success,
      data: {
        backupId: result.backupId,
        type: result.type,
        itemsRestored: result.itemsRestored,
        duration: result.duration,
        durationSeconds: (result.duration / 1000).toFixed(2),
        errors: result.errors,
        warnings: result.warnings,
        dryRun,
      },
    });

  } catch (error) {
    console.error('[API] Restoration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore from backup',
      },
      { status: 500 }
    );
  }
}
