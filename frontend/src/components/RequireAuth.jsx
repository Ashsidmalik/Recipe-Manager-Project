// C:\frontend\src\components\RequireAuth.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

const RequireAuth = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="primary" />
                <p>Loading session...</p>
            </Container>
        );
    }
    
    if (!isAuthenticated) {
        // Redirects to the login page if the user is not authenticated
        return <Navigate to="/login" replace />; 
    }

    return children;
};

export default RequireAuth;