import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { NotificationProvider } from './components/Notifications';
import './styles.css';
import './features/world/world-map-density.css';
import './features/world/street-navigation.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </I18nProvider>
  </StrictMode>
);
