import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';

export function ImportExport() {
  const exportJson = useStore((s) => s.exportJson);
  const importJson = useStore((s) => s.importJson);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleExport() {
    const json = exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `buildtimetracker-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage('Exported.');
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importJson(text);
      setMessage(`Imported ${file.name}.`);
    } catch (err) {
      setMessage(`Import failed: ${(err as Error).message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-3 text-lg font-medium">Import / Export</h2>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm text-neutral-200 hover:border-emerald-500 hover:text-emerald-300"
        >
          Export JSON
        </button>
        <label className="cursor-pointer rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm text-neutral-200 hover:border-emerald-500 hover:text-emerald-300">
          Import JSON
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={handleFile}
            className="hidden"
          />
        </label>
        {message && (
          <span className="text-xs text-neutral-400">{message}</span>
        )}
      </div>
    </section>
  );
}
