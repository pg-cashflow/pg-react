import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')!

// CSR client mount for authenticated app; public marketing/policy pages use static SSG HTML
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
