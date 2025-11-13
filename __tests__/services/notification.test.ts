import { NotificationService } from '@/lib/notification-service'
import { EmailService } from '@/lib/email'
import { SMSService } from '@/lib/sms'
import { PushNotificationService } from '@/lib/push-notifications'
import { db } from '@/db'
import { mockDbQueryBuilder } from '@/test-utils/api-mocks'
import { mockUser, mockPatientProfile, mockNotificationPreferences } from '@/test-utils/mocks'

jest.mock('@/lib/email')
jest.mock('@/lib/sms')
jest.mock('@/lib/push-notifications')
jest.mock('@/db')

describe('NotificationService', () => {
  let notificationService: NotificationService
  let mockEmailService: jest.Mocked<EmailService>
  let mockSMSService: jest.Mocked<SMSService>
  let mockPushService: jest.Mocked<PushNotificationService>

  beforeEach(() => {
    jest.clearAllMocks()

    // Get mock instances
    mockEmailService = EmailService.getInstance() as jest.Mocked<EmailService>
    mockSMSService = SMSService.getInstance() as jest.Mocked<SMSService>
    mockPushService = PushNotificationService.getInstance() as jest.Mocked<PushNotificationService>

    notificationService = NotificationService.getInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      // Arrange & Act
      const instance1 = NotificationService.getInstance()
      const instance2 = NotificationService.getInstance()

      // Assert
      expect(instance1).toBe(instance2)
    })
  })

  describe('sendSessionReminder', () => {
    it('should send email, SMS, and push notification when all are enabled', async () => {
      // Arrange
      const mockUserData = {
        id: 1,
        name: 'Test Patient',
        email: 'patient@test.com',
        phone: '+5511999999999',
        role: 'patient',
        emailNotifications: true,
        pushNotifications: true,
        sessionReminders: true,
        diaryReminders: true,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockUserData])
      )

      const sessionDate = new Date('2024-12-01T10:00:00')
      const psychologistName = 'Dr. Smith'
      const sessionType = 'online'

      // Act
      await notificationService.sendSessionReminder(
        1,
        sessionDate,
        psychologistName,
        sessionType
      )

      // Assert
      expect(mockEmailService.sendSessionReminder).toHaveBeenCalledWith(
        'patient@test.com',
        'Test Patient',
        sessionDate,
        psychologistName,
        sessionType
      )
      expect(mockSMSService.sendSessionReminderSMS).toHaveBeenCalledWith(
        '+5511999999999',
        'Test Patient',
        sessionDate,
        psychologistName
      )
    })

    it('should not send notifications when session reminders are disabled', async () => {
      // Arrange
      const mockUserData = {
        id: 1,
        name: 'Test Patient',
        email: 'patient@test.com',
        role: 'patient',
        emailNotifications: true,
        pushNotifications: true,
        sessionReminders: false, // Disabled
        diaryReminders: true,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockUserData])
      )

      // Act
      await notificationService.sendSessionReminder(
        1,
        new Date(),
        'Dr. Smith',
        'online'
      )

      // Assert
      expect(mockEmailService.sendSessionReminder).not.toHaveBeenCalled()
      expect(mockSMSService.sendSessionReminderSMS).not.toHaveBeenCalled()
    })

    it('should not send email when email notifications are disabled', async () => {
      // Arrange
      const mockUserData = {
        id: 1,
        name: 'Test Patient',
        email: 'patient@test.com',
        phone: '+5511999999999',
        role: 'patient',
        emailNotifications: false, // Disabled
        pushNotifications: true,
        sessionReminders: true,
        diaryReminders: true,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockUserData])
      )

      // Act
      await notificationService.sendSessionReminder(
        1,
        new Date(),
        'Dr. Smith',
        'online'
      )

      // Assert
      expect(mockEmailService.sendSessionReminder).not.toHaveBeenCalled()
      expect(mockSMSService.sendSessionReminderSMS).toHaveBeenCalled() // SMS still sent
    })

    it('should handle user not found', async () => {
      // Arrange
      ;(db.select as jest.Mock).mockReturnValue(mockDbQueryBuilder.select([]))

      // Act
      await notificationService.sendSessionReminder(
        999,
        new Date(),
        'Dr. Smith',
        'online'
      )

      // Assert
      expect(mockEmailService.sendSessionReminder).not.toHaveBeenCalled()
      expect(mockSMSService.sendSessionReminderSMS).not.toHaveBeenCalled()
    })
  })

  describe('sendSessionConfirmation', () => {
    it('should send session confirmation via email and SMS', async () => {
      // Arrange
      const mockUserData = {
        id: 1,
        name: 'Test Patient',
        email: 'patient@test.com',
        phone: '+5511999999999',
        role: 'patient',
        emailNotifications: true,
        pushNotifications: true,
        sessionReminders: true,
        diaryReminders: true,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockUserData])
      )

      const sessionDate = new Date('2024-12-01T10:00:00')

      // Act
      await notificationService.sendSessionConfirmation(
        1,
        sessionDate,
        'Dr. Smith',
        'online'
      )

      // Assert
      expect(mockEmailService.sendSessionConfirmation).toHaveBeenCalled()
      expect(mockSMSService.sendSessionConfirmationSMS).toHaveBeenCalled()
    })

    it('should not send confirmation when user not found', async () => {
      // Arrange
      ;(db.select as jest.Mock).mockReturnValue(mockDbQueryBuilder.select([]))

      // Act
      await notificationService.sendSessionConfirmation(
        999,
        new Date(),
        'Dr. Smith',
        'online'
      )

      // Assert
      expect(mockEmailService.sendSessionConfirmation).not.toHaveBeenCalled()
    })
  })

  describe('sendDiaryEntryNotification', () => {
    it('should send diary notification to psychologist', async () => {
      // Arrange
      const mockPsychologistData = {
        id: 2,
        name: 'Dr. Smith',
        email: 'psychologist@test.com',
        role: 'psychologist',
        emailNotifications: true,
        pushNotifications: true,
        sessionReminders: true,
        diaryReminders: true,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockPsychologistData])
      )

      // Act
      await notificationService.sendDiaryEntryNotification(
        2,
        'Test Patient',
        'New diary entry'
      )

      // Assert
      expect(mockEmailService.sendDiaryNotification).toHaveBeenCalledWith(
        'psychologist@test.com',
        'Dr. Smith',
        'Test Patient',
        'New diary entry'
      )
    })

    it('should not send when diary reminders are disabled', async () => {
      // Arrange
      const mockPsychologistData = {
        id: 2,
        name: 'Dr. Smith',
        email: 'psychologist@test.com',
        role: 'psychologist',
        emailNotifications: true,
        pushNotifications: true,
        sessionReminders: true,
        diaryReminders: false, // Disabled
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockPsychologistData])
      )

      // Act
      await notificationService.sendDiaryEntryNotification(
        2,
        'Test Patient',
        'New diary entry'
      )

      // Assert
      expect(mockEmailService.sendDiaryNotification).not.toHaveBeenCalled()
    })
  })

  describe('sendSOSAlert', () => {
    it('should always send SOS alerts regardless of preferences', async () => {
      // Arrange
      const mockPsychologistData = {
        id: 2,
        name: 'Dr. Smith',
        email: 'psychologist@test.com',
        phone: '+5511888888888',
        role: 'psychologist',
        emailNotifications: false, // Even with notifications disabled
        pushNotifications: false,
        sessionReminders: false,
        diaryReminders: false,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockPsychologistData])
      )

      // Act
      await notificationService.sendSOSAlert(
        2,
        'Emergency Patient',
        '+5511999999999'
      )

      // Assert - SOS should bypass preferences
      expect(mockEmailService.sendEmail).toHaveBeenCalled()
      expect(mockSMSService.sendEmergencySMS).toHaveBeenCalledWith(
        '+5511888888888',
        'Emergency Patient',
        'Dr. Smith'
      )
    })

    it('should include patient phone in alert', async () => {
      // Arrange
      const mockPsychologistData = {
        id: 2,
        name: 'Dr. Smith',
        email: 'psychologist@test.com',
        phone: '+5511888888888',
        role: 'psychologist',
        emailNotifications: true,
        pushNotifications: true,
        sessionReminders: true,
        diaryReminders: true,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockPsychologistData])
      )

      const patientPhone = '+5511999999999'

      // Act
      await notificationService.sendSOSAlert(
        2,
        'Emergency Patient',
        patientPhone
      )

      // Assert
      const emailCall = (mockEmailService.sendEmail as jest.Mock).mock.calls[0][0]
      expect(emailCall.html).toContain(patientPhone)
    })

    it('should handle SOS alert when user not found', async () => {
      // Arrange
      ;(db.select as jest.Mock).mockReturnValue(mockDbQueryBuilder.select([]))

      // Act
      await notificationService.sendSOSAlert(999, 'Emergency Patient')

      // Assert
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled()
    })
  })

  describe('sendChatMessageNotification', () => {
    it('should send push notification for chat message', async () => {
      // Arrange
      const mockReceiverData = {
        id: 2,
        name: 'Receiver',
        email: 'receiver@test.com',
        role: 'patient',
        emailNotifications: true,
        pushNotifications: true,
        sessionReminders: true,
        diaryReminders: true,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockReceiverData])
      )

      // Act
      await notificationService.sendChatMessageNotification(
        2,
        'Sender',
        'Hello, how are you?'
      )

      // Assert
      expect(mockPushService.sendChatMessagePush).toHaveBeenCalled()
    })

    it('should not send when push notifications are disabled', async () => {
      // Arrange
      const mockReceiverData = {
        id: 2,
        name: 'Receiver',
        email: 'receiver@test.com',
        role: 'patient',
        emailNotifications: true,
        pushNotifications: false, // Disabled
        sessionReminders: true,
        diaryReminders: true,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockReceiverData])
      )

      // Act
      await notificationService.sendChatMessageNotification(
        2,
        'Sender',
        'Hello'
      )

      // Assert
      expect(mockPushService.sendChatMessagePush).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      ;(db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database error')
      })

      // Act & Assert - should not throw
      await expect(
        notificationService.sendSessionReminder(1, new Date(), 'Dr. Smith', 'online')
      ).resolves.not.toThrow()
    })

    it('should continue when one notification method fails', async () => {
      // Arrange
      const mockUserData = {
        id: 1,
        name: 'Test Patient',
        email: 'patient@test.com',
        phone: '+5511999999999',
        role: 'patient',
        emailNotifications: true,
        pushNotifications: true,
        sessionReminders: true,
        diaryReminders: true,
      }

      ;(db.select as jest.Mock).mockReturnValue(
        mockDbQueryBuilder.select([mockUserData])
      )

      // Mock email to fail
      mockEmailService.sendSessionReminder.mockRejectedValue(
        new Error('Email service down')
      )

      // Act
      await notificationService.sendSessionReminder(
        1,
        new Date(),
        'Dr. Smith',
        'online'
      )

      // Assert - SMS should still be sent
      expect(mockSMSService.sendSessionReminderSMS).toHaveBeenCalled()
    })
  })
})
