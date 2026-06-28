import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import App from './App'

// StrictMode is intentionally omitted: WebRTC peer connections and Firestore
// listeners are not idempotent — double-invoked effects would create two
// connections and leak the first one.
createRoot(document.getElementById('root')!).render(<App />)
