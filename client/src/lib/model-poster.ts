"use client";

import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const POSTER_SIZE = 768;
const MODEL_VIEWER_SRC =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";

type PosterCapableModelViewer = HTMLElement & {
  toBlob?: (options?: { mimeType?: string; qualityArgument?: number }) => Promise<Blob | null>;
  toDataURL?: (type?: string, encoderOptions?: number) => string;
};

let modelViewerReadyPromise: Promise<void> | null = null;

const fileNameToPosterName = (fileName: string) =>
  `${fileName.replace(/\.(glb|gltf)$/i, "").trim() || "dish-model"}-poster.webp`;

const ensureBlob = (blob: Blob | null): Blob => {
  if (!blob) {
    throw new Error("Unable to generate poster image.");
  }

  return blob;
};

const waitForFrames = async (count: number): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
};

const ensureModelViewerLibrary = async (): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("Poster generation must run in the browser.");
  }

  if (window.customElements?.get("model-viewer")) {
    return;
  }

  if (!modelViewerReadyPromise) {
    modelViewerReadyPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[data-model-poster-loader="true"]`,
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Unable to load model-viewer for poster generation.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.type = "module";
      script.src = MODEL_VIEWER_SRC;
      script.async = true;
      script.dataset.modelPosterLoader = "true";
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Unable to load model-viewer for poster generation."));
      document.head.appendChild(script);
    }).finally(() => {
      if (!window.customElements?.get("model-viewer")) {
        modelViewerReadyPromise = null;
      }
    });
  }

  await modelViewerReadyPromise;
};

const captureModelViewerPoster = async (
  modelUrl: string,
  alt: string,
): Promise<Blob> => {
  await ensureModelViewerLibrary();

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = `${POSTER_SIZE}px`;
  host.style.height = `${POSTER_SIZE}px`;
  host.style.pointerEvents = "none";
  host.style.opacity = "0";

  const viewer = document.createElement(
    "model-viewer",
  ) as PosterCapableModelViewer;
  viewer.setAttribute("src", modelUrl);
  viewer.setAttribute("alt", alt);
  viewer.setAttribute("camera-controls", "");
  viewer.setAttribute("interaction-prompt", "none");
  viewer.setAttribute("environment-image", "neutral");
  viewer.setAttribute("shadow-intensity", "1");
  viewer.setAttribute("exposure", "1");
  viewer.setAttribute("camera-orbit", "336deg 70deg 2.6m");
  viewer.setAttribute("field-of-view", "32deg");
  viewer.style.width = "100%";
  viewer.style.height = "100%";
  viewer.style.background =
    "radial-gradient(circle at top, rgba(255,255,255,0.72), transparent 50%), linear-gradient(180deg, #dbe7fb 0%, #cfdcf5 100%)";

  host.appendChild(viewer);
  document.body.appendChild(host);

  try {
    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error("Poster generation timed out while loading the 3D model."));
      }, 20000);

      const handleLoad = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };

      const handleError = () => {
        window.clearTimeout(timeoutId);
        reject(new Error("Unable to render the 3D model for poster generation."));
      };

      viewer.addEventListener("load", handleLoad, { once: true });
      viewer.addEventListener("error", handleError, { once: true });
    });

    await waitForFrames(4);

    if (typeof viewer.toBlob === "function") {
      const blob = await viewer.toBlob({
        mimeType: "image/webp",
        qualityArgument: 0.92,
      });
      if (blob) {
        return blob;
      }
    }

    if (typeof viewer.toDataURL === "function") {
      const dataUrl = viewer.toDataURL("image/webp", 0.92);
      if (dataUrl) {
        const response = await fetch(dataUrl);
        return ensureBlob(await response.blob());
      }
    }

    const canvas = viewer.shadowRoot?.querySelector("canvas");
    if (canvas instanceof HTMLCanvasElement) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", 0.92);
      });
      return ensureBlob(blob);
    }

    throw new Error("Poster capture is not supported in this browser.");
  } finally {
    host.remove();
  }
};

const renderPosterBlobWithThree = async (modelRoot: Group): Promise<Blob> => {
  const scene = new Scene();
  scene.background = new Color("#dfeafe");

  const ambientLight = new AmbientLight("#ffffff", 1.9);
  const keyLight = new DirectionalLight("#ffffff", 1.75);
  keyLight.position.set(4.5, 7.5, 9);

  const fillLight = new DirectionalLight("#b8d2ff", 0.95);
  fillLight.position.set(-5, 4.5, 6);

  scene.add(ambientLight, keyLight, fillLight);
  scene.add(modelRoot);

  const bounds = new Box3().setFromObject(modelRoot);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 0.01);

  modelRoot.position.sub(center);
  modelRoot.position.y -= size.y * 0.12;
  modelRoot.rotation.y = MathUtils.degToRad(-24);

  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  const distance = maxDimension * 2.85;
  camera.position.set(0, size.y * 0.25 + maxDimension * 0.24, distance);
  camera.lookAt(0, size.y * 0.06, 0);

  const renderer = new WebGLRenderer({
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(POSTER_SIZE, POSTER_SIZE, false);
  renderer.render(scene, camera);

  const blob = await new Promise<Blob | null>((resolve) => {
    renderer.domElement.toBlob(resolve, "image/webp", 0.92);
  });

  renderer.dispose();

  return ensureBlob(blob);
};

const createPosterFileFromThreeScene = async (
  modelRoot: Group,
  fileName: string,
): Promise<File> => {
  const clonedModel = modelRoot.clone(true);
  const blob = await renderPosterBlobWithThree(clonedModel);

  return new File([blob], fileNameToPosterName(fileName), {
    type: "image/webp",
  });
};

export const generateModelPosterFromFile = async (
  modelFile: File,
): Promise<File> => {
  const fileUrl = URL.createObjectURL(modelFile);

  try {
    const blob = await captureModelViewerPoster(fileUrl, modelFile.name);
    return new File([blob], fileNameToPosterName(modelFile.name), {
      type: "image/webp",
    });
  } catch {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(fileUrl);
    return createPosterFileFromThreeScene(gltf.scene, modelFile.name);
  } finally {
    URL.revokeObjectURL(fileUrl);
  }
};

export const generateModelPosterFromUrl = async (
  modelUrl: string,
  fileName: string,
): Promise<File> => {
  try {
    const blob = await captureModelViewerPoster(modelUrl, fileName);
    return new File([blob], fileNameToPosterName(fileName), {
      type: "image/webp",
    });
  } catch {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(modelUrl);
    return createPosterFileFromThreeScene(gltf.scene, fileName);
  }
};
