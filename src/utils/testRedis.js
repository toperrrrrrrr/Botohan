require('dotenv').config();
const Redis = require('ioredis');

async function testRedisConnection() {
  // Debug logging
  console.log('Current working directory:', process.cwd());
  console.log('REDIS_URL:', process.env.REDIS_URL);
  
  if (!process.env.REDIS_URL) {
    console.error('REDIS_URL is not set in environment variables');
    process.exit(1);
  }

  // Initialize Redis client with direct URL and debug mode
  const redis = new Redis(process.env.REDIS_URL, {
    tls: {
      rejectUnauthorized: false
    },
    lazyConnect: true, // Don't connect immediately
    retryStrategy: null // Don't retry on failure
  });

  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
    process.exit(1);
  });

  redis.on('connect', () => {
    console.log('Successfully connected to Redis!');
  });

  try {
    // Explicitly connect
    console.log('Attempting to connect to Redis...');
    await redis.connect();
    
    // Test setting a value
    console.log('Setting test value...');
    await redis.set('test_key', 'test_value');
    console.log('Successfully set test value');

    // Test getting the value
    const value = await redis.get('test_key');
    console.log('Successfully retrieved test value:', value);

    // Test deleting the value
    await redis.del('test_key');
    console.log('Successfully deleted test value');

    // Close the connection
    await redis.quit();
    console.log('Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during Redis test:', error);
    process.exit(1);
  }
}

testRedisConnection(); 