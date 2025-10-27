import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import ErrorViewer from "../pages/ErrorViewer";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Home />,
        errorElement: <ErrorViewer />
    }
])