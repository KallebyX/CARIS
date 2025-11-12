# CÁRIS Platform - Animation System Documentation

This document provides comprehensive documentation for the visual feedback and micro-animation system implemented throughout the CÁRIS platform.

## Table of Contents

- [Overview](#overview)
- [Animation Utilities](#animation-utilities)
- [Loading Components](#loading-components)
- [Feedback Components](#feedback-components)
- [Page Transitions](#page-transitions)
- [Gamification Animations](#gamification-animations)
- [Enhanced UI Components](#enhanced-ui-components)
- [Performance Considerations](#performance-considerations)
- [Accessibility](#accessibility)
- [Best Practices](#best-practices)

## Overview

The CÁRIS animation system is built on **Framer Motion** and provides:

- Consistent, reusable animation patterns
- Performance-optimized animations (60fps)
- Accessibility support (respects `prefers-reduced-motion`)
- GPU-accelerated transforms
- Production-ready TypeScript components

## Animation Utilities

Located at `/lib/animation-utils.ts`

### Import

```typescript
import {
  fadeVariants,
  slideUpVariants,
  scaleVariants,
  buttonVariants,
  // ... and more
} from "@/lib/animation-utils"
```

### Available Variants

#### Fade Animations
- `fadeVariants` - Basic fade in/out
- `fadeInUpVariants` - Fade in with upward motion
- `fadeInDownVariants` - Fade in with downward motion
- `fadeInLeftVariants` - Fade in from left
- `fadeInRightVariants` - Fade in from right

#### Slide Animations
- `slideUpVariants` - Slide from bottom
- `slideDownVariants` - Slide from top
- `slideLeftVariants` - Slide from right
- `slideRightVariants` - Slide from left

#### Scale Animations
- `scaleVariants` - Scale from 0 to 1
- `scaleInVariants` - Scale in with fade
- `popVariants` - Pop effect with overshoot

#### Interaction Variants
- `buttonVariants` - Button hover/tap effects
- `cardVariants` - Card hover effects
- `tapVariants` - Click feedback
- `hoverVariants` - Hover effects

### Example Usage

```typescript
import { motion } from "framer-motion"
import { fadeInUpVariants } from "@/lib/animation-utils"

function MyComponent() {
  return (
    <motion.div
      variants={fadeInUpVariants}
      initial="hidden"
      animate="visible"
    >
      Content
    </motion.div>
  )
}
```

## Loading Components

### Spinner

Located at `/components/ui/spinner.tsx`

```typescript
import { Spinner, LoadingSpinner, DotSpinner, PulseSpinner } from "@/components/ui/spinner"

// Basic spinner
<Spinner size="md" variant="primary" />

// Loading spinner with message
<LoadingSpinner message="Loading data..." centered />

// Dot spinner
<DotSpinner size="md" variant="primary" />

// Pulse spinner
<PulseSpinner size="md" variant="success" />
```

### Progress Indicators

Located at `/components/ui/progress-indicator.tsx`

```typescript
import {
  ProgressIndicator,
  CircularProgress,
  StepProgress,
  LoadingBar
} from "@/components/ui/progress-indicator"

// Linear progress
<ProgressIndicator value={75} showPercentage />

// Circular progress
<CircularProgress value={60} size={80} />

// Step progress
<StepProgress
  currentStep={2}
  totalSteps={5}
  labels={["Start", "Info", "Review", "Payment", "Complete"]}
/>

// Indeterminate loading bar
<LoadingBar indeterminate />
```

### Pulse Dots

Located at `/components/ui/pulse-dot.tsx`

```typescript
import {
  PulseDot,
  StatusIndicator,
  NotificationDot,
  RecordingIndicator,
  LiveIndicator,
  TypingIndicator
} from "@/components/ui/pulse-dot"

// Basic pulse dot
<PulseDot size="md" variant="success" animated />

// Status indicator
<StatusIndicator status="online" showText />

// Notification dot
<NotificationDot show count={5}>
  <Button>Messages</Button>
</NotificationDot>

// Recording indicator
<RecordingIndicator isRecording showText />

// Live indicator
<LiveIndicator isLive />

// Typing indicator
<TypingIndicator isTyping />
```

## Feedback Components

### Success Animation

Located at `/components/ui/success-animation.tsx`

```typescript
import {
  SuccessAnimation,
  CheckmarkAnimation,
  SuccessCheck,
  SuccessBanner
} from "@/components/ui/success-animation"

// Success animation
<SuccessAnimation
  size="lg"
  message="Profile updated successfully!"
  onComplete={() => console.log("Animation complete")}
/>

// Checkmark animation
<CheckmarkAnimation size={60} color="#22c55e" />

// Success banner
<SuccessBanner
  message="Changes saved"
  description="Your settings have been updated."
  show={showBanner}
  onClose={() => setShowBanner(false)}
  autoHideDuration={3000}
/>
```

### Error Animation

Located at `/components/ui/error-animation.tsx`

```typescript
import {
  ErrorAnimation,
  ErrorShake,
  ErrorBanner,
  ValidationError,
  ErrorState
} from "@/components/ui/error-animation"

// Error animation
<ErrorAnimation
  size="md"
  message="Failed to save changes"
/>

// Shake animation
<ErrorShake shake={hasError}>
  <Input />
</ErrorShake>

// Error banner
<ErrorBanner
  message="An error occurred"
  description="Please try again later."
  type="error"
  show={showError}
  onClose={() => setShowError(false)}
/>

// Validation error
<ValidationError
  message="Email is required"
  show={!!errors.email}
/>

// Error state
<ErrorState
  title="Failed to load data"
  message="Please check your connection and try again."
  onRetry={handleRetry}
/>
```

### Celebration

Located at `/components/ui/celebration.tsx`

```typescript
import {
  Celebration,
  SuccessCelebration,
  AchievementUnlock
} from "@/components/ui/celebration"

// Basic celebration
<Celebration
  show={showCelebration}
  type="confetti"
  duration={5000}
  onComplete={() => console.log("Done!")}
/>

// Success celebration
<SuccessCelebration
  show={showSuccess}
  message="Task completed!"
  onComplete={() => setShowSuccess(false)}
/>

// Achievement unlock
<AchievementUnlock
  show={showAchievement}
  title="First Session Complete!"
  description="You've completed your first therapy session"
  icon="🏆"
  duration={5000}
  onClose={() => setShowAchievement(false)}
/>
```

### Ripple Effects

Located at `/components/ui/ripple.tsx`

```typescript
import {
  RippleEffect,
  RippleButton,
  WaveEffect,
  PulseRing,
  ClickFeedback,
  HoverGlow,
  CopyFeedback
} from "@/components/ui/ripple"

// Ripple effect
<RippleEffect color="rgba(255,255,255,0.3)">
  <div>Click me</div>
</RippleEffect>

// Ripple button
<RippleButton onClick={handleClick}>
  Click me
</RippleButton>

// Wave effect
<WaveEffect trigger={showWave}>
  <Button>Submit</Button>
</WaveEffect>

// Copy feedback
<div className="relative">
  <Button onClick={handleCopy}>Copy</Button>
  <CopyFeedback show={copied} message="Copied!" />
</div>
```

## Page Transitions

Located at `/components/page-transition.tsx`

```typescript
import {
  PageTransition,
  RouteLoadingBar,
  PageLayout,
  FadeTransition,
  SlideTransition,
  ScaleTransition,
  ModalTransition,
  StaggerChildren,
  StaggerItem
} from "@/components/page-transition"

// Page layout with transitions
<PageLayout transitionType="fadeUp" showLoadingBar>
  {children}
</PageLayout>

// Route loading bar
<RouteLoadingBar color="#3b82f6" height={3} />

// Modal transition
<ModalTransition
  show={showModal}
  onBackdropClick={() => setShowModal(false)}
>
  <div className="bg-background p-6 rounded-lg">
    Modal content
  </div>
</ModalTransition>

// Staggered list
<StaggerChildren staggerDelay={0.1}>
  {items.map(item => (
    <StaggerItem key={item.id}>
      <Card>{item.name}</Card>
    </StaggerItem>
  ))}
</StaggerChildren>
```

## Gamification Animations

Located at `/components/gamification/animations.tsx`

```typescript
import {
  LevelUpAnimation,
  AchievementUnlockAnimation,
  XPGainAnimation,
  StreakCounterAnimation,
  LeaderboardRankChange,
  ProgressMilestone,
  RewardCollection
} from "@/components/gamification/animations"

// Level up
<LevelUpAnimation
  show={showLevelUp}
  level={5}
  onComplete={() => setShowLevelUp(false)}
/>

// XP gain
<XPGainAnimation
  show={showXP}
  amount={50}
  position={{ x: 100, y: 100 }}
  onComplete={() => setShowXP(false)}
/>

// Streak counter
<StreakCounterAnimation
  streak={7}
  animate={true}
/>

// Leaderboard rank change
<LeaderboardRankChange
  show={showRank}
  previousRank={10}
  newRank={5}
  onComplete={() => setShowRank(false)}
/>

// Progress milestone
<ProgressMilestone
  show={showMilestone}
  title="50% Complete!"
  description="You're halfway there"
  progress={50}
/>

// Reward collection
<RewardCollection
  show={showReward}
  type="coins"
  amount={100}
  onComplete={() => setShowReward(false)}
/>
```

## Enhanced UI Components

### Animated Button

Located at `/components/ui/animated-button.tsx`

```typescript
import {
  AnimatedButton,
  PulseButton,
  BounceButton,
  ShakeButton,
  FloatButton
} from "@/components/ui/animated-button"

// Standard animated button
<AnimatedButton
  variant="default"
  animationType="scale"
  onClick={handleClick}
>
  Click me
</AnimatedButton>

// Pulse button (for CTAs)
<PulseButton pulse>
  Get Started
</PulseButton>

// Bounce button
<BounceButton>
  Hover me
</BounceButton>

// Shake button (for errors)
<ShakeButton shake={hasError}>
  Submit
</ShakeButton>

// Float button (FAB)
<FloatButton size="icon">
  <PlusIcon />
</FloatButton>
```

### Animated Card

Located at `/components/ui/animated-card.tsx`

```typescript
import {
  AnimatedCard,
  AnimatedCardHeader,
  AnimatedCardTitle,
  AnimatedCardDescription,
  AnimatedCardContent,
  AnimatedCardFooter,
  InteractiveCard,
  FlipCard,
  GlassCard,
  GradientBorderCard
} from "@/components/ui/animated-card"

// Standard animated card
<AnimatedCard hover delay={0.1}>
  <AnimatedCardHeader>
    <AnimatedCardTitle>Title</AnimatedCardTitle>
    <AnimatedCardDescription>Description</AnimatedCardDescription>
  </AnimatedCardHeader>
  <AnimatedCardContent>
    Content
  </AnimatedCardContent>
  <AnimatedCardFooter>
    Footer
  </AnimatedCardFooter>
</AnimatedCard>

// Interactive card
<InteractiveCard expandable tilt>
  Content
</InteractiveCard>

// Flip card
<FlipCard
  front={<Card>Front</Card>}
  back={<Card>Back</Card>}
/>

// Glass card
<GlassCard>
  Glassmorphism effect
</GlassCard>

// Gradient border card
<GradientBorderCard>
  Animated gradient border
</GradientBorderCard>
```

### Animated Badge

Located at `/components/ui/animated-badge.tsx`

```typescript
import {
  AnimatedBadge,
  CountBadge,
  StatusBadge,
  NewBadge,
  BetaBadge,
  ProBadge,
  TrendingBadge,
  LoadingBadge
} from "@/components/ui/animated-badge"

// Basic animated badge
<AnimatedBadge variant="default" pulse>
  New
</AnimatedBadge>

// Count badge
<CountBadge count={12} max={99} />

// Status badge
<StatusBadge status="online" />

// Specialized badges
<NewBadge />
<BetaBadge />
<ProBadge />
<TrendingBadge />
<LoadingBadge />
```

## Performance Considerations

### GPU Acceleration

All animations use CSS transforms for hardware acceleration:

```typescript
// Good - GPU accelerated
transform: translateX(10px)
transform: scale(1.1)
transform: rotate(45deg)

// Avoid - Not GPU accelerated
left: 10px
width: 100%
```

### Reduced Motion

The system automatically respects user preferences:

```typescript
import { prefersReducedMotion } from "@/lib/animation-utils"

if (prefersReducedMotion()) {
  // Skip animations or use instant transitions
  return { duration: 0.01 }
}
```

### Optimization Tips

1. **Use `will-change` sparingly**: Only for elements that will animate
2. **Lazy load heavy animations**: Import dynamically when needed
3. **Limit simultaneous animations**: Stagger complex animations
4. **Use `AnimatePresence` mode="wait"**: For page transitions
5. **Avoid animating height/width**: Use `scale` instead when possible

## Accessibility

### Screen Readers

All animated components include proper ARIA attributes:

```typescript
<motion.div role="status" aria-label="Loading">
  <Spinner />
  <span className="sr-only">Loading content...</span>
</motion.div>
```

### Keyboard Navigation

Interactive animated components support keyboard navigation:

```typescript
<AnimatedButton
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Submit
</AnimatedButton>
```

### Focus Management

Animations don't interfere with focus:

```typescript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  // Focus is maintained during animation
  tabIndex={0}
>
  Content
</motion.div>
```

## Best Practices

### 1. Choose Appropriate Animations

- **Micro-interactions**: Scale, fade (0.2-0.3s)
- **Page transitions**: Fade, slide (0.3-0.5s)
- **Celebrations**: Complex animations (1-3s)

### 2. Maintain Consistency

Use the predefined variants from `animation-utils.ts` for consistency across the platform.

### 3. Don't Overdo It

- Limit animations to meaningful interactions
- Avoid animations on every element
- Consider user fatigue

### 4. Test Performance

```bash
# Run performance tests
npm run test

# Check bundle size
npm run analyze
```

### 5. Mobile Considerations

- Reduce animation complexity on mobile
- Consider battery usage
- Test on actual devices

### 6. Animation Timing

- **Fast**: 0.1-0.2s (buttons, toggles)
- **Medium**: 0.3-0.4s (cards, modals)
- **Slow**: 0.5-1s (page transitions)
- **Very slow**: 1-3s (celebrations, achievements)

## Examples by Use Case

### Form Submission

```typescript
const [isSubmitting, setIsSubmitting] = useState(false)
const [showSuccess, setShowSuccess] = useState(false)
const [showError, setShowError] = useState(false)

const handleSubmit = async () => {
  setIsSubmitting(true)

  try {
    await submitForm()
    setShowSuccess(true)
  } catch (error) {
    setShowError(true)
  } finally {
    setIsSubmitting(false)
  }
}

return (
  <>
    <AnimatedButton
      isLoading={isSubmitting}
      onClick={handleSubmit}
      animationType="scale"
    >
      Submit
    </AnimatedButton>

    <SuccessBanner
      show={showSuccess}
      message="Form submitted successfully!"
      onClose={() => setShowSuccess(false)}
      autoHideDuration={3000}
    />

    <ErrorBanner
      show={showError}
      message="Failed to submit form"
      onClose={() => setShowError(false)}
    />
  </>
)
```

### Dashboard Card Grid

```typescript
<StaggerChildren staggerDelay={0.1}>
  {dashboardCards.map((card, index) => (
    <StaggerItem key={card.id}>
      <AnimatedCard hover delay={index * 0.05}>
        <AnimatedCardHeader>
          <AnimatedCardTitle>{card.title}</AnimatedCardTitle>
        </AnimatedCardHeader>
        <AnimatedCardContent>
          {card.content}
        </AnimatedCardContent>
      </AnimatedCard>
    </StaggerItem>
  ))}
</StaggerChildren>
```

### Gamification Flow

```typescript
const handleTaskComplete = async () => {
  await completeTask()

  // Show XP gain
  setShowXP(true)

  // Check for level up
  if (newLevel > currentLevel) {
    setTimeout(() => {
      setShowLevelUp(true)
    }, 1000)
  }

  // Check for achievements
  if (unlockedAchievement) {
    setTimeout(() => {
      setShowAchievement(true)
    }, 2000)
  }
}

return (
  <>
    <XPGainAnimation
      show={showXP}
      amount={50}
      position={buttonPosition}
    />

    <LevelUpAnimation
      show={showLevelUp}
      level={newLevel}
    />

    <AchievementUnlockAnimation
      show={showAchievement}
      title="First Task Complete!"
      description="You completed your first task"
    />
  </>
)
```

## Troubleshooting

### Animations Not Working

1. Check Framer Motion is installed: `npm list framer-motion`
2. Verify imports are correct
3. Check console for errors
4. Ensure `AnimatePresence` wraps exit animations

### Performance Issues

1. Check browser DevTools Performance tab
2. Reduce number of simultaneous animations
3. Use `will-change` CSS property
4. Consider using CSS animations for simple cases

### TypeScript Errors

1. Ensure all props are typed correctly
2. Import types from Framer Motion if needed
3. Check variant names match definitions

## Support

For issues or questions:
- Check this documentation first
- Review example implementations
- Test in isolation to identify conflicts
- Check browser console for warnings

## Future Enhancements

Planned improvements:
- [ ] Lottie animation support
- [ ] More complex particle systems
- [ ] Spring physics customization
- [ ] Animation presets library
- [ ] Visual animation builder tool
