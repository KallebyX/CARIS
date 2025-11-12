/**
 * Color Contrast Checker for WCAG 2.1 Compliance
 *
 * WCAG 2.1 Level AA Requirements:
 * - Normal text (< 18pt or < 14pt bold): Minimum contrast ratio of 4.5:1
 * - Large text (>= 18pt or >= 14pt bold): Minimum contrast ratio of 3:1
 * - UI components and graphical objects: Minimum contrast ratio of 3:1
 *
 * WCAG 2.1 Level AAA Requirements:
 * - Normal text: Minimum contrast ratio of 7:1
 * - Large text: Minimum contrast ratio of 4.5:1
 */

/**
 * Color in RGB format
 */
export interface RGB {
  r: number // 0-255
  g: number // 0-255
  b: number // 0-255
}

/**
 * Contrast check result
 */
export interface ContrastResult {
  ratio: number
  passesAA: boolean
  passesAALarge: boolean
  passesAAA: boolean
  passesAAALarge: boolean
  score: 'AAA' | 'AA' | 'AA Large' | 'Fail'
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  if (hex.length !== 6) {
    return null
  }

  const num = parseInt(hex, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

/**
 * Parse HSL color to RGB
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

/**
 * Parse CSS color string to RGB
 */
export function parseColor(color: string): RGB | null {
  color = color.trim()

  // Hex color
  if (color.startsWith('#')) {
    return hexToRgb(color)
  }

  // RGB color
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    }
  }

  // HSL color
  const hslMatch = color.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/)
  if (hslMatch) {
    return hslToRgb(
      parseInt(hslMatch[1]),
      parseInt(hslMatch[2]),
      parseInt(hslMatch[3])
    )
  }

  // Named colors (basic set)
  const namedColors: Record<string, RGB> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    magenta: { r: 255, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 }
  }

  return namedColors[color.toLowerCase()] || null
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula
 */
export function getLuminance(rgb: RGB): number {
  // Convert to 0-1 range
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 formula: (L1 + 0.05) / (L2 + 0.05)
 * where L1 is the lighter color and L2 is the darker color
 */
export function getContrastRatio(color1: RGB, color2: RGB): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if color contrast meets WCAG standards
 */
export function checkContrast(
  foreground: string | RGB,
  background: string | RGB
): ContrastResult {
  const fg = typeof foreground === 'string' ? parseColor(foreground) : foreground
  const bg = typeof background === 'string' ? parseColor(background) : background

  if (!fg || !bg) {
    throw new Error('Invalid color format')
  }

  const ratio = getContrastRatio(fg, bg)

  // WCAG 2.1 Level AA (normal text): 4.5:1
  const passesAA = ratio >= 4.5

  // WCAG 2.1 Level AA (large text): 3:1
  const passesAALarge = ratio >= 3

  // WCAG 2.1 Level AAA (normal text): 7:1
  const passesAAA = ratio >= 7

  // WCAG 2.1 Level AAA (large text): 4.5:1
  const passesAAALarge = ratio >= 4.5

  // Determine overall score
  let score: ContrastResult['score']
  if (passesAAA) {
    score = 'AAA'
  } else if (passesAA) {
    score = 'AA'
  } else if (passesAALarge) {
    score = 'AA Large'
  } else {
    score = 'Fail'
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA,
    passesAALarge,
    passesAAA,
    passesAAALarge,
    score
  }
}

/**
 * Suggest accessible text color (black or white) for a given background
 */
export function suggestTextColor(background: string | RGB): 'black' | 'white' {
  const bg = typeof background === 'string' ? parseColor(background) : background

  if (!bg) {
    throw new Error('Invalid background color')
  }

  const luminance = getLuminance(bg)

  // Use white text for dark backgrounds, black for light backgrounds
  // Threshold is 0.5 but can be adjusted
  return luminance > 0.5 ? 'black' : 'white'
}

/**
 * Check multiple color combinations
 */
export function checkColorPalette(
  colors: Record<string, string>
): Record<string, Record<string, ContrastResult>> {
  const results: Record<string, Record<string, ContrastResult>> = {}

  Object.entries(colors).forEach(([name1, color1]) => {
    results[name1] = {}
    Object.entries(colors).forEach(([name2, color2]) => {
      if (name1 !== name2) {
        try {
          results[name1][name2] = checkContrast(color1, color2)
        } catch (error) {
          // Skip invalid color combinations
        }
      }
    })
  })

  return results
}

/**
 * Find accessible color combinations from a palette
 */
export function findAccessibleCombinations(
  colors: Record<string, string>,
  minRatio = 4.5
): Array<{ foreground: string; background: string; ratio: number }> {
  const combinations: Array<{ foreground: string; background: string; ratio: number }> = []

  Object.entries(colors).forEach(([fgName, fgColor]) => {
    Object.entries(colors).forEach(([bgName, bgColor]) => {
      if (fgName !== bgName) {
        try {
          const result = checkContrast(fgColor, bgColor)
          if (result.ratio >= minRatio) {
            combinations.push({
              foreground: fgName,
              background: bgName,
              ratio: result.ratio
            })
          }
        } catch (error) {
          // Skip invalid color combinations
        }
      }
    })
  })

  return combinations.sort((a, b) => b.ratio - a.ratio)
}

/**
 * Get contrast rating description
 */
export function getContrastRating(ratio: number): string {
  if (ratio >= 7) return 'AAA (Enhanced contrast)'
  if (ratio >= 4.5) return 'AA (Minimum contrast)'
  if (ratio >= 3) return 'AA Large (Large text only)'
  return 'Fail (Does not meet WCAG standards)'
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(color: string | RGB): boolean {
  const rgb = typeof color === 'string' ? parseColor(color) : color
  if (!rgb) return false

  const luminance = getLuminance(rgb)
  return luminance > 0.5
}

/**
 * Validate CÁRIS theme colors for accessibility
 */
export function validateCarisThemeColors(): {
  valid: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Common CÁRIS color combinations to check
  const combinations = [
    { fg: 'Primary text on background', foreground: 'hsl(222.2, 84%, 4.9%)', background: 'hsl(0, 0%, 100%)' },
    { fg: 'Primary on primary foreground', foreground: 'hsl(210, 40%, 98%)', background: 'hsl(222.2, 47.4%, 11.2%)' },
    { fg: 'Destructive text', foreground: 'hsl(0, 84.2%, 60.2%)', background: 'hsl(0, 0%, 100%)' },
    { fg: 'Muted text', foreground: 'hsl(215.4, 16.3%, 46.9%)', background: 'hsl(0, 0%, 100%)' }
  ]

  combinations.forEach(({ fg, foreground, background }) => {
    try {
      const result = checkContrast(foreground, background)
      if (!result.passesAA) {
        issues.push(`${fg} has contrast ratio of ${result.ratio}:1 (requires 4.5:1)`)
        recommendations.push(`Adjust ${fg} to meet WCAG AA standards`)
      }
    } catch (error) {
      issues.push(`Failed to check ${fg}: ${error}`)
    }
  })

  return {
    valid: issues.length === 0,
    issues,
    recommendations
  }
}
