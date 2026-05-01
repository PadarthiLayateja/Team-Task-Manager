import { createBrowserRouter, Navigate, Outlet } from "react-router";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import UsersPage from "./pages/UsersPage";
import ActivityPage from "./pages/ActivityPage";
import AppLayout from "./components/layout/AppLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "auth", Component: AuthPage },
      {
        // Pathless layout route — wraps all authenticated pages
        Component: AppLayout,
        children: [
          { path: "dashboard", Component: DashboardPage },
          { path: "projects", Component: ProjectsPage },
          { path: "projects/:id", Component: ProjectDetailPage },
          { path: "users", Component: UsersPage },
          { path: "activity", Component: ActivityPage },
        ],
      },
    ],
  },
]);
