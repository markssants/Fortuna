import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UndoProvider } from './contexts/UndoContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UndoProvider>
      <App />
    </UndoProvider>
  </StrictMode>,
);
