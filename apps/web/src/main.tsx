import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { NotificationProvider } from './components/Notifications';
import './styles.css';
import './components/generated-vehicle-sprite.css';
import './features/world/world-map-density.css';
import './features/world/street-navigation.css';
import './features/world/world-visual.css';
import './features/world/street-refinement.css';
import './hud.css';
import './game-navigation-rail.css';
import './game-chrome-layout.css';
import './game-chrome-refinements.css';

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </I18nProvider>
);
