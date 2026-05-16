import React from 'react'
import ReactDOM from 'react-dom/client'
import { tapPlaceComponent } from './tap-place'
import App from './App'
import './index.css'

// Register A-Frame component BEFORE React renders the scene
// AFRAME is available globally because 8frame script loads synchronously in index.html
if (window.AFRAME) {
  AFRAME.registerComponent('tap-place', tapPlaceComponent)
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
