"use client";

type AssetUploadPanelProps = {
  selectedDishName: string | null;
  modelFileName: string | null;
  thumbnailFileName: string | null;
  autoOptimize: boolean;
  isUploading: boolean;
  uploadMessage: string | null;
  onModelChange: (file: File | null) => void;
  onThumbnailChange: (file: File | null) => void;
  onToggleAutoOptimize: () => void;
  onSubmit: () => void;
};

export function AssetUploadPanel({
  selectedDishName,
  modelFileName,
  thumbnailFileName,
  autoOptimize,
  isUploading,
  uploadMessage,
  onModelChange,
  onThumbnailChange,
  onToggleAutoOptimize,
  onSubmit,
}: AssetUploadPanelProps) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
      <div className="flex items-center justify-between bg-slate-50 px-6 py-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-on-surface">
          <span className="material-symbols-outlined text-primary">
            cloud_upload
          </span>
          Upload Assets
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
          AR & Media
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Current Selection
          </p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {selectedDishName ?? "Select a dish from the table first"}
          </p>
        </div>

        <div className="space-y-2">
          <label className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
            AR Model (.GLB)
          </label>
          <label className="group flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[1.3rem] border-2 border-dashed border-slate-200 bg-slate-50/70 px-6 text-center transition-all hover:border-primary/35 hover:bg-primary/5">
            <input
              type="file"
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              className="hidden"
              onChange={(event) =>
                onModelChange(event.target.files?.[0] ?? null)
              }
            />
            <span className="material-symbols-outlined text-5xl text-slate-300 transition-colors group-hover:text-primary">
              view_in_ar
            </span>
            <p className="mt-3 text-sm font-bold text-on-surface">
              Drag or choose a 3D model
            </p>
            <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
              {modelFileName ?? "GLB or GLTF files up to 25MB"}
            </p>
          </label>
        </div>

        <div className="space-y-2">
          <label className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
            Thumbnail Media
          </label>
          <label className="group flex aspect-[1.35/1] cursor-pointer flex-col items-center justify-center rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 px-5 text-center transition-all hover:border-primary/35 hover:bg-primary/5">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) =>
                onThumbnailChange(event.target.files?.[0] ?? null)
              }
            />
            <span className="material-symbols-outlined text-[1.7rem] text-slate-300 transition-colors group-hover:text-primary">
              add_photo_alternate
            </span>
            <p className="mt-2 text-xs font-bold text-on-surface">
              Add Thumbnail Image
            </p>
            <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
              {thumbnailFileName ?? "PNG, JPG, or WEBP"}
            </p>
          </label>
        </div>

        <div className="space-y-4 pt-2">
          <button
            type="button"
            onClick={onToggleAutoOptimize}
            className="flex w-full items-center justify-between rounded-[1rem] bg-surface-container-low px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm font-bold text-on-surface">
                Auto-optimize assets
              </p>
              <p className="text-[11px] font-medium text-on-surface-variant">
                Compress media metadata before publishing
              </p>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${
                autoOptimize ? "bg-primary" : "bg-slate-300"
              }`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  autoOptimize ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
          </button>

          {uploadMessage ? (
            <div className="rounded-[1rem] bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface-variant">
              {uploadMessage}
            </div>
          ) : null}
        </div>

        <div className="mt-auto">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-4 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUploading ? <span className="spinner-sm" /> : null}
            Process & Publish
          </button>
          <p className="mt-3 text-center text-[10px] font-medium text-on-surface-variant">
            Assets will be linked to the currently selected dish.
          </p>
        </div>
      </div>
    </section>
  );
}
