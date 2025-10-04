/**
 * End-to-End Integration Tests for Complete User Workflows
 * Tests the entire user journey from registration to advanced features
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

interface TestUser {
  email: string;
  password: string;
  username: string;
  name: string;
}

interface TestContext {
  user1: TestUser;
  user2: TestUser;
  adminUser: TestUser;
}

// Test data setup
const createTestUser = (): TestUser => ({
  email: faker.internet.email(),
  password: 'TestPassword123!',
  username: faker.internet.userName().toLowerCase(),
  name: faker.person.fullName()
});

test.describe('Complete User Workflows', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;
  let testContext: TestContext;

  test.beforeAll(async ({ browser }) => {
    // Create separate browser contexts for multi-user testing
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    testContext = {
      user1: createTestUser(),
      user2: createTestUser(),
      adminUser: {
        email: 'admin@test.com',
        password: 'AdminPassword123!',
        username: 'admin',
        name: 'Admin User'
      }
    };
  });

  test.afterAll(async () => {
    await context1.close();
    await context2.close();
  });

  test('Complete user registration and profile setup workflow', async () => {
    // User 1 Registration
    await page1.goto('/register');
    
    // Fill registration form
    await page1.fill('[data-testid="email-input"]', testContext.user1.email);
    await page1.fill('[data-testid="password-input"]', testContext.user1.password);
    await page1.fill('[data-testid="confirm-password-input"]', testContext.user1.password);
    await page1.fill('[data-testid="username-input"]', testContext.user1.username);
    await page1.fill('[data-testid="name-input"]', testContext.user1.name);
    
    // Submit registration
    await page1.click('[data-testid="register-button"]');
    
    // Verify email verification prompt
    await expect(page1.locator('[data-testid="email-verification-prompt"]')).toBeVisible();
    
    // Simulate email verification (in real test, would use test email service)
    await page1.goto('/verify-email?token=test-token');
    
    // Should redirect to login
    await expect(page1).toHaveURL('/login');
    
    // Login with verified account
    await page1.fill('[data-testid="email-input"]', testContext.user1.email);
    await page1.fill('[data-testid="password-input"]', testContext.user1.password);
    await page1.click('[data-testid="login-button"]');
    
    // Should redirect to chat interface
    await expect(page1).toHaveURL('/chat');
    
    // Verify user is logged in
    await expect(page1.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Complete profile setup
    await page1.click('[data-testid="user-menu"]');
    await page1.click('[data-testid="profile-settings"]');
    
    // Upload avatar
    const fileInput = page1.locator('[data-testid="avatar-upload"]');
    await fileInput.setInputFiles('tests/fixtures/test-avatar.jpg');
    
    // Wait for upload to complete
    await expect(page1.locator('[data-testid="avatar-preview"]')).toBeVisible();
    
    // Update bio
    await page1.fill('[data-testid="bio-input"]', 'Test user bio for integration testing');
    
    // Save profile
    await page1.click('[data-testid="save-profile-button"]');
    
    // Verify success message
    await expect(page1.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('Complete messaging workflow between two users', async () => {
    // Register and login second user
    await page2.goto('/register');
    await page2.fill('[data-testid="email-input"]', testContext.user2.email);
    await page2.fill('[data-testid="password-input"]', testContext.user2.password);
    await page2.fill('[data-testid="confirm-password-input"]', testContext.user2.password);
    await page2.fill('[data-testid="username-input"]', testContext.user2.username);
    await page2.fill('[data-testid="name-input"]', testContext.user2.name);
    await page2.click('[data-testid="register-button"]');
    
    // Skip email verification for test
    await page2.goto('/login');
    await page2.fill('[data-testid="email-input"]', testContext.user2.email);
    await page2.fill('[data-testid="password-input"]', testContext.user2.password);
    await page2.click('[data-testid="login-button"]');
    
    // User 1 adds User 2 as contact
    await page1.goto('/chat');
    await page1.click('[data-testid="add-contact-button"]');
    await page1.fill('[data-testid="username-search"]', testContext.user2.username);
    await page1.click('[data-testid="search-button"]');
    
    // Send contact request
    await expect(page1.locator(`[data-testid="user-${testContext.user2.username}"]`)).toBeVisible();
    await page1.click(`[data-testid="add-contact-${testContext.user2.username}"]`);
    
    // User 2 accepts contact request
    await page2.goto('/chat');
    await expect(page2.locator('[data-testid="contact-requests"]')).toBeVisible();
    await page2.click('[data-testid="contact-requests"]');
    await page2.click(`[data-testid="accept-request-${testContext.user1.username}"]`);
    
    // Start conversation
    await page1.click(`[data-testid="contact-${testContext.user2.username}"]`);
    await page1.click('[data-testid="start-chat-button"]');
    
    // Send first message
    const message1 = 'Hello! This is a test message from integration tests.';
    await page1.fill('[data-testid="message-input"]', message1);
    await page1.click('[data-testid="send-button"]');
    
    // Verify message appears in sender's chat
    await expect(page1.locator(`[data-testid="message"]:has-text("${message1}")`)).toBeVisible();
    
    // Verify message appears in recipient's chat
    await page2.goto('/chat');
    await page2.click(`[data-testid="conversation-${testContext.user1.username}"]`);
    await expect(page2.locator(`[data-testid="message"]:has-text("${message1}")`)).toBeVisible();
    
    // Reply from User 2
    const message2 = 'Hello back! Integration test reply.';
    await page2.fill('[data-testid="message-input"]', message2);
    await page2.click('[data-testid="send-button"]');
    
    // Verify reply appears in both chats
    await expect(page2.locator(`[data-testid="message"]:has-text("${message2}")`)).toBeVisible();
    await expect(page1.locator(`[data-testid="message"]:has-text("${message2}")`)).toBeVisible();
  });

  test('File upload and media sharing workflow', async () => {
    // Navigate to existing conversation
    await page1.goto('/chat');
    await page1.click(`[data-testid="conversation-${testContext.user2.username}"]`);
    
    // Upload image
    await page1.click('[data-testid="attach-file-button"]');
    const imageInput = page1.locator('[data-testid="file-input"]');
    await imageInput.setInputFiles('tests/fixtures/test-image.jpg');
    
    // Verify upload progress
    await expect(page1.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // Wait for upload completion and send
    await page1.waitForSelector('[data-testid="send-media-button"]');
    await page1.click('[data-testid="send-media-button"]');
    
    // Verify image message appears
    await expect(page1.locator('[data-testid="image-message"]')).toBeVisible();
    
    // Verify recipient receives image
    await expect(page2.locator('[data-testid="image-message"]')).toBeVisible();
    
    // Test video upload
    await page1.click('[data-testid="attach-file-button"]');
    const videoInput = page1.locator('[data-testid="file-input"]');
    await videoInput.setInputFiles('tests/fixtures/test-video.mp4');
    
    // Wait for video processing
    await page1.waitForSelector('[data-testid="video-preview"]');
    await page1.click('[data-testid="send-media-button"]');
    
    // Verify video message
    await expect(page1.locator('[data-testid="video-message"]')).toBeVisible();
    await expect(page2.locator('[data-testid="video-message"]')).toBeVisible();
  });

  test('Group chat creation and management workflow', async () => {
    // Create group chat
    await page1.goto('/chat');
    await page1.click('[data-testid="create-group-button"]');
    
    // Fill group details
    await page1.fill('[data-testid="group-name-input"]', 'Integration Test Group');
    await page1.fill('[data-testid="group-description-input"]', 'Test group for integration testing');
    
    // Add User 2 to group
    await page1.fill('[data-testid="add-member-input"]', testContext.user2.username);
    await page1.click('[data-testid="add-member-button"]');
    
    // Verify member added
    await expect(page1.locator(`[data-testid="member-${testContext.user2.username}"]`)).toBeVisible();
    
    // Create group
    await page1.click('[data-testid="create-group-submit"]');
    
    // Verify group appears in conversation list
    await expect(page1.locator('[data-testid="group-Integration Test Group"]')).toBeVisible();
    
    // Send message in group
    await page1.click('[data-testid="group-Integration Test Group"]');
    const groupMessage = 'Welcome to the integration test group!';
    await page1.fill('[data-testid="message-input"]', groupMessage);
    await page1.click('[data-testid="send-button"]');
    
    // Verify User 2 receives group invitation and message
    await page2.goto('/chat');
    await expect(page2.locator('[data-testid="group-Integration Test Group"]')).toBeVisible();
    await page2.click('[data-testid="group-Integration Test Group"]');
    await expect(page2.locator(`[data-testid="message"]:has-text("${groupMessage}")`)).toBeVisible();
  });

  test('Search functionality workflow', async () => {
    // Test message search
    await page1.goto('/chat');
    await page1.click('[data-testid="search-button"]');
    
    // Search for previous message
    await page1.fill('[data-testid="search-input"]', 'integration test');
    await page1.press('[data-testid="search-input"]', 'Enter');
    
    // Verify search results
    await expect(page1.locator('[data-testid="search-results"]')).toBeVisible();
    await expect(page1.locator('[data-testid="search-result-item"]')).toHaveCount({ min: 1 });
    
    // Test contact search
    await page1.click('[data-testid="search-filter-contacts"]');
    await page1.fill('[data-testid="search-input"]', testContext.user2.username);
    
    // Verify contact found
    await expect(page1.locator(`[data-testid="contact-result-${testContext.user2.username}"]`)).toBeVisible();
    
    // Test conversation search
    await page1.click('[data-testid="search-filter-conversations"]');
    await page1.fill('[data-testid="search-input"]', 'Integration Test Group');
    
    // Verify group found
    await expect(page1.locator('[data-testid="conversation-result-Integration Test Group"]')).toBeVisible();
  });

  test('Privacy and security settings workflow', async () => {
    // Navigate to privacy settings
    await page1.goto('/settings/privacy');
    
    // Test last seen privacy
    await page1.click('[data-testid="last-seen-select"]');
    await page1.click('[data-testid="last-seen-contacts-only"]');
    
    // Test read receipts privacy
    await page1.click('[data-testid="read-receipts-toggle"]');
    
    // Test profile photo privacy
    await page1.click('[data-testid="profile-photo-select"]');
    await page1.click('[data-testid="profile-photo-nobody"]');
    
    // Save settings
    await page1.click('[data-testid="save-privacy-settings"]');
    
    // Verify settings saved
    await expect(page1.locator('[data-testid="settings-saved-message"]')).toBeVisible();
    
    // Test blocking functionality
    await page1.goto('/chat');
    await page1.click(`[data-testid="conversation-${testContext.user2.username}"]`);
    await page1.click('[data-testid="conversation-menu"]');
    await page1.click('[data-testid="block-user"]');
    await page1.click('[data-testid="confirm-block"]');
    
    // Verify user is blocked
    await expect(page1.locator('[data-testid="user-blocked-message"]')).toBeVisible();
    
    // Verify User 2 cannot send messages
    await page2.goto('/chat');
    await page2.click(`[data-testid="conversation-${testContext.user1.username}"]`);
    await expect(page2.locator('[data-testid="message-input"]')).toBeDisabled();
  });

  test('PWA and offline functionality workflow', async () => {
    // Test PWA installation prompt
    await page1.goto('/');
    
    // Simulate PWA install prompt (if supported)
    const installButton = page1.locator('[data-testid="pwa-install-button"]');
    if (await installButton.isVisible()) {
      await installButton.click();
    }
    
    // Test offline functionality
    await page1.goto('/chat');
    
    // Go offline
    await page1.context().setOffline(true);
    
    // Try to send message while offline
    await page1.click(`[data-testid="conversation-${testContext.user2.username}"]`);
    const offlineMessage = 'This message was sent while offline';
    await page1.fill('[data-testid="message-input"]', offlineMessage);
    await page1.click('[data-testid="send-button"]');
    
    // Verify message is queued
    await expect(page1.locator('[data-testid="message-queued"]')).toBeVisible();
    
    // Go back online
    await page1.context().setOffline(false);
    
    // Verify message is sent
    await expect(page1.locator(`[data-testid="message"]:has-text("${offlineMessage}")`)).toBeVisible();
    await expect(page1.locator('[data-testid="message-sent"]')).toBeVisible();
  });

  test('Admin functionality workflow', async () => {
    // Login as admin
    const adminPage = await context1.newPage();
    await adminPage.goto('/login');
    await adminPage.fill('[data-testid="email-input"]', testContext.adminUser.email);
    await adminPage.fill('[data-testid="password-input"]', testContext.adminUser.password);
    await adminPage.click('[data-testid="login-button"]');
    
    // Navigate to admin panel
    await adminPage.goto('/admin');
    
    // Verify admin dashboard loads
    await expect(adminPage.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    
    // Test user management
    await adminPage.click('[data-testid="user-management-tab"]');
    await expect(adminPage.locator('[data-testid="user-list"]')).toBeVisible();
    
    // Search for test user
    await adminPage.fill('[data-testid="user-search"]', testContext.user1.email);
    await expect(adminPage.locator(`[data-testid="user-${testContext.user1.username}"]`)).toBeVisible();
    
    // Test content moderation
    await adminPage.click('[data-testid="moderation-tab"]');
    await expect(adminPage.locator('[data-testid="reported-content"]')).toBeVisible();
    
    // Test system analytics
    await adminPage.click('[data-testid="analytics-tab"]');
    await expect(adminPage.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="active-users-metric"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="messages-sent-metric"]')).toBeVisible();
    
    await adminPage.close();
  });
});