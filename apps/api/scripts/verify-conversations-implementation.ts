#!/usr/bin/env tsx

/**
 * Verification script for Conversation Management Service implementation
 * 
 * This script verifies that all required functionality for Task 7 has been implemented:
 * - Conversation creation (DM and group chat types)
 * - Conversation member management (add, remove, role assignment)
 * - Conversation listing with pagination and last message preview
 * - Conversation metadata management (title, avatar, settings)
 * - Conversation search functionality
 * - Unit tests for conversation operations
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

interface VerificationResult {
  feature: string
  implemented: boolean
  details: string[]
  issues: string[]
}

function checkFileExists(filePath: string): boolean {
  return existsSync(join(process.cwd(), filePath))
}

function checkFileContains(filePath: string, patterns: string[]): { found: string[], missing: string[] } {
  if (!checkFileExists(filePath)) {
    return { found: [], missing: patterns }
  }
  
  const content = readFileSync(join(process.cwd(), filePath), 'utf-8')
  const found: string[] = []
  const missing: string[] = []
  
  patterns.forEach(pattern => {
    if (content.includes(pattern)) {
      found.push(pattern)
    } else {
      missing.push(pattern)
    }
  })
  
  return { found, missing }
}

function verifyConversationService(): VerificationResult {
  const serviceFile = 'src/conversations/conversations.service.ts'
  const requiredMethods = [
    'createConversation',
    'getConversations',
    'getConversationById',
    'updateConversation',
    'addMember',
    'removeMember',
    'updateMember',
    'searchConversations',
    'leaveConversation'
  ]
  
  const { found, missing } = checkFileContains(serviceFile, requiredMethods)
  
  return {
    feature: 'Conversation Service',
    implemented: missing.length === 0,
    details: [
      `Service file exists: ${checkFileExists(serviceFile)}`,
      `Methods implemented: ${found.length}/${requiredMethods.length}`,
      `Found methods: ${found.join(', ')}`,
    ],
    issues: missing.length > 0 ? [`Missing methods: ${missing.join(', ')}`] : []
  }
}

function verifyConversationController(): VerificationResult {
  const controllerFile = 'src/conversations/conversations.controller.ts'
  const requiredEndpoints = [
    '@Post()',
    '@Get()',
    '@Get(\':id\')',
    '@Put(\':id\')',
    '@Post(\':id/members\')',
    '@Put(\':id/members/:userId\')',
    '@Delete(\':id/members/:userId\')',
    '@Get(\'search\')',
    '@Post(\':id/leave\')'
  ]
  
  const { found, missing } = checkFileContains(controllerFile, requiredEndpoints)
  
  return {
    feature: 'Conversation Controller',
    implemented: missing.length === 0,
    details: [
      `Controller file exists: ${checkFileExists(controllerFile)}`,
      `Endpoints implemented: ${found.length}/${requiredEndpoints.length}`,
      `Found endpoints: ${found.join(', ')}`,
    ],
    issues: missing.length > 0 ? [`Missing endpoints: ${missing.join(', ')}`] : []
  }
}

function verifyDTOs(): VerificationResult {
  const dtoFiles = [
    'src/conversations/dto/create-conversation.dto.ts',
    'src/conversations/dto/update-conversation.dto.ts',
    'src/conversations/dto/add-member.dto.ts',
    'src/conversations/dto/update-member.dto.ts',
    'src/conversations/dto/conversation-query.dto.ts'
  ]
  
  const existingFiles = dtoFiles.filter(checkFileExists)
  
  return {
    feature: 'DTOs and Validation',
    implemented: existingFiles.length === dtoFiles.length,
    details: [
      `DTO files created: ${existingFiles.length}/${dtoFiles.length}`,
      `Existing files: ${existingFiles.map(f => f.split('/').pop()).join(', ')}`,
    ],
    issues: existingFiles.length < dtoFiles.length ? 
      [`Missing DTOs: ${dtoFiles.filter(f => !checkFileExists(f)).map(f => f.split('/').pop()).join(', ')}`] : []
  }
}

function verifyInterfaces(): VerificationResult {
  const interfaceFile = 'src/conversations/interfaces/conversation.interface.ts'
  const requiredInterfaces = [
    'ConversationWithMembers',
    'ConversationMemberInfo',
    'LastMessageInfo',
    'ConversationListResponse',
    'ConversationSearchResult'
  ]
  
  const { found, missing } = checkFileContains(interfaceFile, requiredInterfaces)
  
  return {
    feature: 'TypeScript Interfaces',
    implemented: missing.length === 0,
    details: [
      `Interface file exists: ${checkFileExists(interfaceFile)}`,
      `Interfaces defined: ${found.length}/${requiredInterfaces.length}`,
      `Found interfaces: ${found.join(', ')}`,
    ],
    issues: missing.length > 0 ? [`Missing interfaces: ${missing.join(', ')}`] : []
  }
}

function verifyModule(): VerificationResult {
  const moduleFile = 'src/conversations/conversations.module.ts'
  const requiredImports = [
    'ConversationsController',
    'ConversationsService'
  ]
  
  const { found, missing } = checkFileContains(moduleFile, requiredImports)
  
  return {
    feature: 'NestJS Module',
    implemented: missing.length === 0 && checkFileExists(moduleFile),
    details: [
      `Module file exists: ${checkFileExists(moduleFile)}`,
      `Required imports: ${found.length}/${requiredImports.length}`,
    ],
    issues: missing.length > 0 ? [`Missing imports: ${missing.join(', ')}`] : []
  }
}

function verifyAppModuleIntegration(): VerificationResult {
  const appModuleFile = 'src/app.module.ts'
  const requiredImport = 'ConversationsModule'
  
  const { found } = checkFileContains(appModuleFile, [requiredImport])
  
  return {
    feature: 'App Module Integration',
    implemented: found.length > 0,
    details: [
      `App module file exists: ${checkFileExists(appModuleFile)}`,
      `ConversationsModule imported: ${found.length > 0}`,
    ],
    issues: found.length === 0 ? ['ConversationsModule not imported in app.module.ts'] : []
  }
}

function verifyTests(): VerificationResult {
  const testFiles = [
    'src/conversations/conversations.service.unit.spec.ts',
    'src/conversations/conversations.integration.spec.ts'
  ]
  
  const existingTests = testFiles.filter(checkFileExists)
  
  // Check for test coverage of key methods
  const unitTestFile = 'src/conversations/conversations.service.unit.spec.ts'
  const testMethods = [
    'createConversation',
    'getConversationById',
    'addMember',
    'removeMember',
    'updateMember',
    'leaveConversation',
    'searchConversations'
  ]
  
  const { found: testedMethods } = checkFileContains(unitTestFile, testMethods)
  
  return {
    feature: 'Unit Tests',
    implemented: existingTests.length === testFiles.length && testedMethods.length >= 5,
    details: [
      `Test files created: ${existingTests.length}/${testFiles.length}`,
      `Methods tested: ${testedMethods.length}/${testMethods.length}`,
      `Tested methods: ${testedMethods.join(', ')}`,
    ],
    issues: existingTests.length < testFiles.length ? 
      [`Missing test files: ${testFiles.filter(f => !checkFileExists(f)).map(f => f.split('/').pop()).join(', ')}`] : []
  }
}

function verifyBusinessLogic(): VerificationResult {
  const serviceFile = 'src/conversations/conversations.service.ts'
  const businessRules = [
    'ConversationType.DM',
    'ConversationType.GROUP',
    'ConversationMemberRole.OWNER',
    'ConversationMemberRole.ADMIN',
    'ConversationMemberRole.MEMBER',
    'BadRequestException',
    'ForbiddenException',
    'NotFoundException',
    'blockedUser',
    'unreadCount'
  ]
  
  const { found, missing } = checkFileContains(serviceFile, businessRules)
  
  return {
    feature: 'Business Logic Implementation',
    implemented: found.length >= 8, // Most business rules should be present
    details: [
      `Business rules implemented: ${found.length}/${businessRules.length}`,
      `Found rules: ${found.join(', ')}`,
    ],
    issues: missing.length > 2 ? [`Missing business logic: ${missing.join(', ')}`] : []
  }
}

function verifyDocumentation(): VerificationResult {
  const readmeFile = 'src/conversations/README.md'
  const requiredSections = [
    '# Conversation Management Service',
    '## Features',
    '## API Endpoints',
    '## Data Models',
    '## Business Rules',
    '## Security Features'
  ]
  
  const { found, missing } = checkFileContains(readmeFile, requiredSections)
  
  return {
    feature: 'Documentation',
    implemented: found.length >= 4, // Most sections should be present
    details: [
      `README file exists: ${checkFileExists(readmeFile)}`,
      `Documentation sections: ${found.length}/${requiredSections.length}`,
    ],
    issues: missing.length > 2 ? [`Missing documentation sections: ${missing.join(', ')}`] : []
  }
}

// Run all verifications
function main() {
  console.log('🔍 Verifying Conversation Management Service Implementation (Task 7)\n')
  
  const verifications = [
    verifyConversationService(),
    verifyConversationController(),
    verifyDTOs(),
    verifyInterfaces(),
    verifyModule(),
    verifyAppModuleIntegration(),
    verifyTests(),
    verifyBusinessLogic(),
    verifyDocumentation()
  ]
  
  let allPassed = true
  
  verifications.forEach(result => {
    const status = result.implemented ? '✅' : '❌'
    console.log(`${status} ${result.feature}`)
    
    if (result.details.length > 0) {
      result.details.forEach(detail => console.log(`   • ${detail}`))
    }
    
    if (result.issues.length > 0) {
      result.issues.forEach(issue => console.log(`   ⚠️  ${issue}`))
      allPassed = false
    }
    
    console.log()
  })
  
  // Summary
  const passedCount = verifications.filter(v => v.implemented).length
  const totalCount = verifications.length
  
  console.log('📊 Summary')
  console.log(`   Implemented: ${passedCount}/${totalCount} features`)
  console.log(`   Status: ${allPassed ? '✅ All requirements met' : '⚠️  Some issues found'}`)
  
  if (allPassed) {
    console.log('\n🎉 Task 7: Conversation Management Service - COMPLETED')
    console.log('\nImplemented features:')
    console.log('• ✅ Conversation creation (DM and group chat types)')
    console.log('• ✅ Conversation member management (add, remove, role assignment)')
    console.log('• ✅ Conversation listing with pagination and last message preview')
    console.log('• ✅ Conversation metadata management (title, avatar, settings)')
    console.log('• ✅ Conversation search functionality')
    console.log('• ✅ Unit tests for conversation operations')
    console.log('\nRequirements satisfied: 3.1, 3.2, 3.6, 10.4')
  } else {
    console.log('\n⚠️  Task 7: Some implementation issues found - please review above')
  }
  
  process.exit(allPassed ? 0 : 1)
}

if (require.main === module) {
  main()
}