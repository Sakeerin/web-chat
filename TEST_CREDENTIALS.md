# Test Credentials

## Overview

This document contains test user credentials for development and testing purposes. These users are automatically created when you run the database seed command.

## Test Users

All test users use the same password: `password123`

### User 1: Alice Johnson
- **Username:** `alice`
- **Email:** `alice@example.com`
- **Password:** `password123`
- **Role:** Owner of "Development Team" group
- **Bio:** Software engineer who loves building chat applications

### User 2: Bob Smith
- **Username:** `bob`
- **Email:** `bob@example.com`
- **Password:** `password123`
- **Role:** Admin in "Development Team" group
- **Bio:** Product manager passionate about user experience

### User 3: Charlie Brown
- **Username:** `charlie`
- **Email:** `charlie@example.com`
- **Password:** `password123`
- **Role:** Member in "Development Team" group
- **Bio:** Designer focused on creating beautiful interfaces

### User 4: Diana Prince
- **Username:** `diana`
- **Email:** `diana@example.com`
- **Password:** `password123`
- **Role:** Member in "Development Team" group
- **Bio:** DevOps engineer ensuring everything runs smoothly

## Pre-seeded Data

The seed script also creates:

### Conversations
1. **DM Conversation** - Between Alice and Bob with 3 messages
2. **Group Chat** - "Development Team" with all 4 users and 4 messages

### Contact Relationships
- Alice and Charlie are connected (accepted)
- Charlie has a pending request to Diana

### Message Receipts
- Messages have delivery and read receipts
- ~70% of messages are marked as read

## How to Seed the Database

### First Time Setup

```bash
# 1. Start required services
docker-compose up -d postgres redis

# 2. Navigate to API directory
cd apps/api

# 3. Run database migrations
pnpm prisma migrate dev

# 4. Seed the database
pnpm prisma db seed
```

### Reset and Re-seed

If you want to start fresh:

```bash
cd apps/api

# Reset database (WARNING: Deletes all data!)
pnpm prisma migrate reset

# This will automatically run migrations and seed
```

## Login Examples

### Web Interface
1. Navigate to `http://localhost:5173`
2. Click "Login"
3. Enter credentials:
   - **Username or Email:** `alice` (or `alice@example.com`)
   - **Password:** `password123`

### API Testing (cURL)

```bash
# Login as Alice
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "password123"
  }'

# Login as Bob
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "password": "password123"
  }'
```

### API Testing (JavaScript/Fetch)

```javascript
// Login function
async function login(username, password) {
  const response = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });
  
  const data = await response.json();
  console.log('Access Token:', data.accessToken);
  return data;
}

// Usage
login('alice', 'password123');
```

## Testing Scenarios

### Scenario 1: Direct Messaging
1. Login as **Alice**
2. You'll see a DM conversation with **Bob**
3. Send messages back and forth
4. Open another browser/incognito window
5. Login as **Bob** to see real-time updates

### Scenario 2: Group Chat
1. Login as any user (Alice, Bob, Charlie, or Diana)
2. Navigate to "Development Team" group
3. Send messages
4. See message delivery and read receipts

### Scenario 3: Contact Requests
1. Login as **Charlie**
2. Check pending contact requests
3. See pending request to **Diana**
4. Login as **Diana** to accept/deny

### Scenario 4: User Search
1. Login as any user
2. Search for other users by username or name
3. Send contact requests
4. Start new conversations

## Security Notes

⚠️ **IMPORTANT:** These credentials are for development/testing only!

- Never use these credentials in production
- Never commit real user passwords to version control
- Change the default password in production environments
- Use strong, unique passwords for production users

## Troubleshooting

### "User not found" Error
- Make sure you've run the seed command: `pnpm prisma db seed`
- Check database connection in `.env` file

### "Invalid password" Error
- Verify you're using `password123`
- Check if the seed script completed successfully
- Try resetting the database: `pnpm prisma migrate reset`

### Database Connection Issues
- Ensure PostgreSQL is running: `docker-compose ps postgres`
- Check DATABASE_URL in `apps/api/.env`
- Restart PostgreSQL: `docker-compose restart postgres`

## Additional Test Users

If you need more test users, you can modify `apps/api/prisma/seed.ts` and add more users to the array:

```typescript
const users = await Promise.all([
  createUser({
    username: 'newuser',
    email: 'newuser@example.com',
    name: 'New User',
    bio: 'A new test user',
  }),
  // ... existing users
])
```

Then run: `pnpm prisma db seed`

## See Also

- [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) - Full development setup guide
- [FRONTEND_ONLY_MODE.md](./FRONTEND_ONLY_MODE.md) - Frontend-only development
- [apps/api/prisma/seed.ts](./apps/api/prisma/seed.ts) - Seed script source code
