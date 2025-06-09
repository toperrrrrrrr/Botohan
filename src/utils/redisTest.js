require('dotenv').config();
const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('Starting Redis connection test...');

  // Initialize Redis client with explicit configuration
  const redis = new Redis({
    host: 'redis-14393.c252.ap-southeast-1-1.ec2.redns.redis-cloud.com',
    port: 14393,
    username: 'default',
    password: '4pmFgCD20oWa1PhRBj0q1tQYY1PI11ES',
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    }
  });

  // Set up event listeners
  redis.on('connect', () => {
    console.log('Event: Connected to Redis');
  });

  redis.on('ready', () => {
    console.log('Event: Redis client is ready');
  });

  redis.on('error', (error) => {
    console.error('Event: Redis error:', error);
  });

  redis.on('close', () => {
    console.log('Event: Redis connection closed');
  });

  try {
    console.log('Attempting to connect...');
    
    // Test 1: Basic Set/Get
    console.log('\nTest 1: Basic Set/Get');
    await redis.set('test:basic', 'hello');
    const basicResult = await redis.get('test:basic');
    console.log('Basic test result:', basicResult);

    // Test 2: JSON Data
    console.log('\nTest 2: JSON Data');
    const testObject = {
      name: 'Test Poll',
      options: ['Option 1', 'Option 2'],
      votes: [[1, 'vote1'], [2, 'vote2']]
    };
    await redis.set('test:json', JSON.stringify(testObject));
    const jsonResult = JSON.parse(await redis.get('test:json'));
    console.log('JSON test result:', jsonResult);

    // Test 3: TTL
    console.log('\nTest 3: TTL');
    await redis.set('test:ttl', 'expires soon', 'EX', 5);
    const ttl = await redis.ttl('test:ttl');
    console.log('TTL test result:', ttl);

    // Test 4: Delete
    console.log('\nTest 4: Delete');
    await redis.del('test:basic', 'test:json', 'test:ttl');
    const deletedValue = await redis.get('test:basic');
    console.log('Delete test result:', deletedValue === null ? 'Success' : 'Failed');

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTest failed:', error);
  } finally {
    // Clean up
    try {
      await redis.quit();
      console.log('Redis connection closed properly');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

testRedisConnection(); 