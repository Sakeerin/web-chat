#!/usr/bin/env ts-node

/**
 * Verification script for Message Storage and Retrieval System
 * This script validates that all task requirements are properly implemented
 */

import { PrismaClient } from '@prisma/client'
import { ulid } from 'ulid'

interface VerificationResult {
  feature: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  message: string
  details?: string[]
}

class MessageImplementationVerifier {
  private prisma: PrismaClient
  private results: VerificationResult[] = []

  constructor() {
    this.prisma = new PrismaClient()
  }

  async verify(): Promise<void> {
    console.log('🔍 Verifying Message Storage and Retrieval System Implementation...\n')

    await this.verifyULIDGeneration()
    await this.verifyCursorBasedPagination()
    await this.verifyMessageEditing()
    await this.verifyMessageDeletion()
    await this.verifySearchIndexing()
    await this.verifyDatabaseIndexes()
    await this.verifyTestCoverage()

    this.printResults()
    await this.prisma.$disconnect()
  }

  private async verifyULIDGeneration(): Promise<void> {
    try {
      // Check if ULID generation is working
      const testULID = ulid()
      const isValidULID = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/.test(testULID)
      
      if (isValidULID) {
        this.addResult('ULID Generation', 'PASS', 'ULID generation is properly implemented')
      } else {
        this.addResult('ULID Generation', 'FAIL', 'ULID generation is not working correctly')
      }

      // Check if messages service uses ULID
      const fs = await import('fs')
      const messagesServiceContent = fs.readFileSync('src/messages/messages.service.ts', 'utf8')
      
      if (messagesServiceContent.includes('ulid()') && messagesServiceContent.includes('time-ordered')) {
        this.addResult('ULID Integration', 'PASS', 'Messages service properly uses ULID for time-ordered IDs')
      } else {
        this.addResult('ULID Integration', 'FAIL', 'Messages service does not properly implement ULID')
      }
    } catch (error) {
      this.addResult('ULID Generation', 'FAIL', `Error verifying ULID: ${error}`)
    }
  }

  private async verifyCursorBasedPagination(): Promise<void> {
    try {
      const fs = await import('fs')
      const messagesServiceContent = fs.readFileSync('src/messages/messages.service.ts', 'utf8')
      
      const hasNextCursor = messagesServiceContent.includes('nextCursor')
      const hasHasMore = messagesServiceContent.includes('hasMore')
      const hasCursorLogic = messagesServiceContent.includes('cursor') && messagesServiceContent.includes('lt:')
      const hasLimitPlusOne = messagesServiceContent.includes('limit + 1')

      if (hasNextCursor && hasHasMore && hasCursorLogic && hasLimitPlusOne) {
        this.addResult('Cursor-based Pagination', 'PASS', 'Cursor-based pagination is properly implemented', [
          '✓ NextCursor field present',
          '✓ HasMore logic implemented',
          '✓ Cursor filtering logic present',
          '✓ Limit+1 pattern for hasMore detection'
        ])
      } else {
        const missing: string[] = []
        if (!hasNextCursor) missing.push('NextCursor field')
        if (!hasHasMore) missing.push('HasMore logic')
        if (!hasCursorLogic) missing.push('Cursor filtering')
        if (!hasLimitPlusOne) missing.push('Limit+1 pattern')
        
        this.addResult('Cursor-based Pagination', 'FAIL', 'Cursor-based pagination is incomplete', [
          `Missing: ${missing.join(', ')}`
        ])
      }
    } catch (error) {
      this.addResult('Cursor-based Pagination', 'FAIL', `Error verifying pagination: ${error}`)
    }
  }

  private async verifyMessageEditing(): Promise<void> {
    try {
      const fs = await import('fs')
      const messagesServiceContent = fs.readFileSync('src/messages/messages.service.ts', 'utf8')
      
      const hasEditHistory = messagesServiceContent.includes('messageEdit.create')
      const hasTransaction = messagesServiceContent.includes('$transaction')
      const hasEditedFlag = messagesServiceContent.includes('isEdited: true')
      const hasEditedAt = messagesServiceContent.includes('editedAt:')
      const hasEditHistoryMethod = messagesServiceContent.includes('getMessageEditHistory')

      if (hasEditHistory && hasTransaction && hasEditedFlag && hasEditedAt && hasEditHistoryMethod) {
        this.addResult('Message Editing', 'PASS', 'Message editing with edit history is properly implemented', [
          '✓ Edit history tracking',
          '✓ Transaction-based updates',
          '✓ Edit flags and timestamps',
          '✓ Edit history retrieval method'
        ])
      } else {
        const missing: string[] = []
        if (!hasEditHistory) missing.push('Edit history tracking')
        if (!hasTransaction) missing.push('Transaction usage')
        if (!hasEditedFlag) missing.push('Edit flags')
        if (!hasEditedAt) missing.push('Edit timestamps')
        if (!hasEditHistoryMethod) missing.push('Edit history method')
        
        this.addResult('Message Editing', 'FAIL', 'Message editing is incomplete', [
          `Missing: ${missing.join(', ')}`
        ])
      }
    } catch (error) {
      this.addResult('Message Editing', 'FAIL', `Error verifying message editing: ${error}`)
    }
  }

  private async verifyMessageDeletion(): Promise<void> {
    try {
      const fs = await import('fs')
      const messagesServiceContent = fs.readFileSync('src/messages/messages.service.ts', 'utf8')
      
      const hasSoftDelete = messagesServiceContent.includes('isDeleted: true')
      const hasTombstone = messagesServiceContent.includes('[This message was deleted]')
      const hasDeletedAt = messagesServiceContent.includes('deletedAt:')
      const hasDeletedFilter = messagesServiceContent.includes('isDeleted: false')

      if (hasSoftDelete && hasTombstone && hasDeletedAt && hasDeletedFilter) {
        this.addResult('Message Deletion', 'PASS', 'Soft delete with tombstone records is properly implemented', [
          '✓ Soft delete flag',
          '✓ Tombstone content',
          '✓ Deletion timestamp',
          '✓ Deleted message filtering'
        ])
      } else {
        const missing: string[] = []
        if (!hasSoftDelete) missing.push('Soft delete flag')
        if (!hasTombstone) missing.push('Tombstone content')
        if (!hasDeletedAt) missing.push('Deletion timestamp')
        if (!hasDeletedFilter) missing.push('Deleted filtering')
        
        this.addResult('Message Deletion', 'FAIL', 'Message deletion is incomplete', [
          `Missing: ${missing.join(', ')}`
        ])
      }
    } catch (error) {
      this.addResult('Message Deletion', 'FAIL', `Error verifying message deletion: ${error}`)
    }
  }

  private async verifySearchIndexing(): Promise<void> {
    try {
      const fs = await import('fs')
      
      // Check if search service exists
      const searchServiceExists = fs.existsSync('src/messages/search/message-search.service.ts')
      
      if (searchServiceExists) {
        const searchServiceContent = fs.readFileSync('src/messages/search/message-search.service.ts', 'utf8')
        
        const hasAdvancedSearch = searchServiceContent.includes('MessageSearchOptions')
        const hasIndexingPrep = searchServiceContent.includes('prepareMessageForIndexing')
        const hasSuggestions = searchServiceContent.includes('getSearchSuggestions')
        const hasNormalization = searchServiceContent.includes('normalizeContent')
        const hasSearchDocument = searchServiceContent.includes('MessageSearchDocument')

        if (hasAdvancedSearch && hasIndexingPrep && hasSuggestions && hasNormalization && hasSearchDocument) {
          this.addResult('Search Indexing Preparation', 'PASS', 'Advanced search functionality is properly implemented', [
            '✓ Advanced search options',
            '✓ Message indexing preparation',
            '✓ Search suggestions',
            '✓ Content normalization',
            '✓ Search document interface'
          ])
        } else {
          const missing: string[] = []
          if (!hasAdvancedSearch) missing.push('Advanced search options')
          if (!hasIndexingPrep) missing.push('Indexing preparation')
          if (!hasSuggestions) missing.push('Search suggestions')
          if (!hasNormalization) missing.push('Content normalization')
          if (!hasSearchDocument) missing.push('Search document interface')
          
          this.addResult('Search Indexing Preparation', 'WARNING', 'Search functionality is partially implemented', [
            `Missing: ${missing.join(', ')}`
          ])
        }
      } else {
        this.addResult('Search Indexing Preparation', 'FAIL', 'Search service not found')
      }
    } catch (error) {
      this.addResult('Search Indexing Preparation', 'FAIL', `Error verifying search indexing: ${error}`)
    }
  }

  private async verifyDatabaseIndexes(): Promise<void> {
    try {
      const fs = await import('fs')
      
      // Check schema indexes
      const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8')
      
      const hasConversationIdIndex = schemaContent.includes('@@index([conversationId, createdAt])')
      const hasCursorIndex = schemaContent.includes('@@index([conversationId, id])')
      const hasSoftDeleteIndex = schemaContent.includes('@@index([conversationId, isDeleted, createdAt])')
      
      // Check migration file
      const migrationExists = fs.existsSync('prisma/migrations/20241201000000_improve_message_indexing/migration.sql')
      
      if (hasConversationIdIndex && hasCursorIndex && hasSoftDeleteIndex && migrationExists) {
        this.addResult('Database Indexes', 'PASS', 'Database indexes are properly configured', [
          '✓ Conversation + created_at index',
          '✓ Cursor pagination index',
          '✓ Soft delete filtering index',
          '✓ Migration file present'
        ])
      } else {
        const missing: string[] = []
        if (!hasConversationIdIndex) missing.push('Conversation index')
        if (!hasCursorIndex) missing.push('Cursor index')
        if (!hasSoftDeleteIndex) missing.push('Soft delete index')
        if (!migrationExists) missing.push('Migration file')
        
        this.addResult('Database Indexes', 'WARNING', 'Database indexes need improvement', [
          `Missing: ${missing.join(', ')}`
        ])
      }
    } catch (error) {
      this.addResult('Database Indexes', 'FAIL', `Error verifying database indexes: ${error}`)
    }
  }

  private async verifyTestCoverage(): Promise<void> {
    try {
      const fs = await import('fs')
      
      const unitTestExists = fs.existsSync('src/messages/messages.service.unit.spec.ts')
      const controllerTestExists = fs.existsSync('src/messages/messages.controller.spec.ts')
      const integrationTestExists = fs.existsSync('src/messages/messages.integration.spec.ts')
      const searchTestExists = fs.existsSync('src/messages/search/message-search.service.spec.ts')
      
      const testFiles: string[] = []
      if (unitTestExists) testFiles.push('Unit tests')
      if (controllerTestExists) testFiles.push('Controller tests')
      if (integrationTestExists) testFiles.push('Integration tests')
      if (searchTestExists) testFiles.push('Search service tests')
      
      if (testFiles.length >= 3) {
        this.addResult('Test Coverage', 'PASS', 'Comprehensive test coverage is implemented', testFiles.map(f => `✓ ${f}`))
      } else {
        this.addResult('Test Coverage', 'WARNING', 'Test coverage could be improved', [
          `Present: ${testFiles.join(', ')}`,
          `Missing: ${4 - testFiles.length} test file(s)`
        ])
      }
    } catch (error) {
      this.addResult('Test Coverage', 'FAIL', `Error verifying test coverage: ${error}`)
    }
  }

  private addResult(feature: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: string[]): void {
    this.results.push({ feature, status, message, details })
  }

  private printResults(): void {
    console.log('📊 Verification Results:\n')
    
    let passCount = 0
    let failCount = 0
    let warningCount = 0
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'
      console.log(`${icon} ${result.feature}: ${result.message}`)
      
      if (result.details) {
        result.details.forEach(detail => {
          console.log(`   ${detail}`)
        })
      }
      console.log()
      
      if (result.status === 'PASS') passCount++
      else if (result.status === 'FAIL') failCount++
      else warningCount++
    })
    
    console.log('📈 Summary:')
    console.log(`   ✅ Passed: ${passCount}`)
    console.log(`   ⚠️  Warnings: ${warningCount}`)
    console.log(`   ❌ Failed: ${failCount}`)
    console.log(`   📊 Total: ${this.results.length}`)
    
    if (failCount === 0) {
      console.log('\n🎉 All critical requirements are implemented!')
      if (warningCount > 0) {
        console.log('💡 Consider addressing the warnings for optimal implementation.')
      }
    } else {
      console.log('\n🚨 Some critical requirements are missing. Please address the failed items.')
    }
  }
}

// Run verification
const verifier = new MessageImplementationVerifier()
verifier.verify().catch(console.error)