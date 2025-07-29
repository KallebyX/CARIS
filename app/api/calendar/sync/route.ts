import { NextRequest, NextResponse } from 'next/server';
import { CalendarIntegrationService } from '@/lib/calendar/integration';
import { getUserIdFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const syncSessionSchema = z.object({
  sessionId: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = syncSessionSchema.parse(body);

    // Get session with related data
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        patient: true,
        psychologist: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user has permission (is patient or psychologist in this session)
    if (session.patientId !== userId && session.psychologistId !== userId) {
      return NextResponse.json({ error: 'Not authorized for this session' }, { status: 403 });
    }

    const calendarService = new CalendarIntegrationService();
    
    const result = await calendarService.syncSessionToCalendars(
      session,
      session.patient,
      session.psychologist
    );

    return NextResponse.json({
      success: true,
      message: 'Session synced to calendars',
      googleEventId: result.googleEventId,
      outlookEventId: result.outlookEventId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('Error syncing session to calendars:', error);
    return NextResponse.json(
      { error: 'Failed to sync session to calendars' },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionIdParam = searchParams.get('sessionId');
    
    if (!sessionIdParam) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const sessionId = parseInt(sessionIdParam);
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user has permission
    if (session.patientId !== userId && session.psychologistId !== userId) {
      return NextResponse.json({ error: 'Not authorized for this session' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      syncStatus: {
        googleCalendarSynced: !!session.googleCalendarEventId,
        outlookCalendarSynced: !!session.outlookCalendarEventId,
        googleEventId: session.googleCalendarEventId,
        outlookEventId: session.outlookCalendarEventId,
      },
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    );
  }
}