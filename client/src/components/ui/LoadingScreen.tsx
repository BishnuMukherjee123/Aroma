import { cn } from "@/lib/utils";

type LoadingScreenProps = {
  /** Text shown below the spinner. */
  message?: string;
  /** Extra class names on the outer full-screen wrapper (e.g. "dashboard-shell" for light theme). */
  className?: string;
  /** Spinner border color (the track). Default: light green. */
  spinnerTrackColor?: string;
  /** Spinner active color (the moving arc). Default: dark green. */
  spinnerColor?: string;
  /** Spinner size in px. Default: 32. */
  spinnerSize?: number;
  /** Text color class or inline style value. */
  textColor?: string;
};

/**
 * Global reusable loading screen.
 *
 * Usage:
 * ```tsx
 * <LoadingScreen
 *   message="Loading control room..."
 *   className="dashboard-shell"
 *   spinnerColor="#176939"
 *   spinnerTrackColor="#e6f1ea"
 *   textColor="#5a6660"
 * />
 * ```
 *
 * Or with defaults (green theme, white bg):
 * ```tsx
 * <LoadingScreen message="Loading..." className="dashboard-shell" />
 * ```
 */
export function LoadingScreen({
  message = "Loading...",
  className,
  spinnerTrackColor = "#e6f1ea",
  spinnerColor = "#176939",
  spinnerSize = 32,
  textColor = "#5a6660",
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="animate-spin rounded-full"
          style={{
            width: spinnerSize,
            height: spinnerSize,
            border: `3px solid ${spinnerTrackColor}`,
            borderTopColor: spinnerColor,
          }}
        />
        {message ? (
          <p
            className="text-sm font-semibold"
            style={{ color: textColor }}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
