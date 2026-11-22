import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')!

// SSG / CSR isomorphic mount: hydrate prerendered markup if present; fallback to createRoot
if (container.hasChildNodes()) {
  hydrateRoot(
    container,
    <StrictMode>
      <App />
    </StrictMode>
  )
} else {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
