/**
 * Integration Test: Meditation Tracking and Gamification
 *
 * Tests:
 * 1. Meditation session tracking
 * 2. XP and achievements
 * 3. Weekly challenges
 * 4. Leaderboards
 * 5. Meditation tracks progress
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Meditation and Gamification (Integration)', () => {
  let testDb: PGlite
  let userId: number
  let categoryId: string
  let audioId: string
  let trackId: string

  beforeAll(async () => {
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()

    // Setup user
    const userResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role, total_xp, current_level)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['Test User', 'user@test.com', 'hashed', 'patient', 0, 1]
    )
    userId = userResult.rows[0].id

    // Setup meditation category
    const categoryResult = await testDb.query(
      `INSERT INTO meditation_categories (id, name, description, icon, color)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['mindfulness', 'Mindfulness', 'Practice present moment awareness', '🧘', '#6366f1']
    )
    categoryId = categoryResult.rows[0].id

    // Setup meditation audio
    const audioResult = await testDb.query(
      `INSERT INTO meditation_audios (
        title, description, category_id, duration, difficulty,
        instructor, audio_url, license, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        'Morning Mindfulness',
        'Start your day with awareness',
        categoryId,
        600, // 10 minutes
        'iniciante',
        'Maria Silva',
        's3://bucket/audio/morning-mindfulness.mp3',
        'creative_commons',
        'active'
      ]
    )
    audioId = audioResult.rows[0].id

    // Setup meditation track
    const trackResult = await testDb.query(
      `INSERT INTO meditation_tracks (
        title, description, category_id, difficulty, week_number, theme, objective
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        '7-Day Mindfulness Journey',
        'Begin your meditation practice',
        categoryId,
        'iniciante',
        1,
        'Introduction to Mindfulness',
        'Build a daily meditation habit'
      ]
    )
    trackId = trackResult.rows[0].id
  })

  it('should track meditation session completion', async () => {
    // Act - Start meditation session
    const startTime = new Date()
    const sessionResult = await testDb.query(
      `INSERT INTO meditation_sessions (
        user_id, meditation_id, started_at, duration, was_completed
      )
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, audioId, startTime, 600, false]
    )

    const sessionId = sessionResult.rows[0].id

    // Complete session
    const completedTime = new Date(startTime.getTime() + 600 * 1000)
    await testDb.query(
      `UPDATE meditation_sessions
       SET completed_at = $1, was_completed = true,
           mood_before = $2, mood_after = $3, rating = $4
       WHERE id = $5`,
      [completedTime, 5, 8, 5, sessionId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM meditation_sessions WHERE id = $1`,
      [sessionId]
    )

    const session = result.rows[0]
    expect(session.was_completed).toBe(true)
    expect(session.mood_before).toBe(5)
    expect(session.mood_after).toBe(8)
    expect(session.rating).toBe(5)
  })

  it('should award XP and points for completing meditation', async () => {
    // Arrange - Complete meditation
    await testDb.query(
      `INSERT INTO meditation_sessions (
        user_id, meditation_id, started_at, completed_at,
        duration, was_completed
      )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, audioId, new Date(), new Date(), 600, true]
    )

    // Act - Award points
    await testDb.query(
      `INSERT INTO point_activities (
        user_id, activity_type, points, xp, description
      )
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'meditation', 15, 75, 'Completed 10-minute meditation']
    )

    // Update user totals
    await testDb.query(
      `UPDATE users
       SET total_xp = total_xp + 75,
           weekly_points = weekly_points + 15,
           monthly_points = monthly_points + 15
       WHERE id = $1`,
      [userId]
    )

    // Assert
    const userResult = await testDb.query(
      `SELECT total_xp, weekly_points, monthly_points FROM users WHERE id = $1`,
      [userId]
    )

    expect(userResult.rows[0].total_xp).toBe(75)
    expect(userResult.rows[0].weekly_points).toBe(15)
    expect(userResult.rows[0].monthly_points).toBe(15)
  })

  it('should unlock achievements', async () => {
    // Arrange - Create achievement
    const achievementResult = await testDb.query(
      `INSERT INTO achievements (
        name, description, icon, type, category, requirement, xp_reward, rarity
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        'First Steps',
        'Complete your first meditation',
        '🎯',
        'milestone',
        'meditation',
        1,
        100,
        'common'
      ]
    )

    const achievementId = achievementResult.rows[0].id

    // Act - User completes first meditation
    await testDb.query(
      `INSERT INTO meditation_sessions (
        user_id, meditation_id, started_at, completed_at, duration, was_completed
      )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, audioId, new Date(), new Date(), 600, true]
    )

    // Unlock achievement
    await testDb.query(
      `INSERT INTO user_achievements (user_id, achievement_id, progress)
       VALUES ($1, $2, $3)`,
      [userId, achievementId, 1]
    )

    // Award bonus XP
    await testDb.query(
      `UPDATE users SET total_xp = total_xp + 100 WHERE id = $1`,
      [userId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT ua.*, a.name, a.xp_reward
       FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1`,
      [userId]
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].name).toBe('First Steps')
    expect(result.rows[0].xp_reward).toBe(100)
  })

  it('should track weekly challenge progress', async () => {
    // Arrange - Create weekly challenge
    const challengeResult = await testDb.query(
      `INSERT INTO weekly_challenges (
        title, description, icon, type, target,
        xp_reward, points_reward, start_date, end_date
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        'Meditation Master',
        'Complete 7 meditation sessions this week',
        '🏆',
        'meditation',
        7,
        500,
        100,
        '2024-01-01',
        '2024-01-07'
      ]
    )

    const challengeId = challengeResult.rows[0].id

    // Act - Track user progress
    await testDb.query(
      `INSERT INTO user_challenge_progress (user_id, challenge_id, progress)
       VALUES ($1, $2, $3)`,
      [userId, challengeId, 0]
    )

    // User completes 3 meditations
    for (let i = 0; i < 3; i++) {
      await testDb.query(
        `INSERT INTO meditation_sessions (
          user_id, meditation_id, started_at, completed_at, duration, was_completed
        )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, audioId, new Date(), new Date(), 600, true]
      )

      await testDb.query(
        `UPDATE user_challenge_progress
         SET progress = progress + 1
         WHERE user_id = $1 AND challenge_id = $2`,
        [userId, challengeId]
      )
    }

    // Assert
    const result = await testDb.query(
      `SELECT progress, completed FROM user_challenge_progress
       WHERE user_id = $1 AND challenge_id = $2`,
      [userId, challengeId]
    )

    expect(result.rows[0].progress).toBe(3)
    expect(result.rows[0].completed).toBe(false)
  })

  it('should update leaderboard rankings', async () => {
    // Arrange - Create leaderboard
    const leaderboardResult = await testDb.query(
      `INSERT INTO leaderboards (
        name, description, type, category, start_date, end_date
      )
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Weekly XP Leaders',
        'Top XP earners this week',
        'weekly',
        'xp',
        '2024-01-01',
        '2024-01-07'
      ]
    )

    const leaderboardId = leaderboardResult.rows[0].id

    // Create additional users
    const user2Result = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role, total_xp)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['User Two', 'user2@test.com', 'hashed', 'patient', 0]
    )
    const user2Id = user2Result.rows[0].id

    // Act - Add XP to users
    await testDb.query(
      `UPDATE users SET weekly_points = 150 WHERE id = $1`,
      [userId]
    )
    await testDb.query(
      `UPDATE users SET weekly_points = 200 WHERE id = $1`,
      [user2Id]
    )

    // Update leaderboard entries
    await testDb.query(
      `INSERT INTO leaderboard_entries (leaderboard_id, user_id, score, rank)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
      [leaderboardId, user2Id, 200, 1, leaderboardId, userId, 150, 2]
    )

    // Assert
    const result = await testDb.query(
      `SELECT u.name, le.score, le.rank
       FROM leaderboard_entries le
       JOIN users u ON u.id = le.user_id
       WHERE le.leaderboard_id = $1
       ORDER BY le.rank ASC`,
      [leaderboardId]
    )

    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].name).toBe('User Two')
    expect(result.rows[0].rank).toBe(1)
    expect(result.rows[1].name).toBe('Test User')
    expect(result.rows[1].rank).toBe(2)
  })

  it('should track user progress in meditation tracks', async () => {
    // Arrange - Link audio to track
    await testDb.query(
      `INSERT INTO meditation_track_audios (track_id, audio_id, week, day, display_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [trackId, audioId, 1, 1, 1]
    )

    // Act - Start track
    await testDb.query(
      `INSERT INTO user_track_progress (
        user_id, track_id, current_week, current_day
      )
       VALUES ($1, $2, $3, $4)`,
      [userId, trackId, 1, 1]
    )

    // Complete first day
    await testDb.query(
      `UPDATE user_track_progress
       SET completed_audios = $1, last_accessed_at = $2
       WHERE user_id = $3 AND track_id = $4`,
      [JSON.stringify([audioId]), new Date(), userId, trackId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM user_track_progress
       WHERE user_id = $1 AND track_id = $2`,
      [userId, trackId]
    )

    const progress = result.rows[0]
    expect(progress.current_week).toBe(1)
    expect(progress.current_day).toBe(1)
    expect(JSON.parse(progress.completed_audios)).toContain(audioId)
  })

  it('should track meditation streak', async () => {
    // Act - User meditates for consecutive days
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03']

    for (const date of dates) {
      await testDb.query(
        `INSERT INTO meditation_sessions (
          user_id, meditation_id, started_at, completed_at, duration, was_completed
        )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, audioId, date, date, 600, true]
      )

      // Update streak
      await testDb.query(
        `UPDATE users
         SET streak = streak + 1, last_activity_date = $1
         WHERE id = $2`,
        [date, userId]
      )
    }

    // Assert
    const result = await testDb.query(
      `SELECT streak, last_activity_date FROM users WHERE id = $1`,
      [userId]
    )

    expect(result.rows[0].streak).toBe(3)
  })

  it('should allow users to favorite meditation audios', async () => {
    // Act - Add to favorites
    await testDb.query(
      `INSERT INTO user_meditation_favorites (user_id, audio_id)
       VALUES ($1, $2)`,
      [userId, audioId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT ma.title, ma.duration, ma.instructor
       FROM user_meditation_favorites umf
       JOIN meditation_audios ma ON ma.id = umf.audio_id
       WHERE umf.user_id = $1`,
      [userId]
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].title).toBe('Morning Mindfulness')
  })

  it('should collect ratings and reviews for meditation audios', async () => {
    // Act - Submit rating
    await testDb.query(
      `INSERT INTO meditation_audio_ratings (
        user_id, audio_id, rating, review
      )
       VALUES ($1, $2, $3, $4)`,
      [userId, audioId, 5, 'Excellent meditation session! Very calming.']
    )

    // Update audio statistics
    await testDb.query(
      `UPDATE meditation_audios
       SET rating_count = rating_count + 1,
           average_rating = 500, -- 5.00 * 100
           play_count = play_count + 1
       WHERE id = $1`,
      [audioId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT rating_count, average_rating, play_count
       FROM meditation_audios WHERE id = $1`,
      [audioId]
    )

    expect(result.rows[0].rating_count).toBe(1)
    expect(result.rows[0].average_rating).toBe(500)
    expect(result.rows[0].play_count).toBe(1)
  })
})
