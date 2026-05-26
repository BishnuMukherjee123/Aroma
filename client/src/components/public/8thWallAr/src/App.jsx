import React from 'react'

export default function App() {
  return (
    <>
      {/* "Tap To Place Model" UI overlay */}
      <div className="over">
        <span id="promptText">Tap To Place Model</span>
      </div>

      {/* A-Frame scene — React renders custom elements directly to the DOM */}
      <a-scene
        tap-place=""
        landing-page=""
        xrextras-loading=""
        xrextras-runtime-error=""
        xrextras-gesture-detector=""
        xrextras-pbr-environment=""
        renderer="colorManagement:true; physicallyCorrectLights:true; toneMapping: ACESFilmic; logarithmicDepthBuffer:true;"
        xrweb="
          allowedDevices: any;
          defaultEnvironmentFogIntensity: 0.5;
          defaultEnvironmentFloorTexture: #groundTex;
          defaultEnvironmentFloorColor: #FFF;
          defaultEnvironmentSkyBottomColor: #B4C4CC;
          defaultEnvironmentSkyTopColor: #5ac8fa;
          defaultEnvironmentSkyGradientStrength: 0.5;"
      >
        {/* Assets — loaded from /public/assets/ */}
        <a-assets>
          <img id="groundTex" src="/assets/sand.jpg" alt="" />
          <a-asset-item id="cactusModel" src="/assets/10.glb"></a-asset-item>
        </a-assets>

        {/* Camera with raycaster limited to .cantap objects */}
        <a-camera
          id="camera"
          raycaster="objects: .cantap"
          cursor="fuse: false; rayOrigin: mouse;"
        ></a-camera>

        {/* Directional light that follows camera */}
        <a-entity
          light="type: directional; intensity: 0.8; castShadow: true; shadowMapHeight:2048; shadowMapWidth:2048; shadowCameraTop: 10; shadowCameraBottom: -10; shadowCameraRight: 10; shadowCameraLeft: -10; target: #camera"
          xrextras-attach="target: camera; offset: 8 15 4"
          position="1 4.3 2.5"
          shadow=""
        ></a-entity>

        <a-light type="ambient" intensity="0.3"></a-light>
        <a-light type="hemisphere" ground-color="#333" intensity="0.8"></a-light>

        {/* Invisible ground plane — clicking this spawns models */}
        <a-box
          id="ground"
          className="cantap"
          scale="1000 2 1000"
          position="0 -0.99 0"
          material="shader: shadow; transparent: true; opacity: 0.7"
          shadow=""
        ></a-box>
      </a-scene>
    </>
  )
}
