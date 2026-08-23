import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'

describe('Basic Test Setup', () => {
  it('should pass basic assertions', () => {
    expect(true).toBe(true)
    expect(1 + 1).toBe(2)
  })

  it('should have access to global mocks', () => {
    expect(globalThis.IntersectionObserver).toBeDefined()
    expect(globalThis.ResizeObserver).toBeDefined()
    expect(window.matchMedia).toBeDefined()
    expect(globalThis.localStorage).toBeDefined()
  })
})