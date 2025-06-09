const { kv } = require('@vercel/kv');

class KVStorage {
  static async setPoll(pollId, pollData) {
    try {
      // Store the poll data
      await kv.set(`poll:${pollId}`, {
        ...pollData,
        votes: Array.from(pollData.votes.entries()) // Convert Map to array for storage
      });
      
      // Set expiration if poll has duration
      if (pollData.endTime) {
        const ttl = Math.floor((new Date(pollData.endTime) - new Date()) / 1000);
        if (ttl > 0) {
          await kv.expire(`poll:${pollId}`, ttl);
        }
      }
      return true;
    } catch (error) {
      console.error('Error storing poll:', error);
      return false;
    }
  }

  static async getPoll(pollId) {
    try {
      const pollData = await kv.get(`poll:${pollId}`);
      if (!pollData) return null;

      // Convert votes array back to Map
      return {
        ...pollData,
        votes: new Map(pollData.votes)
      };
    } catch (error) {
      console.error('Error retrieving poll:', error);
      return null;
    }
  }

  static async deletePoll(pollId) {
    try {
      await kv.del(`poll:${pollId}`);
      return true;
    } catch (error) {
      console.error('Error deleting poll:', error);
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
      console.error('Error updating poll votes:', error);
      return false;
    }
  }
}

module.exports = KVStorage; 