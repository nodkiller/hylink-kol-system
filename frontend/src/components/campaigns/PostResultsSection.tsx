import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { campaignsApi } from '@/api/campaigns.api';
import { PostContentType, PostSentiment, type CampaignKolPost } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n?: number | null) {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const SENTIMENT_COLORS: Record<PostSentiment, string> = {
  [PostSentiment.POSITIVE]: 'text-green-400',
  [PostSentiment.NEUTRAL]:  'text-gray-400',
  [PostSentiment.NEGATIVE]: 'text-red-400',
};

const CONTENT_TYPE_LABELS: Record<PostContentType, string> = {
  [PostContentType.STATIC_IMAGE]:  'Static Image',
  [PostContentType.CAROUSEL]:      'Carousel',
  [PostContentType.REEL]:          'Reel',
  [PostContentType.STORY]:         'Story',
  [PostContentType.YOUTUBE_SHORT]: 'YT Short',
  [PostContentType.YOUTUBE_VIDEO]: 'YT Video',
  [PostContentType.TIKTOK_VIDEO]:  'TikTok Video',
  [PostContentType.OTHER]:         'Other',
};

// ─── Form state type ──────────────────────────────────────────────────────────

interface PostFormValues {
  postUrl: string;
  contentType: PostContentType;
  publishedAt: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
  reach: string;
  impressions: string;
  ctr: string;
  attributedSales: string;
  sentiment: PostSentiment | '';
  revisionRounds: string;
  notes: string;
}

const EMPTY_FORM: PostFormValues = {
  postUrl: '', contentType: PostContentType.REEL, publishedAt: '',
  views: '', likes: '', comments: '', shares: '', saves: '',
  reach: '', impressions: '', ctr: '', attributedSales: '',
  sentiment: '', revisionRounds: '0', notes: '',
};

function postToForm(p: CampaignKolPost): PostFormValues {
  return {
    postUrl: p.postUrl,
    contentType: p.contentType,
    publishedAt: p.publishedAt ? p.publishedAt.split('T')[0] : '',
    views: p.views != null ? String(p.views) : '',
    likes: p.likes != null ? String(p.likes) : '',
    comments: p.comments != null ? String(p.comments) : '',
    shares: p.shares != null ? String(p.shares) : '',
    saves: p.saves != null ? String(p.saves) : '',
    reach: p.reach != null ? String(p.reach) : '',
    impressions: p.impressions != null ? String(p.impressions) : '',
    ctr: p.ctr != null ? String(Number(p.ctr) * 100) : '',
    attributedSales: p.attributedSales != null ? String(p.attributedSales) : '',
    sentiment: (p.sentiment as PostSentiment) ?? '',
    revisionRounds: String(p.revisionRounds ?? 0),
    notes: p.notes ?? '',
  };
}

function formToPayload(f: PostFormValues) {
  return {
    postUrl: f.postUrl,
    contentType: f.contentType,
    publishedAt: f.publishedAt || undefined,
    views: f.views ? Number(f.views) : undefined,
    likes: f.likes ? Number(f.likes) : undefined,
    comments: f.comments ? Number(f.comments) : undefined,
    shares: f.shares ? Number(f.shares) : undefined,
    saves: f.saves ? Number(f.saves) : undefined,
    reach: f.reach ? Number(f.reach) : undefined,
    impressions: f.impressions ? Number(f.impressions) : undefined,
    // UI shows CTR as %, stored as 0–1 decimal
    ctr: f.ctr ? Number(f.ctr) / 100 : undefined,
    attributedSales: f.attributedSales ? Number(f.attributedSales) : undefined,
    sentiment: f.sentiment || undefined,
    revisionRounds: f.revisionRounds !== '' ? Number(f.revisionRounds) : undefined,
    notes: f.notes || undefined,
  };
}

// ─── Post Form ────────────────────────────────────────────────────────────────

function PostForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: PostFormValues;
  onSave: (payload: ReturnType<typeof formToPayload>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [f, setF] = useState<PostFormValues>(initial);
  const set = (k: keyof PostFormValues, v: string) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const numInput = (label: string, key: keyof PostFormValues, placeholder = '0') => (
    <div>
      <label className="label">{label}</label>
      <input
        type="number" min={0} placeholder={placeholder}
        value={f[key] as string}
        onChange={(e) => set(key, e.target.value)}
        className="input mt-1 text-sm"
      />
    </div>
  );

  return (
    <div className="rounded-xl border border-primary-700/30 bg-gray-800/60 p-4 space-y-4">
      {/* URL */}
      <div>
        <label className="label">Post URL *</label>
        <input
          type="url" placeholder="https://www.instagram.com/p/…"
          value={f.postUrl}
          onChange={(e) => set('postUrl', e.target.value)}
          className="input mt-1 text-sm"
        />
      </div>

      {/* Content Type + Published Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Content Type</label>
          <select value={f.contentType} onChange={(e) => set('contentType', e.target.value as PostContentType)} className="input mt-1 text-sm">
            {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Published Date</label>
          <input
            type="date" value={f.publishedAt}
            onChange={(e) => set('publishedAt', e.target.value)}
            className="input mt-1 text-sm"
          />
        </div>
      </div>

      {/* Engagement metrics */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Engagement</p>
        <div className="grid grid-cols-3 gap-2">
          {numInput('Views', 'views')}
          {numInput('Likes', 'likes')}
          {numInput('Comments', 'comments')}
          {numInput('Shares', 'shares')}
          {numInput('Saves', 'saves')}
        </div>
      </div>

      {/* Reach / Impressions / CTR */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reach & Distribution</p>
        <div className="grid grid-cols-3 gap-2">
          {numInput('Reach', 'reach')}
          {numInput('Impressions', 'impressions')}
          <div>
            <label className="label">CTR (%)</label>
            <input
              type="number" min={0} max={100} step="0.01" placeholder="0.00"
              value={f.ctr}
              onChange={(e) => set('ctr', e.target.value)}
              className="input mt-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Business outcomes */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Business Outcomes</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Sales (AUD)</label>
            <input
              type="number" min={0} step="0.01" placeholder="0.00"
              value={f.attributedSales}
              onChange={(e) => set('attributedSales', e.target.value)}
              className="input mt-1 text-sm"
            />
          </div>
          <div>
            <label className="label">Revision Rounds</label>
            <input
              type="number" min={0} placeholder="0"
              value={f.revisionRounds}
              onChange={(e) => set('revisionRounds', e.target.value)}
              className="input mt-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Sentiment */}
      <div>
        <label className="label">Comment Sentiment</label>
        <select value={f.sentiment} onChange={(e) => set('sentiment', e.target.value)} className="input mt-1 text-sm">
          <option value="">Not assessed</option>
          {Object.values(PostSentiment).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <textarea
          rows={2} value={f.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Any observations about this post…"
          className="input mt-1 text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
        <button
          type="button"
          disabled={!f.postUrl || isSaving}
          onClick={() => onSave(formToPayload(f))}
          className="btn-primary text-sm"
        >
          {isSaving ? 'Saving…' : 'Save Post'}
        </button>
      </div>
    </div>
  );
}

// ─── Post Card (compact read view) ───────────────────────────────────────────

function PostCard({
  post,
  onEdit,
  onDelete,
}: {
  post: CampaignKolPost;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const totalEngagement =
    (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0) + (post.saves ?? 0);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-3 space-y-2">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-300 bg-gray-700 rounded-full px-2 py-0.5">
              {CONTENT_TYPE_LABELS[post.contentType] ?? post.contentType}
            </span>
            {post.publishedAt && (
              <span className="text-xs text-gray-500">
                {new Date(post.publishedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            {post.revisionRounds > 0 && (
              <span className="text-xs text-amber-400">{post.revisionRounds} rev</span>
            )}
          </div>
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block text-xs text-primary-400 hover:text-primary-300 truncate"
          >
            {post.postUrl}
          </a>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onEdit}
            className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex flex-wrap gap-3 text-xs">
        {post.views != null && (
          <span className="text-gray-400"><span className="font-semibold text-gray-200">{fmt(post.views)}</span> views</span>
        )}
        {totalEngagement > 0 && (
          <span className="text-gray-400"><span className="font-semibold text-gray-200">{fmt(totalEngagement)}</span> eng</span>
        )}
        {post.reach != null && (
          <span className="text-gray-400"><span className="font-semibold text-gray-200">{fmt(post.reach)}</span> reach</span>
        )}
        {post.impressions != null && (
          <span className="text-gray-400"><span className="font-semibold text-gray-200">{fmt(post.impressions)}</span> imp</span>
        )}
        {post.ctr != null && (
          <span className="text-gray-400"><span className="font-semibold text-gray-200">{(Number(post.ctr) * 100).toFixed(2)}%</span> CTR</span>
        )}
        {post.attributedSales != null && (
          <span className="text-green-400 font-semibold">${Number(post.attributedSales).toLocaleString()} sales</span>
        )}
        {post.sentiment && (
          <span className={clsx('font-medium', SENTIMENT_COLORS[post.sentiment as PostSentiment])}>
            {post.sentiment}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

interface Props {
  campaignId: string;
  campaignKolId: string;
}

export default function PostResultsSection({ campaignId, campaignKolId }: Props) {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPost, setEditingPost] = useState<CampaignKolPost | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['kol-posts', campaignKolId],
    queryFn: () => campaignsApi.getPosts(campaignId, campaignKolId),
    enabled: Boolean(campaignKolId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['kol-posts', campaignKolId] });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof campaignsApi.createPost>[2]) =>
      campaignsApi.createPost(campaignId, campaignKolId, payload),
    onSuccess: () => { invalidate(); setShowAddForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ postId, payload }: { postId: string; payload: Parameters<typeof campaignsApi.updatePost>[3] }) =>
      campaignsApi.updatePost(campaignId, campaignKolId, postId, payload),
    onSuccess: () => { invalidate(); setEditingPost(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => campaignsApi.deletePost(campaignId, campaignKolId, postId),
    onSuccess: invalidate,
  });

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Post Results</h3>
          {posts.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-1.5 py-0.5">{posts.length}</span>
          )}
        </div>
        {!showAddForm && !editingPost && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Post
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <PostForm
          initial={EMPTY_FORM}
          onSave={(payload) => createMutation.mutate(payload)}
          onCancel={() => setShowAddForm(false)}
          isSaving={createMutation.isPending}
        />
      )}

      {/* Post list */}
      {isLoading ? (
        <p className="text-xs text-gray-500 py-2">Loading…</p>
      ) : posts.length === 0 && !showAddForm ? (
        <div className="rounded-lg border-2 border-dashed border-gray-700 p-4 text-center">
          <p className="text-xs text-gray-500">No posts logged yet.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Log first post →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) =>
            editingPost?.id === post.id ? (
              <PostForm
                key={post.id}
                initial={postToForm(post)}
                onSave={(payload) => updateMutation.mutate({ postId: post.id, payload })}
                onCancel={() => setEditingPost(null)}
                isSaving={updateMutation.isPending}
              />
            ) : (
              <PostCard
                key={post.id}
                post={post}
                onEdit={() => { setShowAddForm(false); setEditingPost(post); }}
                onDelete={() => {
                  if (confirm('Delete this post record?')) deleteMutation.mutate(post.id);
                }}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
