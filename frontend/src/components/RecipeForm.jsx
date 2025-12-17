// C:\frontend\src\components\RecipeForm.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Form, Button, Card, Container, Alert, Row, Col, ListGroup, InputGroup, Spinner } from 'react-bootstrap';

const RecipeForm = ({ recipe, onSave, onCancel }) => {
    const { apiClient } = useAuth();
    const isEditMode = !!recipe; 
    
    // 1. Recipe State (Title/Description)
    const [title, setTitle] = useState(recipe ? recipe.title : '');
    const [description, setDescription] = useState(recipe ? recipe.description : '');
    
    // 2. Ingredients State (For the M:M relationship)
    const [linkedIngredients, setLinkedIngredients] = useState(recipe ? recipe.ingredients || [] : []);
    const [masterIngredients, setMasterIngredients] = useState([]);

    // 3. Form Control State
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [loadingIngredients, setLoadingIngredients] = useState(true);

    // New Ingredient Link State (For the dropdown/quantity)
    const [newIngredientId, setNewIngredientId] = useState('');
    const [newQuantity, setNewQuantity] = useState('');
    
    // --- NEW STATE: For creating a brand new ingredient ---
    const [newIngredientName, setNewIngredientName] = useState(''); 
    
    
    // --- STEP A: Fetch Global Ingredients on Load ---
    const fetchMasterIngredients = useCallback(async () => {
        try {
            const data = await apiClient('/ingredients/'); 
            setMasterIngredients(data);
        } catch (err) {
            console.error("Failed to fetch master ingredients:", err);
            setError("Could not load global ingredient list.");
        } finally {
            setLoadingIngredients(false);
        }
    }, [apiClient]);

    useEffect(() => {
        fetchMasterIngredients();
    }, [fetchMasterIngredients]);


    // --- STEP B: Handle Recipe Save (Title/Description) ---
    const handleRecipeSave = async () => {
        const method = isEditMode ? 'PUT' : 'POST';
        const url = isEditMode ? `/recipes/${recipe.id}` : '/recipes/';
        const recipeData = { title, description };

        try {
            const savedRecipe = await apiClient(url, method, recipeData);
            return savedRecipe; // Return the saved recipe object (needed for new recipes)
        } catch (err) {
            const errorMessage = err.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} recipe details.`;
            setError(errorMessage);
            throw err; // Propagate error
        }
    };
    
    // --- STEP C: Ingredient Link Handlers ---

    // Adds or links an existing ingredient to the current recipe
    const handleAddIngredient = async (e) => {
        e.preventDefault();

        if (!newIngredientId || !newQuantity) {
            setError("Please select an ingredient and enter a quantity.");
            return;
        }

        const ingredientId = parseInt(newIngredientId);
        
        // 1. Check for duplicate ingredient in the current list
        if (linkedIngredients.some(item => item.ingredient_id === ingredientId)) {
            setError("This ingredient is already added. Use the edit feature to change quantity.");
            return;
        }
        
        let targetRecipeId = recipe?.id;

        try {
            setSubmitting(true);
            setError(null);

            // A. If creating a NEW recipe, save the title/description first
            if (!isEditMode) {
                const newRecipe = await handleRecipeSave(); // Save details first
                targetRecipeId = newRecipe.id;
                // Update component state to reflect we are now editing
                // NOTE: This assumes 'recipe' is not a state variable, but a mutable prop for internal use
                recipe.id = newRecipe.id; 
                recipe.title = newRecipe.title;
                recipe.description = newRecipe.description;
            }

            // B. Link the ingredient using the targetRecipeId
            const linkData = { ingredient_id: ingredientId, quantity: newQuantity };
            // Calls the FastAPI endpoint: POST /recipes/{recipe_id}/ingredients
            const savedLink = await apiClient(`/recipes/${targetRecipeId}/ingredients`, 'POST', linkData);

            // C. Update the local state with the new linked ingredient
            setLinkedIngredients(prev => [...prev, savedLink]);

            // D. Clear input fields for the next ingredient
            setNewIngredientId('');
            setNewQuantity('');

        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to add ingredient.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Removes an ingredient link from the current recipe
    const handleRemoveIngredient = async (ingredientId) => {
        if (!isEditMode || !recipe.id) return;

        try {
            setSubmitting(true);
            setError(null);
            
            // Calls the FastAPI endpoint: DELETE /recipes/{recipe_id}/ingredients/{ingredient_id}
            await apiClient(`/recipes/${recipe.id}/ingredients/${ingredientId}`, 'DELETE');
            
            // Update the local state
            setLinkedIngredients(linkedIngredients.filter(item => item.ingredient_id !== ingredientId));
            
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to remove ingredient.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };


    // --- NEW STEP D: Handle New Ingredient Creation ---
    const handleCreateNewIngredient = async (e) => {
        e.preventDefault();
        if (!newIngredientName.trim()) {
            setError("Please enter a name for the new ingredient.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            // Calls the FastAPI endpoint: POST /ingredients/
            const newIngredient = await apiClient('/ingredients/', 'POST', { name: newIngredientName.trim() });
            
            // 1. Add the newly created ingredient to the master list
            setMasterIngredients(prev => [...prev, newIngredient]);

            // 2. Automatically select the new ingredient in the dropdown
            // This prepares the ingredient to be added to the recipe using handleAddIngredient
            setNewIngredientId(newIngredient.id.toString()); 

            // 3. Clear the new ingredient name field
            setNewIngredientName('');
            
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to create new ingredient.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };
    
    // --- FINAL SUBMIT: Handled by Save button, only saves the main recipe details ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Save the final recipe details (Title/Description)
            const savedRecipe = await handleRecipeSave();
            
            // If creation succeeded, we call onSave. The ingredients are already saved by handleAddIngredient
            onSave(savedRecipe); 

        } catch (err) {
            // Error already set by handleRecipeSave
        } finally {
            setSubmitting(false);
        }
    };
    
    // --- RENDER ---
    
    if (loadingIngredients) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="primary" />
                <p>Loading ingredients...</p>
            </Container>
        );
    }
    
    return (
        <Container className="mt-5">
            <Card className="shadow-lg p-4">
                <Card.Title className="text-center mb-4">
                    {isEditMode ? `Edit Recipe: ${title}` : 'Create New Recipe'}
                </Card.Title>
                
                {error && <Alert variant="danger">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                    
                    {/* --- 1. RECIPE DETAILS --- */}
                    <h5 className='mb-3 text-success'>Recipe Details</h5>
                    <Form.Group className="mb-3" controlId="formTitle">
                        <Form.Label>Title</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="e.g., Classic Spaghetti Carbonara"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-4" controlId="formDescription">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="A brief summary of the recipe..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </Form.Group>

                    <hr />

                    {/* --- 2. INGREDIENT MANAGEMENT --- */}
                    <h5 className='mb-3 text-success'>Ingredients List</h5>
                    
                    {/* A. Current Linked Ingredients */}
                    <ListGroup className="mb-3">
                        {linkedIngredients.length === 0 ? (
                            <ListGroup.Item variant="light">
                                No ingredients added yet.
                            </ListGroup.Item>
                        ) : (
                            linkedIngredients.map(item => (
                                <ListGroup.Item key={item.ingredient_id} className="d-flex justify-content-between align-items-center">
                                    {item.quantity} of **{item.name || masterIngredients.find(m => m.id === item.ingredient_id)?.name}**
                                    <Button 
                                        variant="outline-danger" 
                                        size="sm" 
                                        onClick={() => handleRemoveIngredient(item.ingredient_id)}
                                        disabled={submitting || !isEditMode}
                                    >
                                        Remove
                                    </Button>
                                </ListGroup.Item>
                            ))
                        )}
                    </ListGroup>
                    
                    {/* B. Add Existing Ingredient Inputs */}
                    <Form.Label>Select Existing Ingredient</Form.Label>
                    <Row className="mb-4">
                        <Col xs={8}>
                            <Form.Select
                                value={newIngredientId}
                                onChange={(e) => setNewIngredientId(e.target.value)}
                                disabled={submitting}
                            >
                                <option value="">Select Ingredient</option>
                                {masterIngredients.map(ing => (
                                    <option key={ing.id} value={ing.id}>
                                        {ing.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col xs={4}>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="Quantity (e.g., 2 cups)"
                                    value={newQuantity}
                                    onChange={(e) => setNewQuantity(e.target.value)}
                                    disabled={submitting}
                                />
                                <Button 
                                    variant="primary" 
                                    onClick={handleAddIngredient}
                                    disabled={submitting || !newIngredientId || !newQuantity}
                                >
                                    Add
                                </Button>
                            </InputGroup>
                        </Col>
                    </Row>
                    
                    {/* C. NEW: Create New Ingredient Inputs */}
                    <h6 className='mt-2 mb-2'>Or, Create a New Ingredient:</h6>
                    <InputGroup className="mb-4">
                        <Form.Control
                            type="text"
                            placeholder="e.g., Truffle Oil"
                            value={newIngredientName}
                            onChange={(e) => setNewIngredientName(e.target.value)}
                            disabled={submitting}
                        />
                        <Button 
                            variant="outline-secondary" 
                            onClick={handleCreateNewIngredient}
                            disabled={submitting || !newIngredientName.trim()}
                        >
                            Create & Select
                        </Button>
                    </InputGroup>


                    <Alert variant="info" className="small">
                        **Tip:** When you click **"Create & Select"**, the new ingredient is added to the master list and automatically selected in the dropdown above. You must then enter the quantity and click **"Add"** to link it to the recipe.
                    </Alert>

                    <hr />

                    {/* --- 3. SUBMIT BUTTONS --- */}
                    <div className="d-flex justify-content-end">
                        <Button variant="secondary" onClick={onCancel} className="me-2" disabled={submitting}>
                            Cancel
                        </Button>
                        <Button
                            variant="success"
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : (isEditMode ? 'Save Recipe Details' : 'Create Recipe')}
                        </Button>
                    </div>
                </Form> 
            </Card>
        </Container>
    );
};

export default RecipeForm;