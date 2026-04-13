import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        poster?: string;
        reveal?: "auto" | "interaction" | "manual";
        ar?: boolean;
        "ar-modes"?: string;
        "camera-controls"?: boolean;
        "touch-action"?: string;
        exposure?: string;
        shadowIntensity?: string;
        "shadow-intensity"?: string;
        environmentImage?: string;
        "environment-image"?: string;
        "auto-rotate"?: boolean;
        autoplay?: boolean;
        loading?: "eager" | "lazy";
      };
    }
  }
}
