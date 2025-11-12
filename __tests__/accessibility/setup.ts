/**
 * Test setup for accessibility tests
 * Configures jest-axe and testing environment
 */

import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations)

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Silence console warnings during tests (optional)
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})

// Reset DOM after each test
afterEach(() => {
  document.body.innerHTML = ''
})
