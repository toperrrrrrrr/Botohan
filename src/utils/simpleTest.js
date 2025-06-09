const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis-14393.c252.ap-southeast-1-1.ec2.redns.redis-cloud.com',
  port: 14393,
  username: 'default',
  password: '4pmFgCD20oWa1PhRBj0q1tQYY1PI11ES',
  tls: {
    rejectUnauthorized: false
  }
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Connected to Redis!');
});

// Simple test
async function test() {
  try {
    await redis.set('test', 'Hello Redis');
    const value = await redis.get('test');
    console.log('Test value:', value);
    await redis.quit();
  } catch (error) {
    console.error('Test error:', error);
  }
}

test(); 