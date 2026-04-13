"use client";

import { Suspense, useEffect, useMemo } from "react";

import { Canvas } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3 } from "three";

type ArPreviewCanvasProps = {
  modelUrl: string;
  alt: string;
  interactive: boolean;
  onLoaded: () => void;
};

export function ArPreviewCanvas({
  modelUrl,
  alt,
  interactive,
  onLoaded,
}: ArPreviewCanvasProps) {
  return (
    <Canvas
      frameloop={interactive ? "always" : "demand"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.35, 4], fov: 28 }}
      className="h-full w-full"
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#dbe7fb"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[3, 4, 4]} intensity={1.8} />
      <directionalLight position={[-3, 2, 2]} intensity={0.7} />

      <Suspense fallback={null}>
        <PreviewModel url={modelUrl} alt={alt} onLoaded={onLoaded} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={interactive}
        enableRotate={interactive}
        autoRotate={interactive}
        autoRotateSpeed={1.5}
        minDistance={2.1}
        maxDistance={5.6}
      />
    </Canvas>
  );
}

function PreviewModel({
  url,
  alt,
  onLoaded,
}: {
  url: string;
  alt: string;
  onLoaded: () => void;
}) {
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.name = alt;
    return clone;
  }, [alt, scene]);

  const normalizedScene = useMemo(() => {
    const wrapper = new Group();
    const asset = clonedScene.clone(true);
    const box = new Box3().setFromObject(asset);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.1 / maxAxis;

    asset.position.sub(center);
    asset.scale.setScalar(scale);
    wrapper.add(asset);
    return wrapper;
  }, [clonedScene]);

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  return (
    <Center position={[0, -0.1, 0]}>
      <primitive object={normalizedScene} />
    </Center>
  );
}
