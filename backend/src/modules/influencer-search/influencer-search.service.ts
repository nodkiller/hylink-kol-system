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
  private readonly apiHost = 'instagram-scraper-stable-api.p.rapidapi.com';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RAPIDAPI_KEY') ?? '';
  }

  async searchUsers(query: string): Promise<InstagramUser[]> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('RAPIDAPI_KEY is not configured');
    }

    const url = `https://${this.apiHost}/v1/search_users?search_query=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': this.apiHost,
        'x-rapidapi-key': this.apiKey,
      },
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`Instagram API error: ${res.status}`);
    }

    const data = await res.json() as any;

    // Normalise the response — different API versions use different shapes
    const users: any[] =
      data?.data?.users ??
      data?.users ??
      data?.items ??
      [];

    return users.map((u: any) => ({
      username: u.username ?? u.user?.username ?? '',
      full_name: u.full_name ?? u.user?.full_name ?? '',
      biography: u.biography ?? u.user?.biography ?? '',
      follower_count: u.follower_count ?? u.user?.follower_count ?? 0,
      following_count: u.following_count ?? u.user?.following_count ?? 0,
      media_count: u.media_count ?? u.user?.media_count ?? 0,
      is_verified: u.is_verified ?? u.user?.is_verified ?? false,
      is_business_account: u.is_business_account ?? u.user?.is_business_account ?? false,
      profile_pic_url: u.profile_pic_url ?? u.user?.profile_pic_url ?? '',
      pk: String(u.pk ?? u.user?.pk ?? u.id ?? ''),
    }));
  }

  async getUserInfo(username: string): Promise<InstagramUser | null> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('RAPIDAPI_KEY is not configured');
    }

    const url = `https://${this.apiHost}/v1/user_info_by_username?username=${encodeURIComponent(username)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': this.apiHost,
        'x-rapidapi-key': this.apiKey,
      },
    });

    if (!res.ok) return null;

    const data = await res.json() as any;
    const u = data?.data?.user ?? data?.user ?? data;

    return {
      username: u.username ?? '',
      full_name: u.full_name ?? '',
      biography: u.biography ?? '',
      follower_count: u.follower_count ?? 0,
      following_count: u.following_count ?? 0,
      media_count: u.media_count ?? 0,
      is_verified: u.is_verified ?? false,
      is_business_account: u.is_business_account ?? false,
      profile_pic_url: u.profile_pic_url ?? '',
      pk: String(u.pk ?? u.id ?? ''),
    };
  }
}
