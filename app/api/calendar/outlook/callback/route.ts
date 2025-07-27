import { NextRequest, NextResponse } from 'next/server';
import { OutlookCalendarService } from '@/lib/calendar/outlook';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/settings/calendar?error=access_denied`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`/dashboard/settings/calendar?error=invalid_request`, request.url)
      );
    }

    const userId = parseInt(state);
    if (isNaN(userId)) {
      return NextResponse.redirect(
        new URL(`/dashboard/settings/calendar?error=invalid_user`, request.url)
      );
    }

    const outlookService = new OutlookCalendarService();
    const tokens = await outlookService.getTokensFromCode(
      code, 
      process.env.MICROSOFT_REDIRECT_URI!
    );

    if (!tokens.accessToken) {
      return NextResponse.redirect(
        new URL(`/dashboard/settings/calendar?error=token_error`, request.url)
      );
    }

    // Check if user settings exist, create if not
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (existingSettings) {
      // Update existing settings
      await db
        .update(userSettings)
        .set({
          outlookCalendarEnabled: true,
          outlookCalendarAccessToken: tokens.accessToken,
          outlookCalendarRefreshToken: tokens.refreshToken || null,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));
    } else {
      // Create new settings
      await db.insert(userSettings).values({
        userId: userId,
        outlookCalendarEnabled: true,
        outlookCalendarAccessToken: tokens.accessToken,
        outlookCalendarRefreshToken: tokens.refreshToken || null,
      });
    }

    return NextResponse.redirect(
      new URL(`/dashboard/settings/calendar?success=outlook_connected`, request.url)
    );
  } catch (error) {
    console.error('Error in Outlook Calendar callback:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/settings/calendar?error=callback_error`, request.url)
    );
  }
}