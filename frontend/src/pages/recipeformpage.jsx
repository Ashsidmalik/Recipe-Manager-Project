// C:\frontend\src\pages\recipeformpage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
// Import necessary React Bootstrap components
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap'; 

const RecipeFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading, apiClient } = useAuth();

    const isEdit = !!id;
    // NOTE: This state structure treats 'ingredients' as a single text block,
    // which is the simple form style. This is DIFFERENT from the complex
    // RecipeForm.jsx component we previously worked on.
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        ingredients: '',
        instructions: '',
    });
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetching, setIsFetching] = useState(isEdit);

    // Redirect unauthorized users
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate('/login');
        }
    }, [isLoading, isAuthenticated, navigate]);

    // Fetch recipe data if in EDIT mode (U - Read One)
    useEffect(() => {
        if (isEdit && isAuthenticated) {
            const fetchRecipe = async () => {
                try {
                    const data = await apiClient(`/recipes/${id}`);
                    setFormData(data);
                } catch (err) {
                    setError("Failed to fetch recipe details or you don't have permission.");
                } finally {
                    setIsFetching(false);
                }
            };
            fetchRecipe();
        }
        if (!isEdit) {
            setIsFetching(false);
        }
    }, [id, isEdit, isAuthenticated]);


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `/recipes/${id}` : '/recipes/';

        try {
            await apiClient(url, method, formData);
            navigate('/recipes'); // Navigate to list after success
        } catch (err) {
            setError(isEdit ? "Failed to update recipe. Check backend." : "Failed to create recipe. Check backend.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || (isEdit && isFetching)) {
        return (
             <Container className="text-center mt-5">
                <Spinner animation="border" variant="success" />
                <p className="text-secondary mt-3">Loading Form...</p>
            </Container>
        );
    }

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={8}>
                    {/* Convert the outer div to a Card for a clean look */}
                    <Card className="shadow-lg p-4"> 
                        <Card.Header as="h1" className="text-center border-0 bg-white">
                            {isEdit ? `Edit Recipe: ${formData.title}` : 'Create New Recipe'}
                        </Card.Header>
                        <Card.Body>
                            
                            {error && <Alert variant="danger" className="text-center">{error}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                
                                {/* Title */}
                                <Form.Group className="mb-3" controlId="formTitle">
                                    <Form.Label className="fw-bold">Title</Form.Label>
                                    <Form.Control
                                        name="title"
                                        type="text"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Recipe Name (e.g., Simple Lemon Drizzle Cake)"
                                        required
                                    />
                                </Form.Group>

                                {/* Description */}
                                <Form.Group className="mb-3" controlId="formDescription">
                                    <Form.Label className="fw-bold">Description (Optional)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        name="description"
                                        rows={2}
                                        value={formData.description || ''}
                                        onChange={handleChange}
                                        placeholder="A brief summary of the recipe..."
                                    />
                                </Form.Group>
                                
                                {/* Ingredients (Text Area) */}
                                <Form.Group className="mb-3" controlId="formIngredients">
                                    <Form.Label className="fw-bold">Ingredients (Text Block)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        name="ingredients"
                                        rows={3}
                                        value={formData.ingredients}
                                        onChange={handleChange}
                                        placeholder="e.g., 2 cups flour, 1 tsp baking powder, 1 cup sugar"
                                        required
                                    />
                                    <Form.Text muted>
                                        Note: This simple form saves ingredients as plain text. 
                                        Use the dedicated **Recipe Form** component for ingredient linking.
                                    </Form.Text>
                                </Form.Group>
                                
                                {/* Instructions */}
                                <Form.Group className="mb-4" controlId="formInstructions">
                                    <Form.Label className="fw-bold">Instructions</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        name="instructions"
                                        rows={6}
                                        value={formData.instructions}
                                        onChange={handleChange}
                                        placeholder="Step 1: Preheat oven... Step 2: Mix wet ingredients..."
                                        required
                                    />
                                </Form.Group>
                                
                                {/* Submit Button */}
                                <div className="d-flex justify-content-between align-items-center pt-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() => navigate('/recipes')}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="success" // Using 'success' for primary action consistency
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" /> : ''}
                                        {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish Recipe'}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default RecipeFormPage;