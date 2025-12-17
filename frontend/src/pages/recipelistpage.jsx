// C:\frontend\src\pages\RecipeListPage.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Container, Row, Col, Button, Table, Spinner, Alert } from 'react-bootstrap';
import RecipeForm from '../components/RecipeForm.jsx'; // <--- Note the explicit .jsx extension!

const RecipeListPage = () => {
    const { apiClient, isAuthenticated } = useAuth();
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState(null); // Null for Create, object for Edit

    // --- READ OPERATION: Fetch all recipes for the user ---
    const fetchRecipes = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Calls the FastAPI endpoint: GET /recipes/
            const data = await apiClient('/recipes/');
            setRecipes(data);
        } catch (err) {
            console.error("Failed to fetch recipes:", err);
            setError("Failed to load recipes. Please check the backend connection and token.");
        } finally {
            setLoading(false);
        }
    }, [apiClient, isAuthenticated]); 

    useEffect(() => {
        fetchRecipes();
    }, [fetchRecipes]);

    // --- HANDLERS ---
    
    // Called when RecipeForm successfully creates or updates a recipe
    const handleSave = () => {
    setShowForm(false);
    setEditingRecipe(null);
    fetchRecipes(); // Refresh the list to show the new/updated recipe
};

// --- CORRECTED HANDLER ---
// Starts the Edit process by fetching the full, detailed recipe data
const handleEdit = async (recipeSummary) => {
    setError(null);
    try {
        // 1. Show loading/disable actions temporarily
        setLoading(true);
        
        // 2. CRITICAL STEP: Call the detail endpoint (GET /recipes/{id})
        // This endpoint returns the recipe WITH the full ingredients array.
        const fullRecipeData = await apiClient(`/recipes/${recipeSummary.id}`);
        
        // 3. Set the state to show the form with the complete data
        setEditingRecipe(fullRecipeData); 
        setShowForm(true);
        
    } catch (err) {
        console.error("Failed to fetch full recipe details for editing:", err);
        setError("Failed to load recipe details for editing. Check permissions.");
    } finally {
        setLoading(false); // Stop loading regardless of success/fail
    }
};
    // --- DELETE OPERATION ---
    const handleDelete = async (recipeId) => {
        if (!window.confirm("Are you sure you want to delete this recipe? This action is irreversible.")) {
            return;
        }
        try {
            // Calls the FastAPI endpoint: DELETE /recipes/{recipe_id}
            await apiClient(`/recipes/${recipeId}`, 'DELETE');
            // Optimistically remove the recipe from the local state list
            setRecipes(recipes.filter(r => r.id !== recipeId));
        } catch (err) {
            console.error("Failed to delete recipe:", err);
            setError("Failed to delete recipe.");
        }
    };

    // --- RENDER LOGIC ---

    if (loading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="success" />
                <p>Loading recipes...</p>
            </Container>
        );
    }

    if (error) {
        return <Alert variant="danger" className="mt-5">{error}</Alert>;
    }

    // Conditional rendering: Show the form if we are creating or editing
    if (showForm) {
        return <RecipeForm 
            recipe={editingRecipe} 
            onSave={handleSave} 
            onCancel={() => { setShowForm(false); setEditingRecipe(null); }}
        />;
    }

    // Default view: Recipe List
    return (
        <Container className="mt-4">
            <Row className="mb-4 align-items-center">
                <Col>
                    <h2>My Recipes ({recipes.length})</h2>
                </Col>
                <Col className="text-end">
                    <Button variant="success" onClick={() => { setEditingRecipe(null); setShowForm(true); }}>
                        <i className="bi bi-plus-circle me-2"></i> Add New Recipe
                    </Button>
                </Col>
            </Row>

            {recipes.length === 0 ? (
                <Alert variant="info" className="text-center">
                    You haven't created any recipes yet! Click "Add New Recipe" to start.
                </Alert>
            ) : (
                <Table striped bordered hover responsive className="shadow-sm">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Title</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recipes.map((recipe) => (
                            <tr key={recipe.id}>
                                <td>{recipe.id}</td>
                                <td>{recipe.title}</td>
                                <td>{recipe.description}</td>
                                <td>
                                    <Button variant="info" size="sm" className="me-2" onClick={() => handleEdit(recipe)}>
                                        Edit
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(recipe.id)}>
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </Container>
    );
};

export default RecipeListPage;