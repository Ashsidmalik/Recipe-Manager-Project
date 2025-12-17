// C:\frontend\src\pages\loginpage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; 
import { Form, Button, Card, Alert } from 'react-bootstrap'; // <-- NEW: Import Bootstrap components

const LoginPage = ({ isRegister = false }) => {
    const [email, setEmail] = useState('test@example.com');
    const [password, setPassword] = useState('password');
    const [username, setUsername] = useState('The Chef'); 
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, isAuthenticated, API_BASE_URL } = useAuth(); 
    const navigate = useNavigate();

    if (isAuthenticated) {
        navigate('/recipes');
        return null; 
    }

    const handleRegister = async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username }),
            });
            await login(email, password); 
            navigate('/recipes');
        } catch (err) {
            setError(err.message || 'Registration failed. Check backend status.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (isRegister) {
            await handleRegister();
        } else {
            const success = await login(email, password);
            if (success) {
                navigate('/recipes');
            } else {
                setError('Login failed. Please check your credentials.');
            }
        }
        
        setIsSubmitting(false);
    };

    return (
        <div className="d-flex justify-content-center mt-5"> {/* Bootstrap class for centering and margin */}
            <Card style={{ width: '25rem' }} className="shadow-lg">
                <Card.Body>
                    <Card.Title className="text-center mb-4">
                        {isRegister ? 'Register' : 'Login'}
                    </Card.Title>
                    
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form onSubmit={handleSubmit}>

                        {isRegister && (
                            <Form.Group className="mb-3" controlId="formUsername">
                                <Form.Label>Username</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Your Name"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </Form.Group>
                        )}

                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="test@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Form.Group>
                        
                        <Form.Group className="mb-4" controlId="formPassword">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </Form.Group>
                        
                        <div className="d-grid gap-2 mb-3">
                            <Button
                                variant="success"
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Processing...' : isRegister ? 'Sign Up' : 'Sign In'}
                            </Button>
                        </div>

                        <div className="text-center">
                            <Button
                                variant="link"
                                onClick={() => navigate(isRegister ? '/login' : '/register')}
                            >
                                {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default LoginPage;