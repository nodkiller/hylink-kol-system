import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
}

@Injectable()
export class InfluencerSearchService {
  private readonly apiKey: string;
  private readonly apiHost = 'instagram120.p.rapidapi.com';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RAPIDAPI_KEY') ?? '';
  }

  async searchUsers(query: string): Promise<InstagramUser[]> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('RAPIDAPI_KEY is not configured');
    }

    const res = await fetch(`https://${this.apiHost}/api/instagram/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': this.apiHost,
        'x-rapidapi-key': this.apiKey,
      },
      body: JSON.stringify({ username: query, maxId: '' }),
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`Instagram API error: ${res.status}`);
    }

    const data = await res.json() as any;

    // Extract the user object from the posts response
    const u =
      data?.data?.user ??
      data?.user ??
      data?.data?.items?.[0]?.user ??
      data?.items?.[0]?.user ??
      null;

    if (!u) return [];

    return [{
      username: u.username ?? query,
      full_name: u.full_name ?? '',
      biography: u.biography ?? '',
      follower_count: u.follower_count ?? u.edge_followed_by?.count ?? 0,
      following_count: u.following_count ?? u.edge_follow?.count ?? 0,
      media_count: u.media_count ?? u.edge_owner_to_timeline_media?.count ?? 0,
      is_verified: u.is_verified ?? false,
      is_business_account: u.is_business_account ?? u.is_professional_account ?? false,
      profile_pic_url: u.profile_pic_url ?? u.profile_pic_url_hd ?? '',
      pk: String(u.pk ?? u.id ?? ''),
    }];
  }

  async getUserInfo(username: string): Promise<InstagramUser | null> {
    const results = await this.searchUsers(username);
    return results[0] ?? null;
  }
}
