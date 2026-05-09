import { useRef, useCallback, useState } from 'react';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
import { SystemRoles } from 'librechat-data-provider';
import { Button } from '@librechat/client';
import { useVaultUpload } from '~/data-provider';
import { useLocalize, useAuthContext } from '~/hooks';
import { cn } from '~/utils';

const CATEGORIES = ['nischenfindung', 'angebot', 'sales', 'webseite'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LOCALE_KEYS: Record<Category, string> = {
  nischenfindung: 'com_tfw_vaultupload_category_nischenfindung',
  angebot: 'com_tfw_vaultupload_category_angebot',
  sales: 'com_tfw_vaultupload_category_sales',
  webseite: 'com_tfw_vaultupload_category_webseite',
};

export default function VaultUpload() {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Category>('nischenfindung');
  const [isDragging, setIsDragging] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const upload = useVaultUpload({
    onSuccess: () => setSucceeded(true),
  });

  if (user?.role !== SystemRoles.ADMIN) {
    return null;
  }

  const handleFile = useCallback((file: File) => {
    setSelectedFile(file);
    setSucceeded(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || upload.isLoading) return;
    upload.mutate({ file: selectedFile, category });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {localize('com_tfw_vaultupload_title')}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {localize('com_tfw_vaultupload_description')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="vault-category"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            {localize('com_tfw_vaultupload_category_label')}
          </label>
          <select
            id="vault-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="rounded-lg border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-green-500 focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {localize(CATEGORY_LOCALE_KEYS[cat])}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            disabled={upload.isLoading}
            aria-label={localize('com_tfw_vaultupload_dropzone')}
            className={cn(
              'flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-text-secondary transition-colors',
              isDragging
                ? 'border-green-500 bg-green-500/5'
                : 'border-border-medium hover:border-border-heavy hover:bg-surface-hover',
              upload.isLoading && 'cursor-wait opacity-50',
            )}
          >
            {upload.isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
            ) : (
              <Upload className="h-8 w-8 text-text-secondary" aria-hidden="true" />
            )}
            <span>{localize('com_tfw_vaultupload_dropzone')}</span>
            <span className="text-xs text-text-secondary-alt">
              {localize('com_tfw_vaultupload_accepted')}
            </span>
          </button>

          {selectedFile && (
            <p className="mt-2 text-sm text-text-secondary">
              {localize('com_tfw_vaultupload_selected_file', { filename: selectedFile.name })}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.md,.txt,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {upload.isError && (
          <p role="alert" className="text-sm text-red-500">
            {localize('com_tfw_vaultupload_error')}
          </p>
        )}

        {succeeded && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-sm text-green-600"
          >
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{localize('com_tfw_vaultupload_success')}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={!selectedFile || upload.isLoading}
          variant="submit"
          className="h-10 rounded-lg px-5"
        >
          {upload.isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {localize('com_tfw_vaultupload_submitting')}
            </span>
          ) : (
            localize('com_tfw_vaultupload_submit')
          )}
        </Button>
      </form>
    </div>
  );
}
