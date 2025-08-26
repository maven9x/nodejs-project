import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import App from '@/views/layouts/app';
import HomePage from '@/views/home-page';
import '@/styles/global.scss'


const router = createBrowserRouter([
  {
    path: "/",
    element: <App/>,
    children: [
      {
        index: true,
        element: <HomePage/>
      },
      {
        path: "test",
        element: <HomePage />
      }
    ]
  },
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />,
  </StrictMode>,
)
