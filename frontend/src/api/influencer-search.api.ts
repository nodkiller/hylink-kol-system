import apiClient from './client';

export interface InstagramUser {
  username: string;
  full_name: string;
  biography: string;
  follower_count: number;
  following_count: number;
  media_count: number;
  is_verified: boolean;
  is_business_account: boolean;
  profile_pic_url: string;
  pk: string;
  // Optional fields that may be present in API responses
  engagement_rate?: number;
  location?: string;
}

export const influencerSearchApi = {
  search: async (q: string): Promise<InstagramUser[]> => {
    const res = await apiClient.get<InstagramUser[]>('/influencer-search/search', {
      params: { q },
    });
    return res.data;
  },

  getUserInfo: async (username: string): Promise<InstagramUser | null> => {
    const res = await apiClient.get<InstagramUser | null>('/influencer-search/user', {
      params: { username },
    });
    return res.data;
  },
};
