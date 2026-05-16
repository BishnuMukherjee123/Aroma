import type { DetailedHTMLProps, HTMLAttributes } from "react";

type AFrameElementProps = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> &
  Record<string, unknown>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": AFrameElementProps;
      "a-assets": AFrameElementProps;
      "a-asset-item": AFrameElementProps;
      "a-camera": AFrameElementProps;
      "a-entity": AFrameElementProps;
      "a-light": AFrameElementProps;
      "a-box": AFrameElementProps;
    }
  }
}
