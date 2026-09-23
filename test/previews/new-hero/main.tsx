import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Hero from './hero';
import '../triangle-led-front/styles.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Hero />
  </StrictMode>,
);
