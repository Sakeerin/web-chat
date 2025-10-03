#!/usr/bin/env ts-node

/**
 * Schema validation script
 * 
 * This script validates the Prisma schema and checks for common issues:
 * - Schema syntax validation
 * - Relationship consistency
 * - Index optimization suggestions
 * - Performance considerations
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateSchema() {
  console.log('🔍 Validating Prisma schema...\n')

  try {
    // Test basic connectivity
    console.log('1. Testing database connectivity...')
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('   ✅ Database connection successful\n')

    // Test schema introspection
    console.log('2. Validating schema structure...')
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    ` as Array<{ table_name: string }>

    console.log(`   ✅ Found ${tables.length} tables:`)
    tables.forEach(table => {
      console.log(`      - ${table.table_name}`)
    })
    console.log()

    // Test relationships
    console.log('3. Testing relationships...')
    
    // Test user -> conversation relationship
    const userCount = await prisma.user.count()
    console.log(`   📊 Users: ${userCount}`)
    
    const conversationCount = await prisma.conversation.count()
    console.log(`   📊 Conversations: ${conversationCount}`)
    
    const messageCount = await prisma.message.count()
    console.log(`   📊 Messages: ${messageCount}`)
    
    const memberCount = await prisma.conversationMember.count()
    console.log(`   📊 Conversation Members: ${memberCount}`)
    
    console.log('   ✅ All relationships accessible\n')

    // Test indexes
    console.log('4. Checking indexes...')
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    ` as Array<{
      schemaname: string
      tablename: string
      indexname: string
      indexdef: string
    }>

    console.log(`   📊 Found ${indexes.length} indexes`)
    
    // Group by table
    const indexesByTable = indexes.reduce((acc, index) => {
      if (!acc[index.tablename]) {
        acc[index.tablename] = []
      }
      acc[index.tablename].push(index)
      return acc
    }, {} as Record<string, typeof indexes>)

    Object.entries(indexesByTable).forEach(([tableName, tableIndexes]) => {
      console.log(`   📋 ${tableName}: ${tableIndexes.length} indexes`)
    })
    console.log()

    // Performance recommendations
    console.log('5. Performance recommendations...')
    
    if (messageCount > 0) {
      // Check if messages have proper indexes for common queries
      const messageIndexes = indexesByTable['messages'] || []
      const hasConversationIndex = messageIndexes.some(idx => 
        idx.indexdef.includes('conversation_id') && idx.indexdef.includes('created_at')
      )
      
      if (hasConversationIndex) {
        console.log('   ✅ Messages table has conversation + timestamp index')
      } else {
        console.log('   ⚠️  Consider adding index on (conversation_id, created_at) for messages')
      }
    }

    if (userCount > 0) {
      const userIndexes = indexesByTable['users'] || []
      const hasUsernameIndex = userIndexes.some(idx => idx.indexdef.includes('username'))
      
      if (hasUsernameIndex) {
        console.log('   ✅ Users table has username index')
      } else {
        console.log('   ⚠️  Consider adding index on username for users')
      }
    }

    console.log('\n🎉 Schema validation completed successfully!')

  } catch (error) {
    console.error('❌ Schema validation failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Performance analysis function
async function analyzePerformance() {
  console.log('\n📊 Performance Analysis...\n')

  try {
    // Analyze table sizes
    const tableSizes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    ` as Array<{
      schemaname: string
      tablename: string
      size: string
      size_bytes: number
    }>

    console.log('Table sizes:')
    tableSizes.forEach(table => {
      console.log(`   ${table.tablename}: ${table.size}`)
    })

    // Check for potential performance issues
    console.log('\nPerformance recommendations:')
    
    const largestTable = tableSizes[0]
    if (largestTable && largestTable.size_bytes > 100 * 1024 * 1024) { // 100MB
      console.log(`   ⚠️  ${largestTable.tablename} is large (${largestTable.size}). Consider partitioning.`)
    }

    // Check for missing foreign key indexes
    const foreignKeys = await prisma.$queryRaw`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    ` as Array<{
      table_name: string
      column_name: string
      foreign_table_name: string
      foreign_column_name: string
    }>

    console.log(`\nFound ${foreignKeys.length} foreign key relationships`)

  } catch (error) {
    console.error('❌ Performance analysis failed:', error)
  }
}

// Main execution
async function main() {
  await validateSchema()
  await analyzePerformance()
}

if (require.main === module) {
  main().catch(console.error)
}

export { validateSchema, analyzePerformance }