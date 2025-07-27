import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const settingsSchema = z.object({
  timezone: z.string().optional(),
  emailRemindersEnabled: z.boolean().optional(),
  smsRemindersEnabled: z.boolean().optional(),
  reminderBefore24h: z.boolean().optional(),
  reminderBefore1h: z.boolean().optional(),
  reminderBefore15min: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        success: true,
        settings: {
          timezone: 'America/Sao_Paulo',
          googleCalendarEnabled: false,
          outlookCalendarEnabled: false,
          emailRemindersEnabled: true,
          smsRemindersEnabled: false,
          reminderBefore24h: true,
          reminderBefore1h: true,
          reminderBefore15min: false,
        },
      });
    }

    // Don't return sensitive tokens in the response
    const publicSettings = {
      timezone: settings.timezone,
      googleCalendarEnabled: settings.googleCalendarEnabled,
      outlookCalendarEnabled: settings.outlookCalendarEnabled,
      emailRemindersEnabled: settings.emailRemindersEnabled,
      smsRemindersEnabled: settings.smsRemindersEnabled,
      reminderBefore24h: settings.reminderBefore24h,
      reminderBefore1h: settings.reminderBefore1h,
      reminderBefore15min: settings.reminderBefore15min,
    };

    return NextResponse.json({
      success: true,
      settings: publicSettings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
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
    const validatedData = settingsSchema.parse(body);

    // Check if settings exist
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    let updatedSettings;

    if (existingSettings) {
      // Update existing settings
      updatedSettings = await db
        .update(userSettings)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
        .returning();
    } else {
      // Create new settings
      updatedSettings = await db
        .insert(userSettings)
        .values({
          userId: userId,
          ...validatedData,
        })
        .returning();
    }

    // Return updated settings without sensitive tokens
    const publicSettings = {
      timezone: updatedSettings[0].timezone,
      googleCalendarEnabled: updatedSettings[0].googleCalendarEnabled,
      outlookCalendarEnabled: updatedSettings[0].outlookCalendarEnabled,
      emailRemindersEnabled: updatedSettings[0].emailRemindersEnabled,
      smsRemindersEnabled: updatedSettings[0].smsRemindersEnabled,
      reminderBefore24h: updatedSettings[0].reminderBefore24h,
      reminderBefore1h: updatedSettings[0].reminderBefore1h,
      reminderBefore15min: updatedSettings[0].reminderBefore15min,
    };

    return NextResponse.json({
      success: true,
      settings: publicSettings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', issues: error.issues },
        { status: 422 }
      );
    }

    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// Disconnect calendar integration
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider'); // 'google' or 'outlook'

    if (!provider || !['google', 'outlook'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const updateData: any = { updatedAt: new Date() };

    if (provider === 'google') {
      updateData.googleCalendarEnabled = false;
      updateData.googleCalendarAccessToken = null;
      updateData.googleCalendarRefreshToken = null;
    } else if (provider === 'outlook') {
      updateData.outlookCalendarEnabled = false;
      updateData.outlookCalendarAccessToken = null;
      updateData.outlookCalendarRefreshToken = null;
    }

    await db
      .update(userSettings)
      .set(updateData)
      .where(eq(userSettings.userId, userId));

    return NextResponse.json({
      success: true,
      message: `${provider === 'google' ? 'Google' : 'Outlook'} Calendar disconnected successfully`,
    });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect calendar' },
      { status: 500 }
    );
  }
}