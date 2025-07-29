import { ReminderService } from '@/lib/calendar/reminders';

// Initialize reminder service in production
let reminderService: ReminderService | null = null;

if (process.env.NODE_ENV === 'production') {
  reminderService = new ReminderService();
  reminderService.initializeReminderScheduler();
  console.log('Reminder service initialized');
}

export { reminderService };