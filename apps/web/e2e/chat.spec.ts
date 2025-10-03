import { test, expect } from '@playwright/test'

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Use saved authentication state
    await page.goto('/chat')
  })

  test('should display chat interface', async ({ page }) => {
    await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="chat-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="message-composer"]')).toBeVisible()
  })

  test('should send a text message', async ({ page }) => {
    // Select or create a conversation
    const conversationItem = page.locator('[data-testid="conversation-item"]').first()
    if (await conversationItem.count() > 0) {
      await conversationItem.click()
    } else {
      // Create new conversation
      await page.click('[data-testid="new-conversation-button"]')
      await page.fill('[data-testid="search-users-input"]', 'testuser2')
      await page.click('[data-testid="user-result"]').first()
      await page.click('[data-testid="create-conversation-button"]')
    }
    
    // Send message
    const messageText = 'Hello, this is a test message!'
    await page.fill('[data-testid="message-input"]', messageText)
    await page.click('[data-testid="send-button"]')
    
    // Verify message appears in chat
    await expect(page.locator('[data-testid="message-item"]').last()).toContainText(messageText)
  })

  test('should show typing indicator', async ({ page, context }) => {
    // Open second page to simulate another user
    const page2 = await context.newPage()
    await page2.goto('/chat')
    
    // Select same conversation on both pages
    await page.locator('[data-testid="conversation-item"]').first().click()
    await page2.locator('[data-testid="conversation-item"]').first().click()
    
    // Start typing on page2
    await page2.fill('[data-testid="message-input"]', 'Typing...')
    
    // Check typing indicator appears on page1
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible()
    
    // Clear input on page2
    await page2.fill('[data-testid="message-input"]', '')
    
    // Typing indicator should disappear
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible()
  })

  test('should edit a message', async ({ page }) => {
    // Send a message first
    await page.locator('[data-testid="conversation-item"]').first().click()
    await page.fill('[data-testid="message-input"]', 'Original message')
    await page.click('[data-testid="send-button"]')
    
    // Edit the message
    await page.locator('[data-testid="message-item"]').last().hover()
    await page.click('[data-testid="edit-message-button"]')
    await page.fill('[data-testid="edit-message-input"]', 'Edited message')
    await page.click('[data-testid="save-edit-button"]')
    
    // Verify message is edited
    await expect(page.locator('[data-testid="message-item"]').last()).toContainText('Edited message')
    await expect(page.locator('[data-testid="edited-indicator"]')).toBeVisible()
  })

  test('should delete a message', async ({ page }) => {
    // Send a message first
    await page.locator('[data-testid="conversation-item"]').first().click()
    await page.fill('[data-testid="message-input"]', 'Message to delete')
    await page.click('[data-testid="send-button"]')
    
    const messageCount = await page.locator('[data-testid="message-item"]').count()
    
    // Delete the message
    await page.locator('[data-testid="message-item"]').last().hover()
    await page.click('[data-testid="delete-message-button"]')
    await page.click('[data-testid="confirm-delete-button"]')
    
    // Verify message is deleted
    await expect(page.locator('[data-testid="message-item"]')).toHaveCount(messageCount - 1)
  })

  test('should upload and send an image', async ({ page }) => {
    await page.locator('[data-testid="conversation-item"]').first().click()
    
    // Upload image
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles('e2e/fixtures/test-image.jpg')
    
    // Verify image preview appears
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible()
    
    // Send image
    await page.click('[data-testid="send-button"]')
    
    // Verify image message appears
    await expect(page.locator('[data-testid="message-item"]').last().locator('[data-testid="image-attachment"]')).toBeVisible()
  })

  test('should create a group conversation', async ({ page }) => {
    await page.click('[data-testid="new-conversation-button"]')
    await page.click('[data-testid="create-group-tab"]')
    
    // Fill group details
    await page.fill('[data-testid="group-name-input"]', 'Test Group')
    
    // Add members
    await page.fill('[data-testid="search-users-input"]', 'user')
    await page.click('[data-testid="user-result"]').first()
    await page.click('[data-testid="add-member-button"]')
    
    // Create group
    await page.click('[data-testid="create-group-button"]')
    
    // Verify group appears in conversation list
    await expect(page.locator('[data-testid="conversation-item"]').filter({ hasText: 'Test Group' })).toBeVisible()
  })
})