import { db } from "@/db";
import { sessions, users, userSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse, NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { CalendarIntegrationService } from "@/lib/calendar/integration";
import { z } from "zod";

const createSessionSchema = z.object({
  patientId: z.number(),
  sessionDate: z.string(),
  durationMinutes: z.number().min(15).max(240),
  type: z.enum(['online', 'presencial']),
  notes: z.string().optional(),
  timezone: z.string().optional(),
});

const updateSessionSchema = z.object({
  sessionDate: z.string().optional(),
  durationMinutes: z.number().min(15).max(240).optional(),
  type: z.enum(['online', 'presencial']).optional(),
  status: z.enum(['agendada', 'confirmada', 'realizada', 'cancelada']).optional(),
  notes: z.string().optional(),
  timezone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a psychologist
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || user.role !== 'psychologist') {
      return NextResponse.json({ error: 'Only psychologists can create sessions' }, { status: 403 });
    }

    const body = await request.json();
    const sessionData = createSessionSchema.parse(body);

    // Verify patient exists
    const patient = await db.query.users.findFirst({
      where: and(eq(users.id, sessionData.patientId), eq(users.role, 'patient')),
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Create session
    const newSession = await db.insert(sessions).values({
      psychologistId: userId,
      patientId: sessionData.patientId,
      sessionDate: new Date(sessionData.sessionDate),
      durationMinutes: sessionData.durationMinutes,
      type: sessionData.type,
      status: 'agendada',
      notes: sessionData.notes,
      timezone: sessionData.timezone || 'America/Sao_Paulo',
    }).returning();

    const createdSession = newSession[0];

    // Automatically sync to calendars if integration is enabled
    try {
      const calendarService = new CalendarIntegrationService();
      const syncResult = await calendarService.syncSessionToCalendars(
        createdSession,
        patient,
        user
      );

      console.log('Session synced to calendars:', syncResult);
    } catch (syncError) {
      console.error('Error syncing session to calendars:', syncError);
      // Don't fail the request if calendar sync fails
    }

    return NextResponse.json({
      success: true,
      session: createdSession,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let sessionsList;

    if (user.role === 'psychologist') {
      // Get sessions for psychologist
      sessionsList = await db.query.sessions.findMany({
        where: eq(sessions.psychologistId, userId),
        with: {
          patient: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (sessions, { desc }) => [desc(sessions.sessionDate)],
        limit: 100,
      });
    } else if (user.role === 'patient') {
      // Get sessions for patient
      sessionsList = await db.query.sessions.findMany({
        where: eq(sessions.patientId, userId),
        with: {
          psychologist: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (sessions, { desc }) => [desc(sessions.sessionDate)],
        limit: 100,
      });
    } else {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      sessions: sessionsList,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, ...updateData } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const validatedData = updateSessionSchema.parse(updateData);

    // Get session and verify permissions
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

    // Only psychologist can update sessions
    if (session.psychologistId !== userId) {
      return NextResponse.json({ error: 'Only the psychologist can update this session' }, { status: 403 });
    }

    // Update session
    const updateFields: any = {};
    if (validatedData.sessionDate) updateFields.sessionDate = new Date(validatedData.sessionDate);
    if (validatedData.durationMinutes) updateFields.durationMinutes = validatedData.durationMinutes;
    if (validatedData.type) updateFields.type = validatedData.type;
    if (validatedData.status) updateFields.status = validatedData.status;
    if (validatedData.notes !== undefined) updateFields.notes = validatedData.notes;
    if (validatedData.timezone) updateFields.timezone = validatedData.timezone;

    const updatedSession = await db
      .update(sessions)
      .set(updateFields)
      .where(eq(sessions.id, sessionId))
      .returning();

    // Update calendars if session details changed
    if (validatedData.sessionDate || validatedData.durationMinutes || validatedData.notes) {
      try {
        const calendarService = new CalendarIntegrationService();
        await calendarService.updateSessionInCalendars(
          { ...session, ...updateFields },
          session.patient,
          session.psychologist
        );
      } catch (syncError) {
        console.error('Error updating session in calendars:', syncError);
      }
    }

    return NextResponse.json({
      success: true,
      session: updatedSession[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get session and verify permissions
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only psychologist can delete sessions
    if (session.psychologistId !== userId) {
      return NextResponse.json({ error: 'Only the psychologist can delete this session' }, { status: 403 });
    }

    // Delete from calendars first
    try {
      const calendarService = new CalendarIntegrationService();
      await calendarService.deleteSessionFromCalendars(sessionId);
    } catch (syncError) {
      console.error('Error deleting session from calendars:', syncError);
    }

    // Delete session from database
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}