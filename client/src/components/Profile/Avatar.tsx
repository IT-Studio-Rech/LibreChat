import { useState, useCallback, useEffect } from 'react';
import { UserCircle } from 'lucide-react';
import { EModelEndpoint } from 'librechat-data-provider';
import { Button, Spinner, useToastContext } from '@librechat/client';
import { useProfileICP, useUpdateProfileICP } from '~/data-provider';
import { useAgentsMapContext } from '~/Providers';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import useNewConvo from '~/hooks/useNewConvo';
import type { ICPRecord } from 'librechat-data-provider';

function formatICP(icp: ICPRecord | undefined): string {
  if (!icp?.icp_json) return '';
  const { icp_json } = icp;
  if (typeof icp_json === 'string') return icp_json;
  const keys = Object.keys(icp_json);
  if (keys.length === 0) return '';
  return keys.map((k) => `## ${k}\n${icp_json[k]}`).join('\n\n');
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ProfileAvatar() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { data: icp, isLoading } = useProfileICP();
  const agentsMap = useAgentsMapContext();
  const { newConversation } = useNewConvo();

  const [text, setText] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!isLoading && !seeded) {
      setText(formatICP(icp));
      setSeeded(true);
    }
  }, [isLoading, icp, seeded]);

  const updateMutation = useUpdateProfileICP({
    onSuccess: () => {
      showToast({ message: localize('com_tfw_profile_avatar_saved') });
    },
    onError: (err) => {
      showToast({ message: err.message, severity: NotificationSeverity.ERROR });
    },
  });

  const handleSave = useCallback(() => {
    updateMutation.mutate({ icp_json: text });
  }, [updateMutation, text]);

  const handleStartNische = useCallback(() => {
    const nischeAgent = Object.values(agentsMap ?? {}).find(
      (a) => a?.name?.toLowerCase().includes('nische'),
    );
    newConversation({
      preset: {
        endpoint: EModelEndpoint.agents,
        agent_id: nischeAgent?.id ?? '',
      },
    });
  }, [agentsMap, newConversation]);

  const hasICP = !!icp?.icp_json;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-serif text-h3 font-semibold text-text-headline">
          {localize('com_tfw_profile_avatar_title')}
        </h1>
        <p className="mt-2 text-body text-text-body">
          {localize('com_tfw_profile_avatar_description')}
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      )}

      {!isLoading && !hasICP && (
        <div className="rounded-md border border-cream-dark bg-cream-light p-8 text-center">
          <UserCircle className="mx-auto mb-4 h-12 w-12 text-text-muted" />
          <h2 className="mb-2 font-serif text-h4 font-semibold text-text-headline">
            {localize('com_tfw_profile_avatar_empty_title')}
          </h2>
          <p className="mb-6 text-body-sm text-text-body">
            {localize('com_tfw_profile_avatar_empty_description')}
          </p>
          <Button
            type="button"
            variant="submit"
            onClick={handleStartNische}
            className="bg-brand-rose text-white hover:bg-brand-rose-dark"
          >
            {localize('com_tfw_profile_avatar_empty_cta')}
          </Button>
        </div>
      )}

      {!isLoading && hasICP && icp != null && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          aria-label={localize('com_tfw_profile_avatar_title')}
        >
          <label htmlFor="icp-textarea" className="sr-only">
            {localize('com_tfw_profile_avatar_title')}
          </label>
          <textarea
            id="icp-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={24}
            className="w-full resize-y rounded-md border border-cream-dark bg-white px-4 py-3 font-sans text-body text-text-body shadow-sm focus:border-brand-rose focus:outline-none focus:ring-2 focus:ring-brand-rose/20"
          />

          <div className="mt-4 flex items-center justify-between gap-4">
            <button
              type="submit"
              disabled={updateMutation.isLoading}
              className="rounded-md bg-brand-rose px-6 py-2 font-ui text-sm font-semibold text-white transition-colors hover:bg-brand-rose-dark disabled:opacity-60"
            >
              {updateMutation.isLoading ? (
                <Spinner />
              ) : (
                localize('com_tfw_profile_avatar_save')
              )}
            </button>
            {icp.updated_at && (
              <span className="text-caption text-text-muted">
                {localize('com_tfw_profile_avatar_last_updated', {
                  date: formatDate(icp.updated_at),
                })}
              </span>
            )}
          </div>
        </form>
      )}
    </main>
  );
}
