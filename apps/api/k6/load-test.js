import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const wsConnectionRate = new Rate('ws_connection_success')
const messageLatency = new Trend('message_latency')
const apiResponseTime = new Trend('api_response_time')

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 500 }, // Ramp up to 500 users
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '5m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    ws_connection_success: ['rate>0.95'], // 95% WebSocket connections successful
    message_latency: ['p(50)<150'], // 50% of messages under 150ms
    api_response_time: ['p(95)<200'], // 95% of API calls under 200ms
  },
}

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001'

let authToken = ''
let userId = ''

export function setup() {
  // Create test user and get auth token
  const registerPayload = {
    email: `loadtest-${Date.now()}@example.com`,
    password: 'LoadTest123!',
    username: `loadtest${Date.now()}`,
    name: 'Load Test User'
  }
  
  const registerResponse = http.post(`${BASE_URL}/auth/register`, JSON.stringify(registerPayload), {
    headers: { 'Content-Type': 'application/json' }
  })
  
  if (registerResponse.status === 201) {
    const loginPayload = {
      email: registerPayload.email,
      password: registerPayload.password
    }
    
    const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginPayload), {
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
  
  throw new Error('Failed to setup test user')
}

export default function(data) {
  const { authToken, userId } = data
  
  // Test API endpoints
  testApiEndpoints(authToken)
  
  // Test WebSocket connections
  testWebSocketConnection(authToken, userId)
  
  sleep(1)
}

function testApiEndpoints(authToken) {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
  
  // Test user profile endpoint
  const profileStart = Date.now()
  const profileResponse = http.get(`${BASE_URL}/users/profile`, { headers })
  const profileDuration = Date.now() - profileStart
  
  check(profileResponse, {
    'profile request successful': (r) => r.status === 200,
  })
  apiResponseTime.add(profileDuration)
  
  // Test conversations endpoint
  const conversationsStart = Date.now()
  const conversationsResponse = http.get(`${BASE_URL}/conversations`, { headers })
  const conversationsDuration = Date.now() - conversationsStart
  
  check(conversationsResponse, {
    'conversations request successful': (r) => r.status === 200,
  })
  apiResponseTime.add(conversationsDuration)
  
  // Test messages endpoint (if conversations exist)
  if (conversationsResponse.status === 200) {
    const conversations = JSON.parse(conversationsResponse.body)
    if (conversations.length > 0) {
      const conversationId = conversations[0].id
      const messagesStart = Date.now()
      const messagesResponse = http.get(`${BASE_URL}/conversations/${conversationId}/messages`, { headers })
      const messagesDuration = Date.now() - messagesStart
      
      check(messagesResponse, {
        'messages request successful': (r) => r.status === 200,
      })
      apiResponseTime.add(messagesDuration)
    }
  }
}

function testWebSocketConnection(authToken, userId) {
  const wsUrl = `${WS_URL}/socket.io/?EIO=4&transport=websocket&token=${authToken}`
  
  const response = ws.connect(wsUrl, {}, function (socket) {
    let connectionSuccessful = false
    let messagesSent = 0
    let messagesReceived = 0
    
    socket.on('open', function () {
      console.log('WebSocket connection opened')
      connectionSuccessful = true
      wsConnectionRate.add(1)
      
      // Send authentication
      socket.send(JSON.stringify({
        type: 'auth',
        token: authToken
      }))
    })
    
    socket.on('message', function (message) {
      try {
        const data = JSON.parse(message)
        
        if (data.type === 'auth_success') {
          // Join a test room
          socket.send(JSON.stringify({
            type: 'join_room',
            conversationId: 'test-conversation-id'
          }))
          
          // Send test messages
          for (let i = 0; i < 5; i++) {
            const messageStart = Date.now()
            socket.send(JSON.stringify({
              type: 'send_message',
              conversationId: 'test-conversation-id',
              content: `Load test message ${i} from user ${userId}`,
              tempId: `temp-${Date.now()}-${i}`
            }))
            messagesSent++
            
            // Track message latency when we receive acknowledgment
            socket.on('message_ack', function(ackData) {
              const latency = Date.now() - messageStart
              messageLatency.add(latency)
            })
          }
        }
        
        if (data.type === 'message_new') {
          messagesReceived++
        }
        
      } catch (error) {
        console.log('Error parsing WebSocket message:', error)
      }
    })
    
    socket.on('error', function (error) {
      console.log('WebSocket error:', error)
      wsConnectionRate.add(0)
    })
    
    socket.on('close', function () {
      console.log('WebSocket connection closed')
      console.log(`Messages sent: ${messagesSent}, received: ${messagesReceived}`)
    })
    
    // Keep connection alive for 30 seconds
    sleep(30)
  })
  
  check(response, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  })
}

export function teardown(data) {
  // Cleanup test data if needed
  console.log('Load test completed')
}