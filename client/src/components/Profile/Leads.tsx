import { useState, useCallback } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, Users } from 'lucide-react';
import { EModelEndpoint } from 'librechat-data-provider';
import { Spinner, useToastContext } from '@librechat/client';
import { useProfileLeads, useDeleteProfileLead } from '~/data-provider';
import { useAgentsMapContext } from '~/Providers';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import useNewConvo from '~/hooks/useNewConvo';
import LeadModal from './LeadModal';
import type { Lead, LeadStatus, LeadPlatform } from 'librechat-data-provider';

const STATUS_BADGES: Record<LeadStatus, string> = {
  cold: 'bg-cream-dark text-text-muted',
  warm: 'bg-brand-yellow/30 text-text-headline',
  hot: 'bg-brand-rose-dark text-white',
  closed: 'bg-mauve text-white',
};

const STATUS_KEYS = ['cold', 'warm', 'hot', 'closed'] as const;
const PLATFORM_KEYS = ['linkedin', 'instagram', 'other'] as const;
const LIMIT = 50;

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function isDueToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

interface MenuState {
  leadId: string;
  x: number;
  y: number;
}

export default function ProfileLeads() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const agentsMap = useAgentsMapContext();
  const { newConversation } = useNewConvo();

  const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>(undefined);
  const [platformFilter, setPlatformFilter] = useState<LeadPlatform | undefined>(undefined);
  const [dueOnly, setDueOnly] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null);

  const { data, isLoading } = useProfileLeads(
    { status: statusFilter, limit: LIMIT, cursor },
    true,
  );

  const deleteMutation = useDeleteProfileLead({
    onSuccess: () => {
      showToast({ message: localize('com_tfw_profile_leads_deleted') });
      setConfirmDelete(null);
    },
    onError: (err) => {
      showToast({ message: err.message, severity: NotificationSeverity.ERROR });
    },
  });

  const rawLeads = data?.leads ?? [];
  const nextCursor = data?.nextCursor;

  const leads = rawLeads.filter((l) => {
    if (platformFilter && l.platform !== platformFilter) return false;
    if (dueOnly && !isDueToday(l.next_action_date)) return false;
    return true;
  });

  const handleOpenCreate = useCallback(() => {
    setEditLead(null);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((lead: Lead) => {
    setEditLead(lead);
    setModalOpen(true);
    setMenu(null);
  }, []);

  const handleModalSuccess = useCallback(() => {
    const msg = editLead
      ? localize('com_tfw_profile_leads_updated')
      : localize('com_tfw_profile_leads_created');
    showToast({ message: msg });
  }, [editLead, localize, showToast]);

  const handleDeleteConfirm = useCallback(() => {
    if (!confirmDelete) return;
    deleteMutation.mutate(confirmDelete.id);
  }, [confirmDelete, deleteMutation]);

  const handleStartSales = useCallback(() => {
    const salesAgent = Object.values(agentsMap ?? {}).find(
      (a) => a?.name?.toLowerCase().includes('sales'),
    );
    newConversation({
      preset: {
        endpoint: EModelEndpoint.agents,
        agent_id: salesAgent?.id ?? '',
      },
    });
  }, [agentsMap, newConversation]);

  const handleMenuOpen = useCallback(
    (e: React.MouseEvent, lead: Lead) => {
      e.stopPropagation();
      setMenu({ leadId: lead.id, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8" onClick={closeMenu}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-h3 font-semibold text-text-headline">
          {localize('com_tfw_profile_leads_title')}
        </h1>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-md bg-brand-rose px-4 py-2 font-ui text-sm font-semibold text-white transition-colors hover:bg-brand-rose-dark"
        >
          <Plus className="h-4 w-4" />
          {localize('com_tfw_profile_leads_new')}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status pills */}
        <button
          type="button"
          onClick={() => setStatusFilter(undefined)}
          className={`rounded-full px-3 py-1 font-ui text-sm transition-colors ${statusFilter == null ? 'bg-brand-rose text-white' : 'bg-cream-dark text-text-body hover:bg-cream'}`}
        >
          {localize('com_tfw_profile_leads_filter_all')}
        </button>
        {STATUS_KEYS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 font-ui text-sm transition-colors ${statusFilter === s ? 'bg-brand-rose text-white' : 'bg-cream-dark text-text-body hover:bg-cream'}`}
          >
            {localize(`com_tfw_profile_lead_status_${s}`)}
          </button>
        ))}

        {/* Platform */}
        <select
          value={platformFilter ?? ''}
          onChange={(e) =>
            setPlatformFilter((e.target.value as LeadPlatform) || undefined)
          }
          className="ml-2 rounded-md border border-cream-dark bg-white px-2 py-1 font-ui text-sm text-text-body focus:outline-none"
          aria-label={localize('com_tfw_profile_lead_form_platform')}
        >
          <option value="">{localize('com_tfw_profile_leads_filter_all')}</option>
          {PLATFORM_KEYS.map((p) => (
            <option key={p} value={p}>
              {localize(`com_tfw_profile_lead_platform_${p}`)}
            </option>
          ))}
        </select>

        {/* Due today */}
        <button
          type="button"
          onClick={() => setDueOnly((v) => !v)}
          className={`rounded-full px-3 py-1 font-ui text-sm transition-colors ${dueOnly ? 'bg-brand-rose text-white' : 'bg-cream-dark text-text-body hover:bg-cream'}`}
        >
          {localize('com_tfw_profile_leads_filter_due')}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && leads.length === 0 && (
        <div className="rounded-md border border-cream-dark bg-cream-light p-10 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-text-muted" />
          <h2 className="mb-2 font-serif text-h4 font-semibold text-text-headline">
            {localize('com_tfw_profile_leads_empty_title')}
          </h2>
          <p className="mb-6 text-body-sm text-text-body">
            {localize('com_tfw_profile_leads_empty_description')}
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleStartSales}
              className="rounded-md border border-brand-rose px-4 py-2 font-ui text-sm font-semibold text-brand-rose-dark transition-colors hover:bg-brand-rose-cream"
            >
              {localize('com_tfw_profile_leads_empty_cta_sales')}
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="rounded-md bg-brand-rose px-4 py-2 font-ui text-sm font-semibold text-white transition-colors hover:bg-brand-rose-dark"
            >
              {localize('com_tfw_profile_leads_empty_cta_new')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && leads.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-cream-dark bg-white shadow-sm">
          <table className="w-full text-left text-body-sm text-text-body">
            <thead className="border-b border-cream-dark bg-cream-light font-ui text-sm font-semibold text-text-headline">
              <tr>
                <th className="px-4 py-3">{localize('com_tfw_profile_leads_col_name')}</th>
                <th className="px-4 py-3">{localize('com_tfw_profile_leads_col_platform')}</th>
                <th className="px-4 py-3">{localize('com_tfw_profile_leads_col_status')}</th>
                <th className="px-4 py-3">{localize('com_tfw_profile_leads_col_next_action')}</th>
                <th className="px-4 py-3">{localize('com_tfw_profile_leads_col_date')}</th>
                <th className="px-4 py-3 sr-only">{localize('com_tfw_profile_leads_col_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="group cursor-pointer transition-colors hover:bg-cream-light"
                  onClick={() => handleOpenEdit(lead)}
                >
                  <td className="px-4 py-3 font-semibold text-text-headline">
                    {lead.lead_name}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {localize(`com_tfw_profile_lead_platform_${lead.platform}`)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-caption font-semibold ${STATUS_BADGES[lead.status]}`}
                    >
                      {localize(`com_tfw_profile_lead_status_${lead.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{lead.next_action ?? '—'}</td>
                  <td className="px-4 py-3">{formatDate(lead.next_action_date)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-label="Actions"
                      onClick={(e) => handleMenuOpen(e, lead)}
                      className="rounded p-1 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-cream hover:text-text-body"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Load more */}
          {nextCursor && (
            <div className="flex justify-center border-t border-cream-dark px-4 py-3">
              <button
                type="button"
                onClick={() => setCursor(nextCursor)}
                className="font-ui text-sm text-brand-rose-dark hover:underline"
              >
                {localize('com_tfw_profile_leads_load_more')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {menu && (
        <div
          role="menu"
          aria-label="Lead actions"
          style={{ top: menu.y, left: menu.x }}
          className="fixed z-50 min-w-[140px] rounded-md border border-cream-dark bg-white py-1 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              const lead = leads.find((l) => l.id === menu.leadId);
              if (lead) handleOpenEdit(lead);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-body hover:bg-cream-light"
          >
            <Edit2 className="h-4 w-4" />
            {localize('com_tfw_profile_lead_action_edit')}
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              const lead = leads.find((l) => l.id === menu.leadId);
              if (lead) setConfirmDelete(lead);
              setMenu(null);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-cream-light"
          >
            <Trash2 className="h-4 w-4" />
            {localize('com_tfw_profile_lead_action_delete')}
          </button>
        </div>
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={localize('com_tfw_profile_leads_delete_confirm', {
            name: confirmDelete.lead_name,
          })}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-md bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-5 text-body text-text-body">
              {localize('com_tfw_profile_leads_delete_confirm', {
                name: confirmDelete.lead_name,
              })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-md border border-cream-dark px-4 py-2 font-ui text-sm text-text-body hover:bg-cream-light"
              >
                {localize('com_tfw_profile_lead_form_cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isLoading}
                className="rounded-md bg-red-500 px-4 py-2 font-ui text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {deleteMutation.isLoading ? <Spinner /> : localize('com_tfw_profile_lead_action_delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editLead}
        onSuccess={handleModalSuccess}
      />
    </main>
  );
}
