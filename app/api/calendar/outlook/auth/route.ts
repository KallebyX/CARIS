import { NextRequest, NextResponse } from 'next/server';
import { OutlookCalendarService } from '@/lib/calendar/outlook';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outlookService = new OutlookCalendarService();
    const authUrl = outlookService.getAuthUrl(userId.toString());

    return NextResponse.json({ 
      success: true,
      authUrl 
    });
  } catch (error) {
    console.error('Error generating Outlook Calendar auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}