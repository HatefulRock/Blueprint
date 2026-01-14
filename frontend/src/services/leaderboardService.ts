/*
import { LeaderboardUser } from '../types';
import { db } from './db';

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const getLeaderboard = async (): Promise<LeaderboardUser[]> => {
  await simulateDelay(400);
  console.log("Mock getLeaderboard called, returning:", db.leaderboard);
  return Promise.resolve(db.leaderboard);
};
*/
