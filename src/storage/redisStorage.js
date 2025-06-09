const Redis = require('ioredis');
require('dotenv').config();

// Debug logging
console.log('Loading Redis storage module');
console.log('REDIS_URL:', process.env.REDIS_URL);

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not set in environment variables');
}

// Initialize Redis client with explicit configuration
const redis = new Redis({
  host: 'redis-14393.c252.ap-southeast-1-1.ec2.redns.redis-cloud.com',
  port: 14393,
  username: 'default',
  password: '4pmFgCD20oWa1PhRBj0q1tQYY1PI11ES',
  retryStrategy: (times) => {
    console.log(`Retry attempt ${times}`);
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 1000);
  }
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis!');
});

redis.on('ready', () => {
  console.log('Redis client is ready to accept commands');
});

// Test connection on startup
(async () => {
  try {
    await redis.ping();
    console.log('Redis connection test successful');
  } catch (error) {
    console.error('Redis connection test failed:', error);
  }
})();

class RedisStorage {
  static async setPoll(pollId, pollData) {
    try {
      // Convert Map to array for storage
      const storageData = {
        ...pollData,
        votes: Array.from(pollData.votes.entries())
      };

      // Store the poll data
      await redis.set(`poll:${pollId}`, JSON.stringify(storageData));
      
      // Set expiration if poll has duration
      if (pollData.endTime) {
        const ttl = Math.floor((new Date(pollData.endTime) - new Date()) / 1000);
        if (ttl > 0) {
          await redis.expire(`poll:${pollId}`, ttl);
        }
      }
      return true;
    } catch (error) {
      console.error('Error storing poll in Redis:', error);
      return false;
    }
  }

  static async getPoll(pollId) {
    try {
      const data = await redis.get(`poll:${pollId}`);
      if (!data) return null;

      const pollData = JSON.parse(data);
      
      // Convert votes array back to Map
      return {
        ...pollData,
        votes: new Map(pollData.votes)
      };
    } catch (error) {
      console.error('Error retrieving poll from Redis:', error);
      return null;
    }
  }

  static async deletePoll(pollId) {
    try {
      await redis.del(`poll:${pollId}`);
      return true;
    } catch (error) {
      console.error('Error deleting poll from Redis:', error);
      return false;
    }
  }

  static async updatePollVotes(pollId, votes) {
    try {
      const poll = await this.getPoll(pollId);
      if (!poll) return false;

      poll.votes = votes;
      return await this.setPoll(pollId, poll);
    } catch (error) {
      console.error('Error updating poll votes in Redis:', error);
      return false;
    }
  }
}

module.exports = RedisStorage; 