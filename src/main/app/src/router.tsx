import { createBrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import ErrorPage from "./pages/ErrorPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import RoomPage from "./pages/RoomPage.tsx";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <App/>,
        errorElement: <ErrorPage/>,
        children: [
            {
                index: true,
                element: <HomePage/>
            },
            {
                path: 'room/:id',
                element: <RoomPage/>,
            },
        ],
    },
]);