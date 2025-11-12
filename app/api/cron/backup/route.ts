/**
 * Cron Backup Endpoint
 * GET /api/cron/backup
 *
 * This endpoint is called by external cron services (e.g., Vercel Cron, Render Cron)
 * to trigger automated backups
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupScheduler } from '@/lib/backup/backup-scheduler';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.JWT_SECRET;

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron] Unauthorized backup attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get backup type from query params
    const { searchParams } = new URL(request.url);
    const backupType = searchParams.get('type') || 'incremental';

    console.log(`[Cron] Starting automated ${backupType} backup...`);

    // Run backup
    const result = await backupScheduler.runManualBackup(
      backupType as 'full' | 'incremental'
    );

    return NextResponse.json({
      success: true,
      message: `${backupType} backup completed successfully`,
      data: {
        database: {
          id: result.database.id,
          size: result.database.size,
          status: result.database.status,
        },
        files: {
          id: result.files.id,
          filesBackedUp: result.files.filesBackedUp,
          totalSize: result.files.totalSize,
          status: result.files.status,
        },
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Cron] Backup failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Backup failed',
      },
      { status: 500 }
    );
  }
}

// Also support POST for some cron services
export async function POST(request: NextRequest) {
  return GET(request);
}
