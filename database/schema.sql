-- =============================================================================
-- Hylink Australia — KOL Management System
-- Database Schema v1.0
-- PostgreSQL 15+
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM (
    'Admin',
    'AccountManager',
    'KOLManager'
);

CREATE TYPE kol_tier AS ENUM (
    'Nano(<10k)',
    'Micro(10k-100k)',
    'Mid(100k-500k)',
    'Macro(500k-1M)',
    'Mega(>1M)'
);

CREATE TYPE platform_name AS ENUM (
    'Instagram',
    'TikTok',
    'YouTube',
    'Xiaohongshu',
    'Weibo'
);

CREATE TYPE campaign_status AS ENUM (
    'Draft',
    'Planning',
    'Executing',
    'Completed'
);

CREATE TYPE campaign_kol_status AS ENUM (
    'Shortlisted',
    'Submitted_to_Client',
    'Approved_by_Client',
    'Rejected_by_Client',
    'Contacted',
    'Negotiating',
    'Contracted',
    'Content_Submitted',
    'Content_Approved',
    'Published',
    'Completed'
);

-- =============================================================================
-- 1. USERS — 系统用户表
-- =============================================================================

CREATE TABLE users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            user_role       NOT NULL DEFAULT 'KOLManager',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users               IS '系统内部用户账号表';
COMMENT ON COLUMN users.id            IS '用户唯一标识 (UUID)';
COMMENT ON COLUMN users.full_name     IS '用户全名';
COMMENT ON COLUMN users.email         IS '登录邮箱，全局唯一';
COMMENT ON COLUMN users.password_hash IS 'bcrypt 哈希后的密码';
COMMENT ON COLUMN users.role          IS '角色权限: Admin / AccountManager / KOLManager';
COMMENT ON COLUMN users.is_active     IS '账号是否启用，软删除标记';

-- =============================================================================
-- 2. KOLS — KOL 信息主表
-- =============================================================================

CREATE TABLE kols (
    id                       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                     VARCHAR(100)    NOT NULL,
    nickname                 VARCHAR(100),
    avatar_url               TEXT,
    country                  VARCHAR(100)    NOT NULL DEFAULT 'Australia',
    city                     VARCHAR(100),
    ethnicity_background     VARCHAR(100),                   -- 族裔/文化背景，如 Chinese-Australian
    primary_language         VARCHAR(50),                    -- 主要创作语言
    content_tags             TEXT[]          DEFAULT '{}',   -- 内容标签，如 {Automotive, Lifestyle, Tech}
    kol_tier                 kol_tier,                       -- 依粉丝量分层
    contact_email            VARCHAR(255),
    talent_agency_name       VARCHAR(200),                   -- 经纪公司名称（如有）
    talent_agency_contact    VARCHAR(200),                   -- 经纪公司联系人/方式
    rate_card                JSONB           DEFAULT '{}',   -- 报价卡，结构见下方注释
    audience_demographics    JSONB           DEFAULT '{}',   -- 受众画像，结构见下方注释
    agency_internal_notes    TEXT,                           -- 内部备注（客户不可见）
    collaboration_rating     DECIMAL(2,1)    CHECK (collaboration_rating >= 0 AND collaboration_rating <= 5),
    is_blacklisted           BOOLEAN         NOT NULL DEFAULT FALSE,
    created_by               UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  kols                        IS 'KOL/KOC 核心信息主表';
COMMENT ON COLUMN kols.content_tags           IS '内容垂类标签数组，如 {Automotive, Lifestyle}';
COMMENT ON COLUMN kols.rate_card              IS '报价结构，例: {"instagram_post": 1500, "tiktok_video": 2000, "youtube_integration": 5000, "currency": "AUD"}';
COMMENT ON COLUMN kols.audience_demographics  IS '受众画像，例: {"age_range": "18-34", "top_cities": ["Sydney","Melbourne"], "gender_split": {"female": 62, "male": 38}}';
COMMENT ON COLUMN kols.collaboration_rating   IS '内部合作评分 0.0~5.0，综合配合度/内容质量等';
COMMENT ON COLUMN kols.is_blacklisted         IS '是否列入黑名单，黑名单 KOL 不可被加入新 Campaign';

-- 常用查询索引
CREATE INDEX idx_kols_tier            ON kols(kol_tier);
CREATE INDEX idx_kols_country_city    ON kols(country, city);
CREATE INDEX idx_kols_is_blacklisted  ON kols(is_blacklisted);
CREATE INDEX idx_kols_content_tags    ON kols USING GIN(content_tags);
CREATE INDEX idx_kols_created_by      ON kols(created_by);

-- =============================================================================
-- 3. KOL_PLATFORMS — KOL 平台账号表
-- =============================================================================

CREATE TABLE kol_platforms (
    id                   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    kol_id               UUID            NOT NULL REFERENCES kols(id) ON DELETE CASCADE,
    platform_name        platform_name   NOT NULL,
    handle               VARCHAR(200)    NOT NULL,           -- @用户名 / 账号ID
    profile_url          TEXT,
    followers_count      INTEGER         CHECK (followers_count >= 0),
    avg_engagement_rate  DECIMAL(5,4)    CHECK (avg_engagement_rate >= 0 AND avg_engagement_rate <= 1),
                                                             -- 0.0000~1.0000，如 0.0356 = 3.56%
    last_synced_at       TIMESTAMPTZ,                        -- 数据最后同步时间（为后续 API 对接预留）
    UNIQUE (kol_id, platform_name)                           -- 每个 KOL 每平台只有一条记录
);

COMMENT ON TABLE  kol_platforms                    IS 'KOL 各社交媒体平台账号数据';
COMMENT ON COLUMN kol_platforms.handle             IS '平台账号名，如 Instagram @handle 或 TikTok UID';
COMMENT ON COLUMN kol_platforms.avg_engagement_rate IS '平均互动率，存储为小数: 0.0356 = 3.56%';
COMMENT ON COLUMN kol_platforms.last_synced_at     IS '为后续对接第三方数据 API（如 HypeAuditor）预留';

CREATE INDEX idx_kol_platforms_kol_id  ON kol_platforms(kol_id);
CREATE INDEX idx_kol_platforms_platform ON kol_platforms(platform_name);

-- =============================================================================
-- 4. CAMPAIGNS — 营销活动表
-- =============================================================================

CREATE TABLE campaigns (
    id                      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(200)      NOT NULL,
    client_name             VARCHAR(200)      NOT NULL,
    status                  campaign_status   NOT NULL DEFAULT 'Draft',
    start_date              DATE,
    end_date                DATE,
    brief_document_url      TEXT,                           -- 项目 brief 文件链接（S3 / Google Drive）
    client_portal_password  VARCHAR(100),                   -- 客户只读提报页访问密码（明文存储，非敏感）
    created_by              UUID              NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT campaigns_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE  campaigns                         IS '营销活动/项目主表，一个 Campaign 对应一次 KOL 合作项目';
COMMENT ON COLUMN campaigns.client_portal_password  IS '客户提报审核页密码，供 Account Manager 分享给客户';
COMMENT ON COLUMN campaigns.brief_document_url      IS 'Campaign 创意简报文件 URL';

CREATE INDEX idx_campaigns_status      ON campaigns(status);
CREATE INDEX idx_campaigns_client      ON campaigns(client_name);
CREATE INDEX idx_campaigns_created_by  ON campaigns(created_by);
CREATE INDEX idx_campaigns_dates       ON campaigns(start_date, end_date);

-- =============================================================================
-- 5. CAMPAIGN_KOLS — Campaign 与 KOL 关联表（核心流程表）
-- =============================================================================

CREATE TABLE campaign_kols (
    id               UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID                  NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    kol_id           UUID                  NOT NULL REFERENCES kols(id) ON DELETE RESTRICT,
    status           campaign_kol_status   NOT NULL DEFAULT 'Shortlisted',
    negotiated_fee   DECIMAL(10,2)         CHECK (negotiated_fee >= 0),  -- 最终谈定费用 (AUD)
    deliverables     JSONB                 DEFAULT '{}',                 -- 交付物约定，结构见注释
    published_urls   TEXT[]                DEFAULT '{}',                 -- 已发布内容链接数组
    performance_data JSONB                 DEFAULT '{}',                 -- 发布后绩效数据，结构见注释
    assigned_to      UUID                  REFERENCES users(id) ON DELETE SET NULL, -- 负责跟进的 KOL Manager
    notes            TEXT,                                               -- 该条关联的跟进备注
    status_updated_at TIMESTAMPTZ          NOT NULL DEFAULT NOW(),       -- 状态最后变更时间
    created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

    UNIQUE (campaign_id, kol_id)                                         -- 同一 Campaign 内 KOL 不重复
);

COMMENT ON TABLE  campaign_kols                   IS 'Campaign 与 KOL 的多对多关联表，记录完整合作流程状态';
COMMENT ON COLUMN campaign_kols.negotiated_fee    IS '谈判后最终确认费用，单位 AUD';
COMMENT ON COLUMN campaign_kols.deliverables      IS '交付物约定，例: {"instagram_posts": 2, "stories": 3, "tiktok_videos": 1, "deadline": "2025-03-15"}';
COMMENT ON COLUMN campaign_kols.published_urls    IS '内容发布后的链接，支持多条';
COMMENT ON COLUMN campaign_kols.performance_data  IS '绩效数据，例: {"total_reach": 85000, "total_impressions": 120000, "total_engagements": 4200, "cpe": 0.48, "screenshot_urls": [...]}';
COMMENT ON COLUMN campaign_kols.assigned_to       IS '负责此 KOL 跟进的内部人员';
COMMENT ON COLUMN campaign_kols.status_updated_at IS '用于流程耗时分析，每次状态变更时更新';

CREATE INDEX idx_campaign_kols_campaign  ON campaign_kols(campaign_id);
CREATE INDEX idx_campaign_kols_kol       ON campaign_kols(kol_id);
CREATE INDEX idx_campaign_kols_status    ON campaign_kols(status);
CREATE INDEX idx_campaign_kols_assigned  ON campaign_kols(assigned_to);

-- =============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_kols
    BEFORE UPDATE ON kols
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_campaigns
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_campaign_kols
    BEFORE UPDATE ON campaign_kols
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- campaign_kols 状态变更时同步更新 status_updated_at
CREATE OR REPLACE FUNCTION trigger_set_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_status_updated_at_campaign_kols
    BEFORE UPDATE ON campaign_kols
    FOR EACH ROW EXECUTE FUNCTION trigger_set_status_updated_at();

-- =============================================================================
-- SEED: 默认 Admin 账号（密码在应用层 bcrypt 处理后插入，此处为占位）
-- =============================================================================

-- INSERT INTO users (full_name, email, password_hash, role)
-- VALUES ('System Admin', 'admin@hylink.com.au', '<bcrypt_hash_here>', 'Admin');
