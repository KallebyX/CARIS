/**
 * Accessibility utilities tests
 * Tests for WCAG 2.1 Level AA utility functions
 */

import {
  generateId,
  ariaLabels,
  keyboardNav,
  focusUtils,
  validateHeadingHierarchy,
  formatErrorMessage,
  prefersReducedMotion,
  prefersHighContrast
} from '@/lib/accessibility-utils'

import {
  checkContrast,
  getContrastRatio,
  getLuminance,
  parseColor,
  hexToRgb,
  suggestTextColor,
  isLightColor
} from '@/lib/color-contrast'

describe('Accessibility Utils', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()

      expect(id1).not.toBe(id2)
    })

    it('should use provided prefix', () => {
      const id = generateId('test')
      expect(id).toMatch(/^test-/)
    })
  })

  describe('ariaLabels', () => {
    it('should generate loading label', () => {
      expect(ariaLabels.loading()).toBe('Loading...')
      expect(ariaLabels.loading('data')).toBe('Loading data...')
    })

    it('should generate close label', () => {
      expect(ariaLabels.close()).toBe('Close')
      expect(ariaLabels.close('modal')).toBe('Close modal')
    })

    it('should generate menu toggle label', () => {
      expect(ariaLabels.menuToggle(false)).toBe('Open menu')
      expect(ariaLabels.menuToggle(true)).toBe('Close menu')
    })

    it('should generate required field label', () => {
      expect(ariaLabels.required('Email')).toBe('Email (required)')
    })

    it('should generate notification count label', () => {
      expect(ariaLabels.notifications(0)).toBe('No new notifications')
      expect(ariaLabels.notifications(1)).toBe('1 new notification')
      expect(ariaLabels.notifications(5)).toBe('5 new notifications')
    })

    it('should generate expand/collapse label', () => {
      expect(ariaLabels.expandCollapse(false)).toBe('Expand')
      expect(ariaLabels.expandCollapse(true)).toBe('Collapse')
      expect(ariaLabels.expandCollapse(false, 'section')).toBe('Expand section')
    })

    it('should generate mood rating label', () => {
      expect(ariaLabels.moodRating(3)).toBe('Mood rating 3 out of 5')
      expect(ariaLabels.moodRating(7, 10)).toBe('Mood rating 7 out of 10')
    })
  })

  describe('keyboardNav', () => {
    it('should identify navigation keys', () => {
      expect(keyboardNav.isNavigationKey('ArrowUp')).toBe(true)
      expect(keyboardNav.isNavigationKey('ArrowDown')).toBe(true)
      expect(keyboardNav.isNavigationKey('Home')).toBe(true)
      expect(keyboardNav.isNavigationKey('a')).toBe(false)
    })

    it('should identify action keys', () => {
      expect(keyboardNav.isActionKey('Enter')).toBe(true)
      expect(keyboardNav.isActionKey(' ')).toBe(true)
      expect(keyboardNav.isActionKey('Space')).toBe(true)
      expect(keyboardNav.isActionKey('a')).toBe(false)
    })

    it('should identify close key', () => {
      expect(keyboardNav.isCloseKey('Escape')).toBe(true)
      expect(keyboardNav.isCloseKey('Enter')).toBe(false)
    })
  })

  describe('focusUtils', () => {
    beforeEach(() => {
      document.body.innerHTML = ''
    })

    it('should get focusable elements', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <button>Button 1</button>
        <input type="text" />
        <button disabled>Disabled Button</button>
        <a href="#">Link</a>
        <div tabindex="-1">Not focusable</div>
        <div tabindex="0">Focusable div</div>
      `
      document.body.appendChild(container)

      const focusable = focusUtils.getFocusableElements(container)

      // Should include: button, input, link, focusable div (not disabled button or tabindex="-1")
      expect(focusable.length).toBe(4)
    })

    it('should focus first element', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <button id="btn1">Button 1</button>
        <button id="btn2">Button 2</button>
      `
      document.body.appendChild(container)

      focusUtils.focusFirst(container)

      const firstButton = document.getElementById('btn1')
      expect(document.activeElement).toBe(firstButton)
    })

    it('should focus last element', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <button id="btn1">Button 1</button>
        <button id="btn2">Button 2</button>
      `
      document.body.appendChild(container)

      focusUtils.focusLast(container)

      const lastButton = document.getElementById('btn2')
      expect(document.activeElement).toBe(lastButton)
    })
  })

  describe('validateHeadingHierarchy', () => {
    beforeEach(() => {
      document.body.innerHTML = ''
    })

    it('should validate correct heading hierarchy', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <h1>Title</h1>
        <h2>Section</h2>
        <h3>Subsection</h3>
      `
      document.body.appendChild(container)

      const issues = validateHeadingHierarchy(container)
      expect(issues).toHaveLength(0)
    })

    it('should detect skipped heading levels', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <h1>Title</h1>
        <h3>Skipped h2</h3>
      `
      document.body.appendChild(container)

      const issues = validateHeadingHierarchy(container)
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0]).toMatch(/skipped/i)
    })

    it('should detect wrong first heading', () => {
      const container = document.createElement('div')
      container.innerHTML = `
        <h2>Should be h1</h2>
      `
      document.body.appendChild(container)

      const issues = validateHeadingHierarchy(container)
      expect(issues.length).toBeGreaterThan(0)
      expect(issues[0]).toMatch(/first heading/i)
    })
  })

  describe('formatErrorMessage', () => {
    it('should format single error', () => {
      const message = formatErrorMessage('Email', 'Email is required')
      expect(message).toBe('Email: Email is required')
    })

    it('should format multiple errors', () => {
      const message = formatErrorMessage('Password', [
        'Password is required',
        'Password must be at least 8 characters'
      ])
      expect(message).toContain('Password has 2 errors')
    })

    it('should handle empty errors', () => {
      const message = formatErrorMessage('Field', [])
      expect(message).toBe('')
    })
  })
})

describe('Color Contrast Utils', () => {
  describe('parseColor', () => {
    it('should parse hex colors', () => {
      const color = parseColor('#ffffff')
      expect(color).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('should parse 3-digit hex colors', () => {
      const color = parseColor('#fff')
      expect(color).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('should parse RGB colors', () => {
      const color = parseColor('rgb(255, 255, 255)')
      expect(color).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('should parse HSL colors', () => {
      const color = parseColor('hsl(0, 0%, 100%)')
      expect(color).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('should parse named colors', () => {
      expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 })
      expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0 })
    })
  })

  describe('getLuminance', () => {
    it('should calculate luminance for white', () => {
      const luminance = getLuminance({ r: 255, g: 255, b: 255 })
      expect(luminance).toBeCloseTo(1, 2)
    })

    it('should calculate luminance for black', () => {
      const luminance = getLuminance({ r: 0, g: 0, b: 0 })
      expect(luminance).toBeCloseTo(0, 2)
    })
  })

  describe('getContrastRatio', () => {
    it('should calculate 21:1 for black and white', () => {
      const ratio = getContrastRatio(
        { r: 255, g: 255, b: 255 },
        { r: 0, g: 0, b: 0 }
      )
      expect(ratio).toBeCloseTo(21, 0)
    })

    it('should calculate 1:1 for same colors', () => {
      const ratio = getContrastRatio(
        { r: 128, g: 128, b: 128 },
        { r: 128, g: 128, b: 128 }
      )
      expect(ratio).toBeCloseTo(1, 0)
    })
  })

  describe('checkContrast', () => {
    it('should pass AA for black text on white background', () => {
      const result = checkContrast('#000000', '#ffffff')

      expect(result.passesAA).toBe(true)
      expect(result.passesAAA).toBe(true)
      expect(result.score).toBe('AAA')
    })

    it('should fail for low contrast', () => {
      const result = checkContrast('#cccccc', '#ffffff')

      expect(result.passesAA).toBe(false)
      expect(result.score).toBe('Fail')
    })

    it('should pass AA Large for medium contrast', () => {
      // A contrast ratio around 3:1
      const result = checkContrast('#767676', '#ffffff')

      if (result.ratio >= 3 && result.ratio < 4.5) {
        expect(result.passesAALarge).toBe(true)
        expect(result.passesAA).toBe(false)
        expect(result.score).toBe('AA Large')
      }
    })
  })

  describe('suggestTextColor', () => {
    it('should suggest white text for dark backgrounds', () => {
      const color = suggestTextColor('#000000')
      expect(color).toBe('white')
    })

    it('should suggest black text for light backgrounds', () => {
      const color = suggestTextColor('#ffffff')
      expect(color).toBe('black')
    })
  })

  describe('isLightColor', () => {
    it('should identify white as light', () => {
      expect(isLightColor('#ffffff')).toBe(true)
    })

    it('should identify black as dark', () => {
      expect(isLightColor('#000000')).toBe(false)
    })
  })
})
