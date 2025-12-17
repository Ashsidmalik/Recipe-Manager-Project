// C:\frontend\src\App.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import AppNavbar from './components/Navbar';
import LoginPage from './pages/loginpage';
import RecipeListPage from './pages/recipelistpage';
import IngredientListPage from './pages/IngredientListPage.jsx'; 
import RequireAuth from "./components/RequireAuth"; 
import { Container, Row, Col, Spinner, Alert } from 'react-bootstrap'; // Removed Button import
import { useAuth } from './context/AuthContext'; 

// --- CRITICAL FIX: IMPORT THE RECIPE FORM PAGE ---
import RecipeFormPage from './pages/recipeformpage.jsx'; 

function App() {
    // --- 1. HOME PAGE LOGIC (Defined inside App) ---
    const { isAuthenticated, user, apiClient, isLoading } = useAuth();
    const navigate = useNavigate(); // Kept for other routes/use cases
    
    const [recipeCount, setRecipeCount] = useState(null);
    const [ingredientCount, setIngredientCount] = useState(null); 
    const [loadingCount, setLoadingCount] = useState(isAuthenticated && !isLoading);
    const [homeError, setHomeError] = useState(null);

    const fetchCounts = useCallback(async () => {
        if (!isAuthenticated) {
            setLoadingCount(false);
            return;
        }
        try {
            const [recipes, ingredients] = await Promise.all([
                apiClient('/recipes/'),
                apiClient('/ingredients/')
            ]);
            setRecipeCount(recipes.length);
            setIngredientCount(ingredients.length);
        } catch (err) {
            setHomeError("Could not load full kitchen summary.");
        } finally {
            setLoadingCount(false);
        }
    }, [apiClient, isAuthenticated]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    // Parse user name
    let welcomeName = null;
    if (isAuthenticated && user && user.email) {
        const namePart = user.email.split('@')[0];
        welcomeName = namePart.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    }
    
    // --- 2. HOME PAGE COMPONENT ---
    const HomePageContent = () => {
        const mainTitle = welcomeName ? `Hey there, ${welcomeName}!` : "Welcome to Chef's Notebook!";
        
        let motivationMessage;
        // NOTE: ctaText, ctaVariant, and handleCtaClick are now unused but logic is kept to define motivationMessage
        
        if (loadingCount || isLoading) {
            motivationMessage = "Checking your spice rack inventory...";
        } else if (ingredientCount === 0) {
            motivationMessage = "Uh oh! You can't cook a five-star meal with air. Let's get some ingredients!";
        } else if (recipeCount > 0) {
            motivationMessage = `You have ${recipeCount} recipes and ${ingredientCount} ingredients. What gourmet mischief are we making today?`;
        } else {
            motivationMessage = `Welcome to your new digital kitchen! You have ${ingredientCount} items in your pantry.`;
        }
        
        // --- handleCtaClick function removed entirely ---

        const heroStyle = {
            backgroundColor: '#fff9e6', 
            padding: '6rem 0',
            borderRadius: '15px',
            boxShadow: '0 8px 16px rgba(255, 192, 203, 0.5)', 
            textAlign: 'center',
            marginTop: '3rem',
        };
        
        return (
            <div style={heroStyle}>
                <Row className="justify-content-center">
                    <Col md={10} lg={8}>
                        <h1 className="display-4 text-warning mb-3" style={{ fontWeight: 600 }}>
                            🍳 {mainTitle} 🍪
                        </h1>

                        <p className="lead text-secondary mb-5">
                            {motivationMessage}
                        </p>
                        
                        {homeError && <Alert variant="warning" className="mb-4">{homeError}</Alert>}

                        {/* --- THE ENTIRE CALL-TO-ACTION BLOCK IS REMOVED HERE --- */}
                        {/* <div className="d-grid gap-3 col-md-6 mx-auto">...</div> */}
                        
                        <p className="mt-5 text-muted small">
                            (Psst! All your ingredients and recipes are saved securely under your tabs.)
                        </p>
                    </Col>
                </Row>
            </div>
        );
    };

    // --- 3. MAIN APP RETURN (Routes) ---
    return (
        <>
            <AppNavbar /> 
            <Container className="mt-4"> 
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePageContent />} /> 
                    
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<LoginPage isRegister={true} />} />
                    <Route path="/ingredients" element={<IngredientListPage />} />
                    
                    {/* Protected Routes */}
                    <Route 
                        path="/recipes" 
                        element={
                            <RequireAuth>
                                <RecipeListPage /> 
                            </RequireAuth>
                        } 
                    />
                    
                    {/* Recipe Creation Route */}
                    <Route 
                        path="/recipes/create" 
                        element={
                            <RequireAuth>
                                <RecipeFormPage />
                            </RequireAuth>
                        } 
                    />

                    {/* Recipe Editing Route */}
                    <Route 
                        path="/recipes/edit/:id" 
                        element={
                            <RequireAuth>
                                <RecipeFormPage /> 
                            </RequireAuth>
                        } 
                    />

                </Routes>
            </Container>
        </>
    );
}

export default App;