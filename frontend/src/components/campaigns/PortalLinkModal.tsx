import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, type Campaign } from '@/api/campaigns.api';
import Modal from '@/components/ui/Modal';

interface Props {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
}

export default function PortalLinkModal({ campaign, open, onClose }: Props) {
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const portalUrl = campaign
    ? `${window.location.origin}/portal/campaign/${campaign.id}`
    : '';

  const hasPassword = !!campaign?.clientPortalPassword;

  const saveMutation = useMutation({
    mutationFn: (pw: string | null) => campaignsApi.updatePortal(campaign!.id, pw),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', campaign!.id] });
      setPassword('');
    },
  });

  const handleSetPassword = () => {
    if (!password.trim()) return;
    saveMutation.mutate(password.trim());
  };

  const handleRevoke = () => {
    saveMutation.mutate(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Client Portal Link"
      size="md"
      footer={
        <button onClick={onClose} className="btn-ghost">Close</button>
      }
    >
      <div className="space-y-5">
        {/* Portal URL */}
        <div>
          <p className="text-sm text-gray-500 mb-2">
            Share this link with the client. They will need the password to view the shortlisted KOLs.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={portalUrl}
              className="input flex-1 text-xs font-mono bg-gray-50"
            />
            <button
              onClick={handleCopy}
              className={`btn-secondary flex items-center gap-1.5 flex-shrink-0 transition-colors ${copied ? '!text-green-700 !border-green-300 !bg-green-50' : ''}`}
            >
              {copied ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Password section */}
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-800">Portal Password</h4>
            {hasPassword && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Password set
              </span>
            )}
          </div>

          {hasPassword ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                A password is currently protecting this portal. Update it by entering a new one, or revoke access entirely.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New password…"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input flex-1"
                />
                <button
                  onClick={handleSetPassword}
                  disabled={!password.trim() || saveMutation.isPending}
                  className="btn-primary flex-shrink-0"
                >
                  Update
                </button>
              </div>
              <button
                onClick={handleRevoke}
                disabled={saveMutation.isPending}
                className="btn-danger w-full text-sm"
              >
                Revoke access
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Set a password so only authorised clients can view the portal.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter a password…"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                  className="input flex-1"
                />
                <button
                  onClick={handleSetPassword}
                  disabled={!password.trim() || saveMutation.isPending}
                  className="btn-primary flex-shrink-0"
                >
                  {saveMutation.isPending ? 'Saving…' : 'Set password'}
                </button>
              </div>
            </div>
          )}

          {saveMutation.isSuccess && (
            <p className="text-xs text-green-600 font-medium">
              {hasPassword ? 'Portal password updated.' : 'Portal access revoked.'}
            </p>
          )}
          {saveMutation.isError && (
            <p className="text-xs text-red-500">Failed to update. Please try again.</p>
          )}
        </div>

        {/* Note about what clients see */}
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
          <p className="text-xs text-blue-700">
            <strong>What clients see:</strong> KOLs in <em>Shortlisted</em> and <em>Submitted to Client</em> stages, with name, platform, follower count, and an Approve/Reject control per KOL.
          </p>
        </div>
      </div>
    </Modal>
  );
}
