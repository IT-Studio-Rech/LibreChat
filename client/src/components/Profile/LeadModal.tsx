import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle, Spinner } from '@librechat/client';
import { useCreateProfileLead, useUpdateProfileLead } from '~/data-provider';
import { useLocalize } from '~/hooks';
import type { Lead, LeadCreatePayload, LeadPlatform, LeadStatus } from 'librechat-data-provider';

interface LeadModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: Lead | null;
  onSuccess?: () => void;
}

interface FormState {
  lead_name: string;
  platform: LeadPlatform;
  status: LeadStatus;
  notes: string;
  next_action: string;
  next_action_date: string;
}

const defaultForm: FormState = {
  lead_name: '',
  platform: 'linkedin',
  status: 'cold',
  notes: '',
  next_action: '',
  next_action_date: '',
};

function formFromLead(lead: Lead): FormState {
  return {
    lead_name: lead.lead_name,
    platform: lead.platform,
    status: lead.status,
    notes: lead.notes ?? '',
    next_action: lead.next_action ?? '',
    next_action_date: lead.next_action_date ?? '',
  };
}

export default function LeadModal({ open, onClose, initialData, onSuccess }: LeadModalProps) {
  const localize = useLocalize();
  const isEdit = initialData != null;

  const [form, setForm] = useState<FormState>(isEdit ? formFromLead(initialData) : defaultForm);
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(isEdit && initialData ? formFromLead(initialData) : defaultForm);
      setNameError(false);
    }
  }, [open, initialData, isEdit]);

  const createMutation = useCreateProfileLead({
    onSuccess: () => { onSuccess?.(); onClose(); },
  });
  const updateMutation = useUpdateProfileLead({
    onSuccess: () => { onSuccess?.(); onClose(); },
  });

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (key === 'lead_name') setNameError(false);
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const name = form.lead_name.trim();
      if (!name || name.length > 200) {
        setNameError(true);
        return;
      }

      const payload: LeadCreatePayload = {
        lead_name: name,
        platform: form.platform,
        status: form.status,
      };
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.next_action.trim()) payload.next_action = form.next_action.trim();
      if (form.next_action_date) payload.next_action_date = form.next_action_date;

      if (isEdit && initialData) {
        updateMutation.mutate({ leadId: initialData.id, partial: payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [form, isEdit, initialData, createMutation, updateMutation],
  );

  return (
    <OGDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <OGDialogContent className="w-full max-w-lg rounded-md bg-white p-0 shadow-md">
        <OGDialogHeader className="flex items-center justify-between border-b border-cream-dark px-6 py-4">
          <OGDialogTitle className="font-serif text-h4 font-semibold text-text-headline">
            {isEdit
              ? localize('com_tfw_profile_lead_form_edit_title')
              : localize('com_tfw_profile_lead_form_create_title')}
          </OGDialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={localize('com_tfw_profile_lead_form_cancel')}
            className="rounded p-1 text-text-muted transition-colors hover:bg-cream-light hover:text-text-body"
          >
            <X className="h-5 w-5" />
          </button>
        </OGDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5" noValidate>
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-name" className="font-ui text-sm font-semibold text-text-headline">
              {localize('com_tfw_profile_lead_form_name')}
              <span className="ml-1 text-brand-rose-dark">*</span>
            </label>
            <input
              id="lead-name"
              type="text"
              value={form.lead_name}
              onChange={(e) => setField('lead_name', e.target.value)}
              maxLength={200}
              required
              aria-invalid={nameError}
              aria-describedby={nameError ? 'lead-name-error' : undefined}
              className={`rounded-md border px-3 py-2 text-body text-text-body focus:outline-none focus:ring-2 focus:ring-brand-rose/20 ${nameError ? 'border-red-400' : 'border-cream-dark'}`}
            />
            {nameError && (
              <span id="lead-name-error" role="alert" className="text-caption text-red-500">
                {localize('com_tfw_profile_lead_form_name_error')}
              </span>
            )}
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-platform" className="font-ui text-sm font-semibold text-text-headline">
              {localize('com_tfw_profile_lead_form_platform')}
            </label>
            <select
              id="lead-platform"
              value={form.platform}
              onChange={(e) => setField('platform', e.target.value as LeadPlatform)}
              className="rounded-md border border-cream-dark px-3 py-2 text-body text-text-body focus:outline-none focus:ring-2 focus:ring-brand-rose/20"
            >
              <option value="linkedin">{localize('com_tfw_profile_lead_platform_linkedin')}</option>
              <option value="instagram">{localize('com_tfw_profile_lead_platform_instagram')}</option>
              <option value="other">{localize('com_tfw_profile_lead_platform_other')}</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-status" className="font-ui text-sm font-semibold text-text-headline">
              {localize('com_tfw_profile_lead_form_status')}
            </label>
            <select
              id="lead-status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value as LeadStatus)}
              className="rounded-md border border-cream-dark px-3 py-2 text-body text-text-body focus:outline-none focus:ring-2 focus:ring-brand-rose/20"
            >
              <option value="cold">{localize('com_tfw_profile_lead_status_cold')}</option>
              <option value="warm">{localize('com_tfw_profile_lead_status_warm')}</option>
              <option value="hot">{localize('com_tfw_profile_lead_status_hot')}</option>
              <option value="closed">{localize('com_tfw_profile_lead_status_closed')}</option>
            </select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-notes" className="font-ui text-sm font-semibold text-text-headline">
              {localize('com_tfw_profile_lead_form_notes')}
            </label>
            <textarea
              id="lead-notes"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
              className="resize-y rounded-md border border-cream-dark px-3 py-2 text-body text-text-body focus:outline-none focus:ring-2 focus:ring-brand-rose/20"
            />
          </div>

          {/* Next Action */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-next-action" className="font-ui text-sm font-semibold text-text-headline">
              {localize('com_tfw_profile_lead_form_next_action')}
            </label>
            <input
              id="lead-next-action"
              type="text"
              value={form.next_action}
              onChange={(e) => setField('next_action', e.target.value)}
              className="rounded-md border border-cream-dark px-3 py-2 text-body text-text-body focus:outline-none focus:ring-2 focus:ring-brand-rose/20"
            />
          </div>

          {/* Next Action Date */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-next-action-date" className="font-ui text-sm font-semibold text-text-headline">
              {localize('com_tfw_profile_lead_form_next_action_date')}
            </label>
            <input
              id="lead-next-action-date"
              type="date"
              value={form.next_action_date}
              onChange={(e) => setField('next_action_date', e.target.value)}
              className="rounded-md border border-cream-dark px-3 py-2 text-body text-text-body focus:outline-none focus:ring-2 focus:ring-brand-rose/20"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-cream-dark pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-cream-dark px-4 py-2 font-ui text-sm text-text-body transition-colors hover:bg-cream-light"
            >
              {localize('com_tfw_profile_lead_form_cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-brand-rose px-5 py-2 font-ui text-sm font-semibold text-white transition-colors hover:bg-brand-rose-dark disabled:opacity-60"
            >
              {isLoading ? <Spinner /> : localize('com_tfw_profile_lead_form_save')}
            </button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
