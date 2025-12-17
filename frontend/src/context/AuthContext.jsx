// C:\frontend\src\context\AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:8002'; 
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('access_token') || null);
    const [isLoading, setIsLoading] = useState(true);

    // Set axios default headers and fetch user data on mount/token change
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // NOTE: In a complete system, you would call an endpoint like /users/me here 
            // to fetch the real user object. For now, we mock it on login.
        }
        setIsLoading(false);
    }, [token]);

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('access_token');
        delete axios.defaults.headers.common['Authorization'];
        navigate('/login');
    };

    const login = async (email, password) => {
        try {
            // FastAPI expects x-www-form-urlencoded for the token endpoint
            const response = await axios.post(`${API_BASE_URL}/auth/login`, 
                `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );

            const newToken = response.data.access_token;
            
            setToken(newToken);
            localStorage.setItem('access_token', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            
            // MOCK USER DATA: Set a temporary user object until /users/me endpoint is created
            // The `username` is passed from the login form/backend for display.
            setUser({ id: 1, email: email, username: 'The Chef' }); 

            return true;
        } catch (error) {
            console.error('Login failed:', error);
            logout(); 
            return false;
        }
    };
    
    // Function to handle all authenticated requests (Crucial for Requirement 5)
    const apiClient = async (url, method = 'GET', data = null) => {
        if (!token) {
            console.error("No token available. User is not authenticated.");
            logout();
            return;
        }

        const config = {
            method: method,
            url: `${API_BASE_URL}${url}`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            data: data,
        };
        
        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 401) {
                // Token expired or invalid
                logout();
                throw new Error("Session expired. Please log in again.");
            }
            throw error; 
        }
    };

    const contextValue = {
        token,
        user,
        isLoading,
        isAuthenticated: !!token,
        login,
        logout,
        apiClient, // <-- Exposed for all components to use
        API_BASE_URL
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};