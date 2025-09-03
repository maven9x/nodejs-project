import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from "react-router/dom";
import '@app/styles/global.scss'
import router from './route';
import { AuthProvider } from './contexts/AuthProvider';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
    <RouterProvider router={router} />,
    </AuthProvider>
  </StrictMode>,
)
