import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should register a new user', async ({ page }) => {
    await page.click('[data-testid="register-link"]')
    
    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'NewPassword123!')
    await page.fill('[data-testid="confirm-password-input"]', 'NewPassword123!')
    await page.fill('[data-testid="username-input"]', 'newuser')
    await page.fill('[data-testid="name-input"]', 'New User')
    
    // Submit registration
    await page.click('[data-testid="register-button"]')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/)
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Registration successful')
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.click('[data-testid="login-link"]')
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'TestPassword123!')
    
    // Submit login
    await page.click('[data-testid="login-button"]')
    
    // Should redirect to chat page
    await expect(page).toHaveURL(/.*\/chat/)
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('[data-testid="login-link"]')
    
    // Fill login form with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    
    // Submit login
    await page.click('[data-testid="login-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
  })

  test('should handle forgot password flow', async ({ page }) => {
    await page.click('[data-testid="login-link"]')
    await page.click('[data-testid="forgot-password-link"]')
    
    // Fill forgot password form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="reset-password-button"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Password reset email sent')
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'TestPassword123!')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL(/.*\/chat/)
    
    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/)
  })
})