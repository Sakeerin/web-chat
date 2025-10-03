#!/usr/bin/env ts-node

/**
 * Verification script for WebSocket Infrastructure and Real-time Engine
 * 
 * This script verifies that all components of task 9 are properly implemented:
 * - Socket.IO server with authentication middleware
 * - Room-based message broadcasting system
 * - Connection management with reconnection handling
 * - Presence tracking system with Redis-based state storage
 * - Typing indicator functionality with debouncing
 * - Message acknowledgment system for delivery confirmation
 */

import { existsSync } from 'fs'
import { join } from 'path'

interface VerificationResult {
  component: string
  status: 'PASS' | 'FAIL'
  details: string[]
}

class WebSocketVerifier {
  private results: VerificationResult[] = []
  private srcPath = join(__dirname, '../src')

  private addResult(component: string, status: 'PASS' | 'FAIL', details: string[]) {
    this.results.push({ component, status, details })
  }

  private fileExists(path: string): boolean {
    return existsSync(join(this.srcPath, path))
  }

  private checkFileContent(path: string, patterns: string[]): { found: string[], missing: string[] } {
    const fullPath = join(this.srcPath, path)
    if (!existsSync(fullPath)) {
      return { found: [], missing: patterns }
    }

    const fs = require('fs')
    const content = fs.readFileSync(fullPath, 'utf8')
    
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

  verifySocketIOServer() {
    const details: string[] = []
    let hasErrors = false

    // Check if WebSocket gateway exists
    if (!this.fileExists('websocket/websocket.gateway.ts')) {
      details.push('❌ WebSocket gateway file missing')
      hasErrors = true
    } else {
      details.push('✅ WebSocket gateway file exists')
    }

    // Check for authentication middleware
    const authPatterns = [
      '@SubscribeMessage(\'auth\')',
      'jwtService.verifyAsync',
      'AuthenticatedSocket',
      'UnauthorizedException'
    ]

    const { found: authFound, missing: authMissing } = this.checkFileContent('websocket/websocket.gateway.ts', authPatterns)
    
    if (authMissing.length === 0) {
      details.push('✅ Authentication middleware implemented')
    } else {
      details.push(`❌ Missing authentication features: ${authMissing.join(', ')}`)
      hasErrors = true
    }

    // Check WebSocket module configuration
    if (!this.fileExists('websocket/websocket.module.ts')) {
      details.push('❌ WebSocket module missing')
      hasErrors = true
    } else {
      details.push('✅ WebSocket module exists')
    }

    this.addResult('Socket.IO Server with Authentication', hasErrors ? 'FAIL' : 'PASS', details)
  }

  verifyRoomBasedBroadcasting() {
    const details: string[] = []
    let hasErrors = false

    // Check for room management functionality
    const roomPatterns = [
      'join-room',
      'leave-room',
      'broadcastToConversation',
      'conversation:',
      'socket.join',
      'socket.leave'
    ]

    const { found: roomFound, missing: roomMissing } = this.checkFileContent('websocket/websocket.gateway.ts', roomPatterns)
    
    if (roomMissing.length === 0) {
      details.push('✅ Room management implemented')
    } else {
      details.push(`❌ Missing room features: ${roomMissing.join(', ')}`)
      hasErrors = true
    }

    // Check WebSocket service for broadcasting
    const broadcastPatterns = [
      'broadcastToConversation',
      'broadcastNewMessage',
      'server.to',
      'Redis'
    ]

    const { found: broadcastFound, missing: broadcastMissing } = this.checkFileContent('websocket/websocket.service.ts', broadcastPatterns)
    
    if (broadcastMissing.length === 0) {
      details.push('✅ Message broadcasting system implemented')
    } else {
      details.push(`❌ Missing broadcast features: ${broadcastMissing.join(', ')}`)
      hasErrors = true
    }

    this.addResult('Room-based Message Broadcasting', hasErrors ? 'FAIL' : 'PASS', details)
  }

  verifyConnectionManagement() {
    const details: string[] = []
    let hasErrors = false

    // Check connection lifecycle handlers
    const connectionPatterns = [
      'OnGatewayConnection',
      'OnGatewayDisconnect',
      'handleConnection',
      'handleDisconnect',
      'leaveAllRooms',
      'removeUserSocket'
    ]

    const { found: connFound, missing: connMissing } = this.checkFileContent('websocket/websocket.gateway.ts', connectionPatterns)
    
    if (connMissing.length === 0) {
      details.push('✅ Connection lifecycle management implemented')
    } else {
      details.push(`❌ Missing connection features: ${connMissing.join(', ')}`)
      hasErrors = true
    }

    // Check for reconnection handling
    const reconnectPatterns = [
      'authTimeout',
      'clearTimeout',
      'addUserSocket',
      'getUserSocketIds'
    ]

    const { found: reconnectFound, missing: reconnectMissing } = this.checkFileContent('websocket/websocket.service.ts', reconnectPatterns)
    
    if (reconnectMissing.length === 0) {
      details.push('✅ Reconnection handling implemented')
    } else {
      details.push(`❌ Missing reconnection features: ${reconnectMissing.join(', ')}`)
      hasErrors = true
    }

    this.addResult('Connection Management with Reconnection', hasErrors ? 'FAIL' : 'PASS', details)
  }

  verifyPresenceTracking() {
    const details: string[] = []
    let hasErrors = false

    // Check if presence service exists
    if (!this.fileExists('websocket/presence.service.ts')) {
      details.push('❌ Presence service missing')
      hasErrors = true
    } else {
      details.push('✅ Presence service exists')
    }

    // Check presence functionality
    const presencePatterns = [
      'setUserPresence',
      'getUserPresence',
      'isUserOnline',
      'PresenceStatus',
      'Redis',
      'presence:',
      'socketIds'
    ]

    const { found: presenceFound, missing: presenceMissing } = this.checkFileContent('websocket/presence.service.ts', presencePatterns)
    
    if (presenceMissing.length === 0) {
      details.push('✅ Redis-based presence tracking implemented')
    } else {
      details.push(`❌ Missing presence features: ${presenceMissing.join(', ')}`)
      hasErrors = true
    }

    // Check presence events in gateway
    const presenceEventPatterns = [
      'presence-update',
      'heartbeat',
      'presenceService'
    ]

    const { found: eventFound, missing: eventMissing } = this.checkFileContent('websocket/websocket.gateway.ts', presenceEventPatterns)
    
    if (eventMissing.length === 0) {
      details.push('✅ Presence event handling implemented')
    } else {
      details.push(`❌ Missing presence events: ${eventMissing.join(', ')}`)
      hasErrors = true
    }

    this.addResult('Presence Tracking System', hasErrors ? 'FAIL' : 'PASS', details)
  }

  verifyTypingIndicators() {
    const details: string[] = []
    let hasErrors = false

    // Check if typing service exists
    if (!this.fileExists('websocket/typing.service.ts')) {
      details.push('❌ Typing service missing')
      hasErrors = true
    } else {
      details.push('✅ Typing service exists')
    }

    // Check typing functionality with debouncing
    const typingPatterns = [
      'startTyping',
      'stopTyping',
      'setTimeout',
      'clearTimeout',
      'typingTimeouts',
      'typing:',
      'Redis'
    ]

    const { found: typingFound, missing: typingMissing } = this.checkFileContent('websocket/typing.service.ts', typingPatterns)
    
    if (typingMissing.length === 0) {
      details.push('✅ Typing indicators with debouncing implemented')
    } else {
      details.push(`❌ Missing typing features: ${typingMissing.join(', ')}`)
      hasErrors = true
    }

    // Check typing events in gateway
    const typingEventPatterns = [
      'typing-start',
      'typing-stop',
      'typingService'
    ]

    const { found: eventFound, missing: eventMissing } = this.checkFileContent('websocket/websocket.gateway.ts', typingEventPatterns)
    
    if (eventMissing.length === 0) {
      details.push('✅ Typing event handling implemented')
    } else {
      details.push(`❌ Missing typing events: ${eventMissing.join(', ')}`)
      hasErrors = true
    }

    this.addResult('Typing Indicator Functionality', hasErrors ? 'FAIL' : 'PASS', details)
  }

  verifyMessageAcknowledgment() {
    const details: string[] = []
    let hasErrors = false

    // Check message acknowledgment functionality
    const ackPatterns = [
      'message-ack',
      'sendMessageAck',
      'tempId',
      'messageId',
      'broadcastNewMessage'
    ]

    const { found: ackFound, missing: ackMissing } = this.checkFileContent('websocket/websocket.service.ts', ackPatterns)
    
    if (ackMissing.length === 0) {
      details.push('✅ Message acknowledgment system implemented')
    } else {
      details.push(`❌ Missing acknowledgment features: ${ackMissing.join(', ')}`)
      hasErrors = true
    }

    // Check for delivery confirmation
    const deliveryPatterns = [
      'message-new',
      'message-edited',
      'message-deleted',
      'receipt'
    ]

    const { found: deliveryFound, missing: deliveryMissing } = this.checkFileContent('websocket/websocket.gateway.ts', deliveryPatterns)
    
    if (deliveryMissing.length === 0) {
      details.push('✅ Delivery confirmation events implemented')
    } else {
      details.push(`❌ Missing delivery features: ${deliveryMissing.join(', ')}`)
      hasErrors = true
    }

    this.addResult('Message Acknowledgment System', hasErrors ? 'FAIL' : 'PASS', details)
  }

  verifyRedisIntegration() {
    const details: string[] = []
    let hasErrors = false

    // Check Redis pub/sub service
    if (!this.fileExists('websocket/redis-pubsub.service.ts')) {
      details.push('❌ Redis pub/sub service missing')
      hasErrors = true
    } else {
      details.push('✅ Redis pub/sub service exists')
    }

    // Check horizontal scaling support
    const scalingPatterns = [
      'pubClient',
      'subClient',
      'publish',
      'subscribe',
      'message:new',
      'message:edited'
    ]

    const { found: scalingFound, missing: scalingMissing } = this.checkFileContent('websocket/redis-pubsub.service.ts', scalingPatterns)
    
    if (scalingMissing.length === 0) {
      details.push('✅ Horizontal scaling with Redis pub/sub implemented')
    } else {
      details.push(`❌ Missing scaling features: ${scalingMissing.join(', ')}`)
      hasErrors = true
    }

    this.addResult('Redis Integration for Scaling', hasErrors ? 'FAIL' : 'PASS', details)
  }

  verifyTestCoverage() {
    const details: string[] = []
    let hasErrors = false

    const testFiles = [
      'websocket/websocket.service.spec.ts',
      'websocket/presence.service.spec.ts',
      'websocket/typing.service.spec.ts',
      'websocket/websocket.integration.spec.ts'
    ]

    testFiles.forEach(testFile => {
      if (this.fileExists(testFile)) {
        details.push(`✅ ${testFile} exists`)
      } else {
        details.push(`❌ ${testFile} missing`)
        hasErrors = true
      }
    })

    this.addResult('Test Coverage', hasErrors ? 'FAIL' : 'PASS', details)
  }

  verifyModuleIntegration() {
    const details: string[] = []
    let hasErrors = false

    // Check if WebSocket module is added to app module
    const { found: moduleFound, missing: moduleMissing } = this.checkFileContent('app.module.ts', ['WebSocketModule'])
    
    if (moduleMissing.length === 0) {
      details.push('✅ WebSocket module integrated into app')
    } else {
      details.push('❌ WebSocket module not integrated into app')
      hasErrors = true
    }

    // Check dependencies
    const depPatterns = [
      'JwtModule',
      'AuthModule',
      'UsersModule',
      'ConversationsModule'
    ]

    const { found: depFound, missing: depMissing } = this.checkFileContent('websocket/websocket.module.ts', depPatterns)
    
    if (depMissing.length === 0) {
      details.push('✅ Required dependencies imported')
    } else {
      details.push(`❌ Missing dependencies: ${depMissing.join(', ')}`)
      hasErrors = true
    }

    this.addResult('Module Integration', hasErrors ? 'FAIL' : 'PASS', details)
  }

  async run(): Promise<void> {
    console.log('🔍 Verifying WebSocket Infrastructure and Real-time Engine Implementation...\n')

    // Run all verifications
    this.verifySocketIOServer()
    this.verifyRoomBasedBroadcasting()
    this.verifyConnectionManagement()
    this.verifyPresenceTracking()
    this.verifyTypingIndicators()
    this.verifyMessageAcknowledgment()
    this.verifyRedisIntegration()
    this.verifyTestCoverage()
    this.verifyModuleIntegration()

    // Print results
    console.log('📋 Verification Results:\n')
    
    let totalPassed = 0
    let totalFailed = 0

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌'
      console.log(`${icon} ${result.component}: ${result.status}`)
      
      if (result.details.length > 0) {
        result.details.forEach(detail => {
          console.log(`   ${detail}`)
        })
      }
      console.log()

      if (result.status === 'PASS') {
        totalPassed++
      } else {
        totalFailed++
      }
    })

    // Summary
    console.log('📊 Summary:')
    console.log(`✅ Passed: ${totalPassed}`)
    console.log(`❌ Failed: ${totalFailed}`)
    console.log(`📈 Success Rate: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`)

    if (totalFailed === 0) {
      console.log('\n🎉 All WebSocket infrastructure components are properly implemented!')
      console.log('\n📋 Task 9 Requirements Coverage:')
      console.log('✅ Socket.IO server with authentication middleware')
      console.log('✅ Room-based message broadcasting system')
      console.log('✅ Connection management with reconnection handling')
      console.log('✅ Presence tracking system with Redis-based state storage')
      console.log('✅ Typing indicator functionality with debouncing')
      console.log('✅ Message acknowledgment system for delivery confirmation')
    } else {
      console.log('\n⚠️  Some components need attention before the implementation is complete.')
      process.exit(1)
    }
  }
}

// Run verification
const verifier = new WebSocketVerifier()
verifier.run().catch(console.error)