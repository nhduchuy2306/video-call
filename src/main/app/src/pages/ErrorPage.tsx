import React from "react";
import { useNavigate, useRouteError } from "react-router-dom";

interface ErrorPageProps {
    errorCode?: string | number;
    errorMessage?: string;
    showBackButton?: boolean;
}

const ErrorPage: React.FC<ErrorPageProps> = ({errorCode, errorMessage, showBackButton = true}) => {
    const navigate = useNavigate();
    const routeError = useRouteError();

    const getErrorDetails = () => {
        if (errorCode && errorMessage) {
            return {code: errorCode, message: errorMessage};
        }

        if (routeError) {
            return {
                code: "500",
                message: "An unexpected error occurred"
            };
        }

        return {
            code: "404",
            message: "The page you're looking for doesn't exist"
        };
    };

    const {code, message} = getErrorDetails();

    const handleGoBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    const handleGoHome = () => {
        navigate('/');
    };

    const getErrorTitle = () => {
        switch (code.toString()) {
            case "404":
                return "Page Not Found";
            case "500":
                return "Server Error";
            case "403":
                return "Access Denied";
            case "401":
                return "Unauthorized";
            default:
                return "Something Went Wrong";
        }
    };

    return (
            <div className="error-page">
                <div className="error-page__background-shape error-page__background-shape--1"></div>
                <div className="error-page__background-shape error-page__background-shape--2"></div>
                <div className="error-page__background-shape error-page__background-shape--3"></div>
                <div className="error-page__card">
                    <div className="error-page__icon">
                        <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                        >
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>

                    <h1 className="error-page__code">{code}</h1>

                    <h2 className="error-page__title">
                        {getErrorTitle()}
                    </h2>

                    <p className="error-page__message">
                        {message}
                    </p>

                    <div className="error-page__button-container">
                        <button
                                className="error-page__button error-page__button--primary"
                                onClick={handleGoHome}
                        >
                            🏠 Go Home
                        </button>

                        {showBackButton && (
                                <button className="error-page__button error-page__button--secondary"
                                        onClick={handleGoBack}>← Go Back</button>
                        )}
                    </div>

                    <div className="error-page__help">
                        💡 <strong>Need help?</strong> If this problem persists, please contact our support team.
                    </div>
                </div>
            </div>
    );
};

export default ErrorPage;