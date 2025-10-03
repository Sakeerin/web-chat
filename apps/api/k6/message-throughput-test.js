import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Metrics for message throughput testing
const messagesSentRate = new Rate('messages_sent_per_second')
const messagesDeliveredRate = new Rate('messages_delivered_per_second')
const throughputLatency = new Trend('throughput_message_latency')
const systemThroughput = new Counter('system_wide_messages')

export const options = {
  scenarios: {
    message_throughput_500: {
      executor: 'constant-arrival-rate',
      rate: 500, // Target: ≥500 messages/sec system-wide
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
    message_throughput_1000: {
      executor: 'constant-arrival-rate',
      rate: 1000, // Stress test: 1000 messages/sec
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 300,
      startTime: '12m',
    },
  },
  thresholds: {
    messages_sent_per_second: ['rate>=500'], // Must handle ≥500 messages/sec
    messages_delivered_per_second: ['rate>=495'], // 99% delivery rate
    throughput_message_latency: ['p(50)<150', 'p(95)<350'],
    system_wide_messages: ['count>300000'], // Total messages in test
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001'

export function setup() {
  // Create multiple test users for throughput testing
  const users = []
  
  for (let i = 0; i < 10; i++) {
    const registerPayload = {
      email: `throughput-${i}-${Date.now()}@example.com`,
      password: 'ThroughputTest123!',
      username: `throughput${i}${Date.now()}`,
      name: `Throughput Test User ${i}`
    }
    
    const registerResponse = http.post(`${BASE_URL}/auth/register`, JSON.stringify(registerPayload), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (registerResponse.status === 201) {
      const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: registerPayload.email,
        password: registerPayload.password
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (loginResponse.status === 200) {
        const loginData = JSON.parse(loginResponse.body)
        users.push({
          authToken: loginData.accessToken,
          userId: loginData.user.id,
          username: registerPayload.username
        })
      }
    }
  }
  
  return { users }
}

export default function(data) {
  const { users } = data
  const user = users[Math.floor(Math.random() * users.length)]
  const { authToken, userId, username } = user
  
  // Use WebSocket for high-throughput messaging
  const wsUrl = `${WS_URL}/socket.io/?EIO=4&transport=websocket&token=${authToken}`
  
  const response = ws.connect(wsUrl, {}, function (socket) {
    let authenticated = false
    const messageTracker = new Map()
    
    socket.on('open', function () {
      socket.send(JSON.stringify({
        type: 'auth',
        token: authToken
      }))
    })
    
    socket.on('message', function (message) {
      try {
        const data = JSON.parse(message)
        
        if (data.type === 'auth_success' && !authenticated) {
          authenticated = true
          
          // Join high-throughput test room
          socket.send(JSON.stringify({
            type: 'join_room',
            conversationId: 'throughput-test-room'
          }))
          
          // Send burst of messages for throughput testing
          sendThroughputMessages(socket, userId, username)
        }
        
        if (data.type === 'message_ack' && messageTracker.has(data.tempId)) {
          const startTime = messageTracker.get(data.tempId)
          const latency = Date.now() - startTime
          throughputLatency.add(latency)
          messagesDeliveredRate.add(1)
          systemThroughput.add(1)
          messageTracker.delete(data.tempId)
        }
        
        if (data.type === 'message_new') {
          // Count received messages for system throughput
          systemThroughput.add(1)
        }
        
      } catch (error) {
        console.log('Message parsing error:', error)
      }
    })
    
    socket.on('error', function (error) {
      console.log('WebSocket error:', error)
    })
    
    // Keep connection alive for message processing
    sleep(10)
  })
  
  function sendThroughputMessages(socket, userId, username) {
    // Send multiple messages rapidly
    for (let i = 0; i < 5; i++) {
      const tempId = `throughput-${userId}-${Date.now()}-${i}`
      const messageStart = Date.now()
      
      messageTracker.set(tempId, messageStart)
      
      socket.send(JSON.stringify({
        type: 'send_message',
        conversationId: 'throughput-test-room',
        content: `High throughput message ${i} from ${username} at ${new Date().toISOString()}`,
        tempId: tempId
      }))
      
      messagesSentRate.add(1)
      
      // Small delay between messages to avoid overwhelming
      sleep(0.1)
    }
  }
}

export function teardown(data) {
  console.log('Message throughput test completed')
  console.log('Check system_wide_messages counter for total throughput achieved')
  
  // Generate throughput report
  const endTime = new Date().toISOString()
  console.log(`Throughput test ended at: ${endTime}`)
  console.log('Metrics collected for message throughput analysis')
}