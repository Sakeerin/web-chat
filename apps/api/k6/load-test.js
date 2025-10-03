import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter, Gauge } from 'k6/metrics'
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'

// Custom metrics for comprehensive monitoring
const wsConnectionRate = new Rate('ws_connection_success')
const messageLatency = new Trend('message_latency')
const apiResponseTime = new Trend('api_response_time')
const messageDeliveryRate = new Rate('message_delivery_success')
const concurrentUsers = new Gauge('concurrent_users')
const messagesPerSecond = new Rate('messages_per_second')
const errorRate = new Rate('error_rate')
const memoryUsage = new Gauge('memory_usage_mb')
const cpuUsage = new Gauge('cpu_usage_percent')

// Test scenarios for different load patterns
export const options = {
  scenarios: {
    // Baseline load test
    baseline_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    
    // Stress test - high concurrent users
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 2000 },
        { duration: '3m', target: 2000 },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '10m',
    },
    
    // Spike test - sudden load increase
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '30s', target: 2000 }, // Sudden spike
        { duration: '2m', target: 2000 },
        { duration: '30s', target: 100 }, // Drop back
        { duration: '2m', target: 100 },
      ],
      startTime: '25m',
    },
    
    // Message throughput test
    message_throughput: {
      executor: 'constant-arrival-rate',
      rate: 500, // 500 messages per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      startTime: '40m',
    },
  },
  
  thresholds: {
    // Performance requirements from specs
    http_req_duration: ['p(95)<200'], // P95 API response time < 200ms
    'http_req_duration{group:::api_calls}': ['p(95)<200'],
    ws_connection_success: ['rate>0.95'], // 95% WebSocket connections successful
    message_latency: ['p(50)<150'], // P50 message latency < 150ms (same region)
    'message_latency{region:same}': ['p(50)<150'],
    message_delivery_success: ['rate>0.99'], // 99% message delivery success
    error_rate: ['rate<0.01'], // Less than 1% error rate
    messages_per_second: ['rate>=500'], // Handle ≥500 messages/sec
    
    // System resource thresholds
    memory_usage_mb: ['value<2048'], // Memory usage under 2GB
    cpu_usage_percent: ['value<80'], // CPU usage under 80%
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
  
  // Update concurrent users metric
  concurrentUsers.add(1)
  
  // Run different test groups based on scenario
  const scenario = __ENV.K6_SCENARIO || 'baseline_load'
  
  group('API Performance Tests', () => {
    testApiEndpoints(authToken)
  })
  
  group('WebSocket Performance Tests', () => {
    testWebSocketConnection(authToken, userId)
  })
  
  group('Message Throughput Tests', () => {
    if (scenario === 'message_throughput') {
      testMessageThroughput(authToken, userId)
    }
  })
  
  group('System Resource Monitoring', () => {
    monitorSystemResources()
  })
  
  sleep(randomIntBetween(1, 3)) // Random sleep to simulate real user behavior
}

function testApiEndpoints(authToken) {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
  
  // Test user profile endpoint
  group('User Profile API', () => {
    const profileStart = Date.now()
    const profileResponse = http.get(`${BASE_URL}/users/profile`, { headers })
    const profileDuration = Date.now() - profileStart
    
    const success = check(profileResponse, {
      'profile request successful': (r) => r.status === 200,
      'profile response time acceptable': (r) => profileDuration < 200,
    })
    
    apiResponseTime.add(profileDuration, { endpoint: 'profile' })
    errorRate.add(!success)
  })
  
  // Test conversations endpoint
  group('Conversations API', () => {
    const conversationsStart = Date.now()
    const conversationsResponse = http.get(`${BASE_URL}/conversations`, { headers })
    const conversationsDuration = Date.now() - conversationsStart
    
    const success = check(conversationsResponse, {
      'conversations request successful': (r) => r.status === 200,
      'conversations response time acceptable': (r) => conversationsDuration < 200,
    })
    
    apiResponseTime.add(conversationsDuration, { endpoint: 'conversations' })
    errorRate.add(!success)
    
    // Test messages endpoint (if conversations exist)
    if (conversationsResponse.status === 200) {
      const conversations = JSON.parse(conversationsResponse.body)
      if (conversations.length > 0) {
        const conversationId = conversations[0].id
        
        group('Messages API', () => {
          const messagesStart = Date.now()
          const messagesResponse = http.get(`${BASE_URL}/conversations/${conversationId}/messages`, { headers })
          const messagesDuration = Date.now() - messagesStart
          
          const messagesSuccess = check(messagesResponse, {
            'messages request successful': (r) => r.status === 200,
            'messages response time acceptable': (r) => messagesDuration < 200,
            'messages initial load time acceptable': (r) => messagesDuration < 1200, // P95 < 1.2s on 4G
          })
          
          apiResponseTime.add(messagesDuration, { endpoint: 'messages' })
          errorRate.add(!messagesSuccess)
        })
      }
    }
  })
  
  // Test search endpoint
  group('Search API', () => {
    const searchQuery = randomString(5)
    const searchStart = Date.now()
    const searchResponse = http.get(`${BASE_URL}/search/messages?q=${searchQuery}`, { headers })
    const searchDuration = Date.now() - searchStart
    
    const searchSuccess = check(searchResponse, {
      'search request successful': (r) => r.status === 200,
      'search response time acceptable': (r) => searchDuration < 300, // P95 < 300ms
    })
    
    apiResponseTime.add(searchDuration, { endpoint: 'search' })
    errorRate.add(!searchSuccess)
  })
  
  // Test file upload presigned URL
  group('Upload API', () => {
    const uploadStart = Date.now()
    const uploadResponse = http.post(`${BASE_URL}/upload/presigned-url`, JSON.stringify({
      fileName: 'test-file.jpg',
      fileSize: 1024000,
      mimeType: 'image/jpeg'
    }), { headers })
    const uploadDuration = Date.now() - uploadStart
    
    const uploadSuccess = check(uploadResponse, {
      'upload presigned URL successful': (r) => r.status === 200,
      'upload response time acceptable': (r) => uploadDuration < 200,
    })
    
    apiResponseTime.add(uploadDuration, { endpoint: 'upload' })
    errorRate.add(!uploadSuccess)
  })
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

function testMessageThroughput(authToken, userId) {
  // High-frequency message sending test
  const wsUrl = `${WS_URL}/socket.io/?EIO=4&transport=websocket&token=${authToken}`
  
  const response = ws.connect(wsUrl, {}, function (socket) {
    let messagesAcked = 0
    const messagesToSend = 10
    const messageStartTimes = new Map()
    
    socket.on('open', function () {
      socket.send(JSON.stringify({
        type: 'auth',
        token: authToken
      }))
    })
    
    socket.on('message', function (message) {
      try {
        const data = JSON.parse(message)
        
        if (data.type === 'auth_success') {
          // Rapid fire messages for throughput testing
          for (let i = 0; i < messagesToSend; i++) {
            const tempId = `throughput-${Date.now()}-${i}`
            const messageStart = Date.now()
            messageStartTimes.set(tempId, messageStart)
            
            socket.send(JSON.stringify({
              type: 'send_message',
              conversationId: 'throughput-test-conversation',
              content: `Throughput test message ${i}`,
              tempId: tempId
            }))
            
            messagesPerSecond.add(1)
          }
        }
        
        if (data.type === 'message_ack' && messageStartTimes.has(data.tempId)) {
          const latency = Date.now() - messageStartTimes.get(data.tempId)
          messageLatency.add(latency, { test: 'throughput' })
          messageDeliveryRate.add(1)
          messagesAcked++
          messageStartTimes.delete(data.tempId)
        }
        
      } catch (error) {
        errorRate.add(1)
      }
    })
    
    sleep(5) // Wait for messages to be processed
    
    // Check delivery rate
    const deliveryRate = messagesAcked / messagesToSend
    messageDeliveryRate.add(deliveryRate >= 0.99 ? 1 : 0)
  })
}

function monitorSystemResources() {
  // Monitor system resources via API endpoint
  const metricsResponse = http.get(`${BASE_URL}/health/metrics`)
  
  if (metricsResponse.status === 200) {
    try {
      const metrics = JSON.parse(metricsResponse.body)
      
      if (metrics.memory) {
        memoryUsage.add(metrics.memory.used / 1024 / 1024) // Convert to MB
      }
      
      if (metrics.cpu) {
        cpuUsage.add(metrics.cpu.usage)
      }
      
    } catch (error) {
      console.log('Error parsing metrics:', error)
    }
  }
}

export function teardown(data) {
  // Generate performance report
  console.log('=== Load Test Performance Report ===')
  console.log(`Test completed at: ${new Date().toISOString()}`)
  console.log('Performance metrics have been collected and sent to monitoring systems')
  
  // Cleanup test data if needed
  if (data && data.authToken) {
    // Optional: Clean up test conversations and messages
    const headers = {
      'Authorization': `Bearer ${data.authToken}`,
      'Content-Type': 'application/json'
    }
    
    // This would be implemented if cleanup endpoint exists
    // http.delete(`${BASE_URL}/test/cleanup`, { headers })
  }
}