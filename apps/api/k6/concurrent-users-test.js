import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Metrics for concurrent user simulation
const connectionSuccess = new Rate('concurrent_connection_success')
const simultaneousMessages = new Counter('simultaneous_messages_sent')
const messageLatency = new Trend('concurrent_message_latency')

export const options = {
  scenarios: {
    concurrent_users_10k: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 5000 },
        { duration: '10m', target: 10000 }, // Target: ≥10,000 concurrent users
        { duration: '15m', target: 10000 }, // Sustain load
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '2m',
    },
  },
  thresholds: {
    concurrent_connection_success: ['rate>0.95'],
    concurrent_message_latency: ['p(50)<150', 'p(95)<350'],
    simultaneous_messages_sent: ['count>50000'], // Ensure high message volume
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001'

export function setup() {
  // Create a test user for concurrent testing
  const registerPayload = {
    email: `concurrent-test-${Date.now()}@example.com`,
    password: 'ConcurrentTest123!',
    username: `concurrent${Date.now()}`,
    name: 'Concurrent Test User'
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
      return {
        authToken: loginData.accessToken,
        userId: loginData.user.id
      }
    }
  }
  
  throw new Error('Failed to setup concurrent test user')
}

export default function(data) {
  const { authToken, userId } = data
  const wsUrl = `${WS_URL}/socket.io/?EIO=4&transport=websocket&token=${authToken}`
  
  const response = ws.connect(wsUrl, {}, function (socket) {
    let connected = false
    let messagesSent = 0
    
    socket.on('open', function () {
      connected = true
      connectionSuccess.add(1)
      
      // Authenticate
      socket.send(JSON.stringify({
        type: 'auth',
        token: authToken
      }))
    })
    
    socket.on('message', function (message) {
      try {
        const data = JSON.parse(message)
        
        if (data.type === 'auth_success') {
          // Join multiple rooms to simulate real usage
          const roomsToJoin = ['general', 'random', 'test-room']
          roomsToJoin.forEach(room => {
            socket.send(JSON.stringify({
              type: 'join_room',
              conversationId: room
            }))
          })
          
          // Send messages periodically
          const messageInterval = setInterval(() => {
            if (messagesSent < 10) { // Limit messages per connection
              const messageStart = Date.now()
              const tempId = `concurrent-${userId}-${Date.now()}-${messagesSent}`
              
              socket.send(JSON.stringify({
                type: 'send_message',
                conversationId: 'general',
                content: `Concurrent test message ${messagesSent} from ${userId}`,
                tempId: tempId
              }))
              
              messagesSent++
              simultaneousMessages.add(1)
              
              // Track latency on acknowledgment
              socket.on('message_ack', function(ackData) {
                if (ackData.tempId === tempId) {
                  const latency = Date.now() - messageStart
                  messageLatency.add(latency)
                }
              })
            } else {
              clearInterval(messageInterval)
            }
          }, 2000) // Send message every 2 seconds
        }
        
      } catch (error) {
        console.log('WebSocket message error:', error)
      }
    })
    
    socket.on('error', function (error) {
      connectionSuccess.add(0)
      console.log('WebSocket connection error:', error)
    })
    
    socket.on('close', function () {
      console.log(`Connection closed. Messages sent: ${messagesSent}`)
    })
    
    // Keep connection alive for the duration of the test
    sleep(60) // 1 minute per connection
  })
  
  if (!response || response.status !== 101) {
    connectionSuccess.add(0)
  }
}

export function teardown(data) {
  console.log('Concurrent users test completed')
  console.log('Check metrics for concurrent connection success rate and message latency')
}