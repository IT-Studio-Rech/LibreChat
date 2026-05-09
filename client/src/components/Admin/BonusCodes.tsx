import { useState } from 'react';
import { ArrowLeft, Check, Copy, Download, Loader2 } from 'lucide-react';
import { SystemRoles } from 'librechat-data-provider';
import { Button, Spinner } from '@librechat/client';
import type { GeneratedCode, ChargeAggregate, BonusCodeWithUser } from 'librechat-data-provider';
import { useGenerateBonusCodes, useChargesList, useChargeDetails } from '~/data-provider';
import { useLocalize, useAuthContext } from '~/hooks';

type View = 'main' | { type: 'detail'; description: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function CopyButton({ text }: { text: string }) {
  const localize = useLocalize();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={localize('com_tfw_bonus_codes_copy')}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? localize('com_tfw_bonus_codes_copied') : localize('com_tfw_bonus_codes_copy')}
    </button>
  );
}

function GenerateSection({
  onSuccess,
}: {
  onSuccess: (codes: GeneratedCode[], description: string) => void;
}) {
  const localize = useLocalize();
  const [count, setCount] = useState(20);
  const [description, setDescription] = useState('');

  const generate = useGenerateBonusCodes({
    onSuccess: (data) => onSuccess(data.codes, description),
  });

  const countValid = count >= 1 && count <= 1000;
  const descriptionValid = description.trim().length >= 1 && description.trim().length <= 200;
  const canSubmit = countValid && descriptionValid && !generate.isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    generate.mutate({ count, description: description.trim() });
  };

  return (
    <section aria-labelledby="generate-heading" className="rounded-xl border border-border-light bg-surface-primary p-6">
      <h2
        id="generate-heading"
        className="mb-5 text-lg font-semibold text-text-primary"
      >
        {localize('com_tfw_bonus_codes_generate_section')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bonus-count" className="mb-1 block text-sm font-medium text-text-secondary">
            {localize('com_tfw_bonus_codes_count_label')}
          </label>
          <input
            id="bonus-count"
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-32 rounded-lg border border-border-light bg-surface-secondary px-3 py-2 text-text-primary focus:border-green-500 focus:outline-none"
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="bonus-description" className="mb-1 block text-sm font-medium text-text-secondary">
            {localize('com_tfw_bonus_codes_description_label')}
          </label>
          <input
            id="bonus-description"
            type="text"
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={localize('com_tfw_bonus_codes_description_hint')}
            className="w-full rounded-lg border border-border-light bg-surface-secondary px-3 py-2 text-text-primary placeholder:text-text-secondary-alt focus:border-green-500 focus:outline-none"
            aria-required="true"
          />
          <p className="mt-1 text-xs text-text-secondary-alt">
            {localize('com_tfw_bonus_codes_description_hint')}
          </p>
        </div>

        {generate.isError && (
          <p role="alert" className="text-sm text-red-500">
            {localize('com_tfw_bonus_codes_error')}
          </p>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          variant="submit"
          className="h-10 rounded-lg px-5"
        >
          {generate.isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {localize('com_tfw_bonus_codes_generating')}
            </span>
          ) : (
            localize('com_tfw_bonus_codes_generate_button')
          )}
        </Button>
      </form>
    </section>
  );
}

function ResultSection({ codes, description }: { codes: GeneratedCode[]; description: string }) {
  const localize = useLocalize();

  const handleCopyAll = () => {
    const text = codes.map((c) => `${c.code}\t${c.registration_url}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleExportCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `bonus-codes-${slugify(description)}-${today}.csv`;
    const rows = codes.map((c) => {
      const code = c.code.includes(',') ? `"${c.code}"` : c.code;
      const url = c.registration_url.includes(',') ? `"${c.registration_url}"` : c.registration_url;
      return `${code},${url}`;
    });
    const csv = ['code,registration_url', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-labelledby="result-heading"
      className="rounded-xl border border-green-500/30 bg-green-500/5 p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="result-heading" className="text-base font-semibold text-text-primary">
          {localize('com_tfw_bonus_codes_result_title', { count: codes.length, description })}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            aria-label={localize('com_tfw_bonus_codes_copy_all')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-tertiary"
          >
            <Copy className="h-3.5 w-3.5" />
            {localize('com_tfw_bonus_codes_copy_all')}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            aria-label={localize('com_tfw_bonus_codes_export_csv')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-tertiary"
          >
            <Download className="h-3.5 w-3.5" />
            {localize('com_tfw_bonus_codes_export_csv')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label={localize('com_tfw_bonus_codes_result_title', { count: codes.length, description })}>
          <thead>
            <tr className="border-b border-border-light text-left text-text-secondary">
              <th className="pb-2 pr-4 font-medium">{localize('com_tfw_bonus_codes_col_code')}</th>
              <th className="pb-2 pr-4 font-medium">{localize('com_tfw_bonus_codes_col_url')}</th>
              <th className="pb-2 font-medium">{localize('com_tfw_bonus_codes_col_action')}</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((item) => (
              <tr key={item.code} className="border-b border-border-light/50 last:border-0">
                <td className="py-2 pr-4 font-mono text-xs text-text-primary">{item.code}</td>
                <td className="py-2 pr-4 max-w-xs truncate text-text-secondary">
                  <a
                    href={item.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {item.registration_url}
                  </a>
                </td>
                <td className="py-2">
                  <CopyButton text={item.code} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChargesSection({
  onSelectCharge,
}: {
  onSelectCharge: (description: string) => void;
}) {
  const localize = useLocalize();
  const { data: charges, isLoading, isError } = useChargesList();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
        <span className="ml-2 text-sm text-text-secondary">{localize('com_tfw_bonus_codes_loading')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-red-500">
        {localize('com_tfw_bonus_codes_error')}
      </p>
    );
  }

  if (!charges?.length) {
    return (
      <p className="text-sm text-text-secondary">{localize('com_tfw_bonus_codes_charges_empty')}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label={localize('com_tfw_bonus_codes_charges_section')}>
        <thead>
          <tr className="border-b border-border-light text-left text-text-secondary">
            <th className="pb-2 pr-4 font-medium">{localize('com_tfw_bonus_codes_description_label')}</th>
            <th className="pb-2 pr-4 font-medium">{localize('com_tfw_bonus_codes_col_date')}</th>
            <th className="pb-2 font-medium">{localize('com_tfw_bonus_codes_col_used')}</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge: ChargeAggregate) => (
            <tr
              key={charge.description}
              className="cursor-pointer border-b border-border-light/50 transition-colors last:border-0 hover:bg-surface-tertiary"
              onClick={() => onSelectCharge(charge.description)}
              role="button"
              tabIndex={0}
              aria-label={charge.description}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectCharge(charge.description);
                }
              }}
            >
              <td className="py-2.5 pr-4 font-medium text-text-primary">{charge.description}</td>
              <td className="py-2.5 pr-4 text-text-secondary">{formatDate(charge.createdAt)}</td>
              <td className="py-2.5 text-text-secondary">
                {charge.used}/{charge.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailSection({ description, onBack }: { description: string; onBack: () => void }) {
  const localize = useLocalize();
  const { data: codes, isLoading, isError } = useChargeDetails(description);

  const used = codes?.filter((c) => c.used).length ?? 0;
  const total = codes?.length ?? 0;

  return (
    <section aria-labelledby="detail-heading" className="rounded-xl border border-border-light bg-surface-primary p-6">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={localize('com_tfw_bonus_codes_detail_back')}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {localize('com_tfw_bonus_codes_detail_back')}
        </button>
        <h2 id="detail-heading" className="text-lg font-semibold text-text-primary">
          {isLoading
            ? description
            : `${description} (${used}/${total})`}
        </h2>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-6">
          <Spinner />
          <span className="text-sm text-text-secondary">{localize('com_tfw_bonus_codes_loading')}</span>
        </div>
      )}

      {isError && (
        <p role="alert" className="text-sm text-red-500">
          {localize('com_tfw_bonus_codes_error')}
        </p>
      )}

      {codes && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label={description}>
            <thead>
              <tr className="border-b border-border-light text-left text-text-secondary">
                <th className="pb-2 pr-4 font-medium">{localize('com_tfw_bonus_codes_detail_col_code')}</th>
                <th className="pb-2 pr-4 font-medium">{localize('com_tfw_bonus_codes_detail_col_status')}</th>
                <th className="pb-2 pr-4 font-medium">{localize('com_tfw_bonus_codes_detail_col_user')}</th>
                <th className="pb-2 font-medium">{localize('com_tfw_bonus_codes_detail_col_redeemed')}</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((item: BonusCodeWithUser) => (
                <tr key={item.code} className="border-b border-border-light/50 last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-xs text-text-primary">{item.code}</td>
                  <td className="py-2.5 pr-4">
                    {item.used ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <Check className="h-3.5 w-3.5" />
                        {localize('com_tfw_bonus_codes_status_used')}
                      </span>
                    ) : (
                      <span className="text-text-secondary">
                        {localize('com_tfw_bonus_codes_status_open')}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-text-secondary">
                    {item.usedBy?.email ?? '—'}
                  </td>
                  <td className="py-2.5 text-text-secondary">{formatDate(item.usedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function BonusCodes() {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const [result, setResult] = useState<{ codes: GeneratedCode[]; description: string } | null>(
    null,
  );
  const [view, setView] = useState<View>('main');

  const handleGenerateSuccess = (codes: GeneratedCode[], description: string) => {
    setResult({ codes, description });
  };

  if (user?.role !== SystemRoles.ADMIN) {
    return null;
  }

  if (view !== 'main') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <DetailSection
          description={view.description}
          onBack={() => setView('main')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-text-primary">
        {localize('com_tfw_bonus_codes_title')}
      </h1>

      <GenerateSection onSuccess={handleGenerateSuccess} />

      {result && (
        <ResultSection codes={result.codes} description={result.description} />
      )}

      <section aria-labelledby="charges-heading" className="rounded-xl border border-border-light bg-surface-primary p-6">
        <h2
          id="charges-heading"
          className="mb-5 text-lg font-semibold text-text-primary"
        >
          {localize('com_tfw_bonus_codes_charges_section')}
        </h2>
        <ChargesSection onSelectCharge={(desc) => setView({ type: 'detail', description: desc })} />
      </section>
    </div>
  );
}
