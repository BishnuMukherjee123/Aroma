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
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const createLoaderWithDraco = () => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
  );
  loader.setDRACOLoader(dracoLoader);
  return loader;
};

const POSTER_SIZE = 768;

const fileNameToPosterName = (fileName: string) =>
  `${fileName.replace(/\.(glb|gltf)$/i, "").trim() || "dish-model"}-poster.webp`;

const ensureBlob = (blob: Blob | null): Blob => {
  if (!blob) {
    throw new Error("Unable to generate poster image.");
  }

  return blob;
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
  renderer.outputColorSpace = "srgb";
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
    const loader = createLoaderWithDraco();
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
  const loader = createLoaderWithDraco();
  const gltf = await loader.loadAsync(modelUrl);
  return createPosterFileFromThreeScene(gltf.scene, fileName);
};
