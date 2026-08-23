import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { NotificationProvider } from './components/Notifications';
import { MARKET_STREET_BLOCK_3_BACKGROUND } from './features/world/assets/market-street-block-3';
import './styles.css';
import './features/world/world-map-density.css';
import './features/world/street-navigation.css';
import './features/world/world-visual.css';
import './features/world/street-refinement.css';
import './features/world/vehicle-fbx.css';
import './hud.css';
import './hud-v2.css';
import './hud-v3.css';
import './hud-v4.css';

// Pilot street environment: visual-only background. All actors, routing and
// interaction coordinates remain separate runtime state above this image.
document.documentElement.style.setProperty(
  '--market-street-block-3-background',
  `url("${MARKET_STREET_BLOCK_3_BACKGROUND}")`
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </I18nProvider>
  </StrictMode>
);
