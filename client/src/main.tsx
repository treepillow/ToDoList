import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initialTheme } from './hooks/useTheme';
import './styles.css';

// Apply the theme before React mounts to avoid a light-mode flash.
document.documentElement.dataset.theme = initialTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
