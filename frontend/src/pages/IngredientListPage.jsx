// C:\frontend\src\pages\IngredientListPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Table, Spinner, Alert, Modal, Form, InputGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const IngredientListPage = () => {
    const { apiClient, isAuthenticated } = useAuth();
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State for the Modal Form
    const [showModal, setShowModal] = useState(false);
    const [currentIngredient, setCurrentIngredient] = useState(null); // null for create, object for edit
    const [formName, setFormName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);


    // --- READ OPERATION: Fetch all ingredients ---
    const fetchIngredients = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Calls the FastAPI endpoint: GET /ingredients/
            const data = await apiClient('/ingredients/');
            setIngredients(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) {
            console.error("Failed to fetch ingredients:", err);
            setError("Failed to load ingredients list.");
        } finally {
            setLoading(false);
        }
    }, [apiClient, isAuthenticated]);

    useEffect(() => {
        fetchIngredients();
    }, [fetchIngredients]);


    // --- MODAL HANDLERS ---
    
    // Open modal for CREATION
    const handleCreateClick = () => {
        setCurrentIngredient(null);
        setFormName('');
        setShowModal(true);
    };

    // Open modal for EDITING
    const handleEditClick = (ingredient) => {
        setCurrentIngredient(ingredient);
        setFormName(ingredient.name);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentIngredient(null);
        setFormName('');
        setError(null);
    };


    // --- CREATE/UPDATE OPERATION ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!formName.trim()) {
            setError("Ingredient name cannot be empty.");
            return;
        }

        const isEdit = !!currentIngredient;
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `/ingredients/${currentIngredient.id}` : '/ingredients/';
        
        // Note: We are using a PUT endpoint here, which is common for updating master lists.
        // You may need to create or verify this PUT /ingredients/{id} endpoint in your main.py/crud.py.
        // If you haven't, only the POST (create) functionality will work initially.
        
        setIsSubmitting(true);
        try {
            const payload = { name: formName.trim() };
            const savedIngredient = await apiClient(url, method, payload);
            
            // Update the local state list
            if (isEdit) {
                setIngredients(ingredients.map(ing => 
                    ing.id === savedIngredient.id ? savedIngredient : ing
                ));
            } else {
                setIngredients([...ingredients, savedIngredient]);
            }
            
            handleCloseModal();
        } catch (err) {
            const msg = err.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} ingredient.`;
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };


    // --- DELETE OPERATION ---
    const handleDelete = async (ingredientId) => {
        if (!window.confirm("WARNING: Deleting an ingredient will break any recipes that currently use it. Are you sure?")) {
            return;
        }
        
        try {
            // Calls the FastAPI endpoint: DELETE /ingredients/{ingredient_id}
            await apiClient(`/ingredients/${ingredientId}`, 'DELETE');
            // Optimistically remove from local state
            setIngredients(ingredients.filter(i => i.id !== ingredientId));
        } catch (err) {
            console.error("Failed to delete ingredient:", err);
            setError("Failed to delete ingredient. It may be in use by a recipe.");
        }
    };


    // --- RENDER LOGIC ---
    
    if (!isAuthenticated) {
        return <Alert variant="warning" className="mt-5">Please log in to manage ingredients.</Alert>;
    }
    
    if (loading) {
        return <Container className="text-center mt-5"><Spinner animation="border" variant="success" /><p>Loading ingredients...</p></Container>;
    }

    return (
        <Container className="mt-4">
            <Row className="mb-4 align-items-center">
                <Col>
                    <h2>Master Ingredient List ({ingredients.length})</h2>
                    <p className="text-muted">Manage all unique ingredients used across your recipes.</p>
                </Col>
                <Col className="text-end">
                    <Button variant="success" onClick={handleCreateClick}>
                        <i className="bi bi-plus-circle me-2"></i> Add New Ingredient
                    </Button>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {ingredients.length === 0 ? (
                <Alert variant="info" className="text-center">
                    The master ingredient list is empty! Add your first ingredient.
                </Alert>
            ) : (
                <Table striped bordered hover responsive className="shadow-sm">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Ingredient Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ingredients.map((ingredient) => (
                            <tr key={ingredient.id}>
                                <td>{ingredient.id}</td>
                                <td>{ingredient.name}</td>
                                <td>
                                    <Button variant="info" size="sm" className="me-2" onClick={() => handleEditClick(ingredient)}>
                                        Edit
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(ingredient.id)}>
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {/* --- Ingredient Create/Edit Modal --- */}
            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{currentIngredient ? 'Edit Ingredient' : 'Create New Ingredient'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Ingredient Name</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="e.g., Saffron, Balsamic Vinegar"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </InputGroup>
                        </Form.Group>
                        <Button 
                            variant="success" 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-100"
                        >
                            {isSubmitting ? 'Saving...' : (currentIngredient ? 'Save Changes' : 'Create Ingredient')}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default IngredientListPage;