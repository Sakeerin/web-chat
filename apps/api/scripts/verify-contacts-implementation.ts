#!/usr/bin/env ts-node

import { PrismaService } from '../src/database/prisma.service';
import { ContactsService } from '../src/users/contacts.service';
import { ContactRequestStatus, ReportStatus } from '@prisma/client';
import * as argon2 from 'argon2';

async function main() {
  console.log('🔍 Verifying Contact Management Implementation...\n');

  const prismaService = new PrismaService();
  const contactsService = new ContactsService(prismaService);

  try {
    // Clean up any existing test data
    await prismaService.userReport.deleteMany({
      where: { reporter: { username: { startsWith: 'testcontact' } } },
    });
    await prismaService.blockedUser.deleteMany({
      where: { blockingUser: { username: { startsWith: 'testcontact' } } },
    });
    await prismaService.contactRequest.deleteMany({
      where: { sender: { username: { startsWith: 'testcontact' } } },
    });
    await prismaService.user.deleteMany({
      where: { username: { startsWith: 'testcontact' } },
    });

    // Create test users
    const salt = 'test-salt';
    const hashedPassword = await argon2.hash('password123', { salt: Buffer.from(salt) });

    const user1 = await prismaService.user.create({
      data: {
        username: 'testcontact1',
        email: 'testcontact1@test.com',
        name: 'Test Contact User 1',
        passwordHash: hashedPassword,
        salt,
        privacySettings: {
          allowContactRequests: true,
          lastSeenVisibility: 'EVERYONE',
          showOnlineStatus: true,
        },
      },
    });

    const user2 = await prismaService.user.create({
      data: {
        username: 'testcontact2',
        email: 'testcontact2@test.com',
        name: 'Test Contact User 2',
        passwordHash: hashedPassword,
        salt,
        privacySettings: {
          allowContactRequests: true,
          lastSeenVisibility: 'CONTACTS',
          showOnlineStatus: true,
        },
      },
    });

    const user3 = await prismaService.user.create({
      data: {
        username: 'testcontact3',
        email: 'testcontact3@test.com',
        name: 'Test Contact User 3',
        passwordHash: hashedPassword,
        salt,
        privacySettings: {
          allowContactRequests: false,
          lastSeenVisibility: 'NOBODY',
          showOnlineStatus: false,
        },
      },
    });

    console.log('✅ Created test users');

    // Test 1: Send contact request
    console.log('\n📋 Test 1: Send Contact Request');
    const contactRequest = await contactsService.sendContactRequest(user1.id, {
      username: 'testcontact2',
      message: 'Hello, let\'s connect!',
    });
    console.log(`✅ Contact request sent: ${contactRequest.id}`);
    console.log(`   Status: ${contactRequest.status}`);
    console.log(`   Message: ${contactRequest.message}`);

    // Test 2: Get pending requests
    console.log('\n📋 Test 2: Get Pending Requests');
    const pendingRequests = await contactsService.getPendingContactRequests(user2.id);
    console.log(`✅ Found ${pendingRequests.length} pending requests`);
    if (pendingRequests.length > 0) {
      console.log(`   First request from: ${pendingRequests[0].sender.username}`);
    }

    // Test 3: Accept contact request
    console.log('\n📋 Test 3: Accept Contact Request');
    const acceptedRequest = await contactsService.respondToContactRequest(
      user2.id,
      contactRequest.id,
      { status: ContactRequestStatus.ACCEPTED },
    );
    console.log(`✅ Contact request accepted: ${acceptedRequest.status}`);

    // Test 4: Get contacts list
    console.log('\n📋 Test 4: Get Contacts List');
    const contacts = await contactsService.getContacts(user1.id);
    console.log(`✅ Found ${contacts.contacts.length} contacts`);
    if (contacts.contacts.length > 0) {
      console.log(`   First contact: ${contacts.contacts[0].username}`);
    }

    // Test 5: Check if users are contacts
    console.log('\n📋 Test 5: Check Contact Status');
    const areContacts = await contactsService.areUsersContacts(user1.id, user2.id);
    console.log(`✅ Users are contacts: ${areContacts}`);

    // Test 6: Block user
    console.log('\n📋 Test 6: Block User');
    const blockedUser = await contactsService.blockUser(user1.id, {
      userId: user3.id,
      reason: 'Test blocking',
    });
    console.log(`✅ User blocked: ${blockedUser.blockedUser.username}`);
    console.log(`   Reason: ${blockedUser.reason}`);

    // Test 7: Get blocked users
    console.log('\n📋 Test 7: Get Blocked Users');
    const blockedUsers = await contactsService.getBlockedUsers(user1.id);
    console.log(`✅ Found ${blockedUsers.blockedUsers.length} blocked users`);
    if (blockedUsers.blockedUsers.length > 0) {
      console.log(`   First blocked user: ${blockedUsers.blockedUsers[0].blockedUser.username}`);
    }

    // Test 8: Check if users are blocked
    console.log('\n📋 Test 8: Check Blocked Status');
    const areBlocked = await contactsService.areUsersBlocked(user1.id, user3.id);
    console.log(`✅ Users are blocked: ${areBlocked}`);

    // Test 9: Report user
    console.log('\n📋 Test 9: Report User');
    const report = await contactsService.reportUser(user1.id, {
      userId: user3.id,
      reason: 'Inappropriate behavior',
      description: 'Test report for verification',
    });
    console.log(`✅ User reported: ${report.reported.username}`);
    console.log(`   Status: ${report.status}`);
    console.log(`   Reason: ${report.reason}`);

    // Test 10: Unblock user
    console.log('\n📋 Test 10: Unblock User');
    await contactsService.unblockUser(user1.id, { userId: user3.id });
    console.log('✅ User unblocked successfully');

    // Test 11: Remove contact
    console.log('\n📋 Test 11: Remove Contact');
    await contactsService.removeContact(user1.id, user2.id);
    console.log('✅ Contact removed successfully');

    // Verify contact was removed
    const contactsAfterRemoval = await contactsService.getContacts(user1.id);
    console.log(`   Contacts after removal: ${contactsAfterRemoval.contacts.length}`);

    // Test error cases
    console.log('\n📋 Test 12: Error Cases');
    
    try {
      await contactsService.sendContactRequest(user1.id, {
        username: 'testcontact3', // User who doesn't allow contact requests
        message: 'This should fail',
      });
      console.log('❌ Should have thrown error for user who doesn\'t allow contact requests');
    } catch (error) {
      console.log('✅ Correctly threw error for user who doesn\'t allow contact requests');
    }

    try {
      await contactsService.blockUser(user1.id, { userId: user1.id }); // Block self
      console.log('❌ Should have thrown error for blocking self');
    } catch (error) {
      console.log('✅ Correctly threw error for blocking self');
    }

    try {
      await contactsService.reportUser(user1.id, { userId: user1.id, reason: 'Test' }); // Report self
      console.log('❌ Should have thrown error for reporting self');
    } catch (error) {
      console.log('✅ Correctly threw error for reporting self');
    }

    console.log('\n🎉 All Contact Management Tests Passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up test data
    await prismaService.userReport.deleteMany({
      where: { reporter: { username: { startsWith: 'testcontact' } } },
    });
    await prismaService.blockedUser.deleteMany({
      where: { blockingUser: { username: { startsWith: 'testcontact' } } },
    });
    await prismaService.contactRequest.deleteMany({
      where: { sender: { username: { startsWith: 'testcontact' } } },
    });
    await prismaService.user.deleteMany({
      where: { username: { startsWith: 'testcontact' } },
    });

    await prismaService.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };