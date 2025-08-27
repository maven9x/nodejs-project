import { createBrowserRouter } from "react-router";
import App from '@app/views/layouts/app';
import RegisterForm from "@app/views/users/register-form";
import LoginForm from "./views/users/login-form";


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <div> home page</div>,
      },
      {
        path: "register",
        element: <RegisterForm />,
      },
      {
        path: "login",
        element: <LoginForm/>,
      }
    ],
  },
]);

export default router;