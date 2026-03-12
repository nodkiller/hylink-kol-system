export enum UserRole {
  ADMIN = 'Admin',
  ACCOUNT_MANAGER = 'AccountManager',
  KOL_MANAGER = 'KOLManager',
}

export enum KolTier {
  NANO = 'Nano(<10k)',
  MICRO = 'Micro(10k-100k)',
  MID = 'Mid(100k-500k)',
  MACRO = 'Macro(500k-1M)',
  MEGA = 'Mega(>1M)',
}

export enum PlatformName {
  INSTAGRAM = 'Instagram',
  TIKTOK = 'TikTok',
  YOUTUBE = 'YouTube',
  XIAOHONGSHU = 'Xiaohongshu',
  WEIBO = 'Weibo',
}

export enum CampaignStatus {
  DRAFT = 'Draft',
  PLANNING = 'Planning',
  EXECUTING = 'Executing',
  COMPLETED = 'Completed',
}

export enum ClientFeedback {
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum CampaignKolStatus {
  SHORTLISTED = 'Shortlisted',
  SUBMITTED_TO_CLIENT = 'Submitted_to_Client',
  APPROVED_BY_CLIENT = 'Approved_by_Client',
  REJECTED_BY_CLIENT = 'Rejected_by_Client',
  CONTACTED = 'Contacted',
  NEGOTIATING = 'Negotiating',
  CONTRACTED = 'Contracted',
  CONTENT_SUBMITTED = 'Content_Submitted',
  CONTENT_APPROVED = 'Content_Approved',
  PUBLISHED = 'Published',
  COMPLETED = 'Completed',
}

export enum PostContentType {
  STATIC_IMAGE = 'StaticImage',
  CAROUSEL = 'Carousel',
  REEL = 'Reel',
  STORY = 'Story',
  YOUTUBE_SHORT = 'YouTube_Short',
  YOUTUBE_VIDEO = 'YouTube_Video',
  TIKTOK_VIDEO = 'TikTok_Video',
  OTHER = 'Other',
}

export enum PostSentiment {
  POSITIVE = 'Positive',
  NEUTRAL = 'Neutral',
  NEGATIVE = 'Negative',
}

export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  TEST_DRIVE_BOOKED = 'TestDriveBooked',
  TEST_DRIVE_COMPLETED = 'TestDriveCompleted',
  CONVERTED = 'Converted',
  LOST = 'Lost',
}
