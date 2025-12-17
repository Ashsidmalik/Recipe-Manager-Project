// C:\frontend\src\components\Navbar.jsx

import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap'; 
import { useAuth } from '../context/AuthContext'; 

const AppNavbar = () => {
    const { isAuthenticated, logout } = useAuth();

    return (
        <Navbar bg="light" expand="lg" className="shadow-sm">
            <Container>
                <Navbar.Brand href="/">Chef's Notebook</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <LinkContainer to="/">
                            <Nav.Link>Home</Nav.Link>
                        </LinkContainer>
                        {isAuthenticated && (
                            <> 
                                <LinkContainer to="/recipes">
                                    <Nav.Link>My Recipes</Nav.Link>
                                </LinkContainer>
                                
                                {/* --- NEW LINK FOR INGREDIENT MANAGEMENT --- */}
                                <LinkContainer to="/ingredients"> 
                                    <Nav.Link>My Ingredients</Nav.Link>
                                </LinkContainer>
                                {/* --------------------------------------------- */}
                            </>
                        )}
                    </Nav>
                    <Nav>
                        {isAuthenticated ? (
                            <Button variant="outline-danger" onClick={logout}>
                                Logout
                            </Button>
                        ) : (
                            <>
                                <LinkContainer to="/login">
                                    <Button variant="outline-success" className="me-2">Login</Button>
                                </LinkContainer>
                                <LinkContainer to="/register">
                                    <Button variant="success">Register</Button>
                                </LinkContainer>
                            </>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default AppNavbar;