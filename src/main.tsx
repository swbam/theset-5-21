
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner';
import App from './App.tsx'
import './index.css'

const root = document.getElementById("root");

if (!root) {
  console.error("Root element not found!");
} else {
  try {
    createRoot(root).render(
      <>
        <App />
        <Toaster position="top-right" />
      </>
    );
  } catch (error) {
    console.error("Error rendering app:", error);
    root.innerHTML = `
      <div style="padding: 20px; text-align: center; color: white; background-color: #111;">
        <h1>Something went wrong</h1>
        <p>There was an error loading the application. Please check the console for details.</p>
        <pre style="background: #222; padding: 10px; text-align: left; margin-top: 20px; overflow: auto; color: #f8f8f8; border-radius: 4px;">${error}</pre>
      </div>
    `;
  }
}
