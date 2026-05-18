import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DragonFight from './DragonFight'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DragonFight />
  </StrictMode>
)
