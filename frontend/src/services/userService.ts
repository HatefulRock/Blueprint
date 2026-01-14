
import { Goals, UserProfile, StudyPlan } from '../types';
import { apiRequest } from './api';
import { db } from './db';

export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    return await apiRequest<UserProfile>('/profile');
  } catch (error) {
    // console.debug("Backend unreachable, using mock profile.");
    return db.userProfile;
  }
};

export const getGoals = async (): Promise<Goals | null> => {
  try {
    return await apiRequest<Goals>('/goals');
  } catch (error) {
    // console.debug("Backend unreachable, using mock goals.");
    return db.goals;
  }
};

export const saveGoals = async (goals: Goals): Promise<Goals> => {
  try {
    return await apiRequest<Goals>('/goals', {
      method: 'POST',
      body: JSON.stringify(goals)
    });
  } catch (error) {
    console.warn("Backend unreachable, saving goals locally.");
    db.goals = goals;
    return goals;
  }
};

export const completeSession = async (type: 'practice' | 'flashcard'): Promise<UserProfile> => {
  try {
    return await apiRequest<UserProfile>('/session/complete', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
  } catch (error) {
    // console.debug("Backend unreachable, updating profile locally.");
    const profile = db.userProfile;
    if (type === 'practice') {
        profile.goalProgress.practiceSessionsThisWeek += 1;
    }
    return profile;
  }
};

export const getStudyPlan = async (): Promise<StudyPlan> => {
  try {
    return await apiRequest<StudyPlan>('/study-plan');
  } catch (error) {
    // console.debug("Backend unreachable, using mock study plan.");
    return db.studyPlan;
  }
};
