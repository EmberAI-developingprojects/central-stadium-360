import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth';
import './document-head';
import './i18n';
import 'virtual:tailwind.css';

try {
  localStorage.removeItem('tsengeldekh_seeded_v1');
  localStorage.removeItem('tsengeldekh_tickets');
} catch {

}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
