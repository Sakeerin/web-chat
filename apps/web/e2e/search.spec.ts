import { test, expect } from '@playwright/test'

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
  })

  test('should search messages', async ({ page }) => {
    // Open search
    await page.click('[data-testid="search-button"]')
    
    // Search for messages
    await page.fill('[data-testid="search-input"]', 'test message')
    await page.press('[data-testid="search-input"]', 'Enter')
    
    // Verify search results appear
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-result-item"]')).toHaveCount.greaterThan(0)
  })

  test('should search contacts', async ({ page }) => {
    await page.click('[data-testid="search-button"]')
    await page.click('[data-testid="search-contacts-tab"]')
    
    // Search for contacts
    await page.fill('[data-testid="search-input"]', 'test')
    
    // Verify contact results appear
    await expect(page.locator('[data-testid="contact-result-item"]')).toHaveCount.greaterThan(0)
  })

  test('should filter search results', async ({ page }) => {
    await page.click('[data-testid="search-button"]')
    await page.fill('[data-testid="search-input"]', 'message')
    
    // Apply date filter
    await page.click('[data-testid="search-filters-button"]')
    await page.click('[data-testid="date-filter-today"]')
    await page.click('[data-testid="apply-filters-button"]')
    
    // Verify filtered results
    await expect(page.locator('[data-testid="search-result-item"]')).toHaveCount.greaterThan(0)
  })

  test('should highlight search terms in results', async ({ page }) => {
    await page.click('[data-testid="search-button"]')
    await page.fill('[data-testid="search-input"]', 'hello')
    
    // Verify search term is highlighted
    await expect(page.locator('[data-testid="search-result-item"] [data-testid="highlighted-text"]')).toContainText('hello')
  })

  test('should save and load search history', async ({ page }) => {
    await page.click('[data-testid="search-button"]')
    
    // Perform a search
    await page.fill('[data-testid="search-input"]', 'important message')
    await page.press('[data-testid="search-input"]', 'Enter')
    
    // Clear search
    await page.fill('[data-testid="search-input"]', '')
    
    // Check search history
    await page.click('[data-testid="search-history-button"]')
    await expect(page.locator('[data-testid="search-history-item"]').filter({ hasText: 'important message' })).toBeVisible()
    
    // Click on history item
    await page.click('[data-testid="search-history-item"]').first()
    
    // Verify search is performed
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('important message')
  })
})