from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta 
from fastapi.middleware.cors import CORSMiddleware

# Use absolute imports
import models, schemas, crud, security 
from database import get_db
from models import create_db_tables 

# Run this once on startup to ensure tables exist
create_db_tables()

app = FastAPI(title="Recipe Manager API")
origins = [
    "http://localhost:3000", 
    "http://127.0.0.1:3000", 
    "http://localhost", 
    "http://localhost:8080", 
    "http://127.0.0.1:8080", 
    "http://localhost:4200", 
    "http://127.0.0.1:4200", 
    "http://localhost:5173",  # <-- Your current Vite development port
    "http://127.0.0.1:5173",  
]

# Add the middleware to your app
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency: Get the current authenticated user
CurrentUser = Depends(security.get_current_user)

# --- 1. USER AUTHENTICATION MODULE (/auth) ---

@app.post(
    "/auth/register",
    response_model=schemas.User,
    status_code=status.HTTP_201_CREATED,
    tags=["Users & Authentication"]
)
def register_new_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """API 1. Register User: Creates a new user account."""
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    return crud.create_user(db=db, user=user)


@app.post(
    "/auth/login",
    response_model=schemas.Token,
    tags=["Users & Authentication"]
)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """API 2. Login User: Authenticates the user and returns an access token."""
    user = crud.get_user_by_email(db, email=form_data.username)
    
    # Verification includes the password check using the security module
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Calculate token expiration using the imported timedelta
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- 2. RECIPE MODULE (/recipes) ---

@app.post(
    "/recipes/",
    response_model=schemas.Recipe,
    status_code=status.HTTP_201_CREATED,
    tags=["Recipes"]
)
def create_recipe_endpoint(recipe: schemas.RecipeCreate, db: Session = Depends(get_db), current_user: models.User = CurrentUser):
    """API 1. Create Recipe: Creates a new recipe associated with the logged-in user."""
    
    # --- NEW CHECK: PREVENT DUPLICATE RECIPE TITLE ---
    db_recipe = crud.get_recipe_by_title(db, title=recipe.title, user_id=current_user.id)
    if db_recipe:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have a recipe titled '{recipe.title}'."
        )
    return crud.create_recipe(db=db, recipe=recipe, user_id=current_user.id)

@app.get(
    "/recipes/", 
    response_model=List[schemas.Recipe],
    tags=["Recipes"]
)
def list_user_recipes(db: Session = Depends(get_db), current_user: models.User = CurrentUser):
    """API 2. Get All Recipes (By User): Retrieves a list of all recipes created by the logged-in user."""
    recipes = crud.get_user_recipes(db, user_id=current_user.id)
    return recipes

@app.get(
    "/recipes/{recipe_id}", 
    response_model=schemas.Recipe,
    tags=["Recipes"]
)
def get_recipe_by_id(recipe_id: int, db: Session = Depends(get_db), current_user: models.User = CurrentUser):
    """API 3. Get Recipe by ID: Retrieves a specific recipe, including its full list of ingredients."""
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    
    if db_recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
        
    if db_recipe.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You do not own this recipe")
        
    # Manually map the data to ensure ingredient names are included in the response
    response_data = {
        "id": db_recipe.id,
        "title": db_recipe.title,
        "description": db_recipe.description,
        "user_id": db_recipe.user_id,
        # Map recipes_ingredients to ingredients list, pulling the name from the joined link
        "ingredients": [
            {
                "ingredient_id": ri.ingredient_id,
                "quantity": ri.quantity,
                "name": ri.ingredient_link.name 
            }
            for ri in db_recipe.recipes_ingredients
        ]
    }
    return response_data

@app.put(
    "/recipes/{recipe_id}", 
    response_model=schemas.Recipe,
    tags=["Recipes"]
)
def update_recipe_endpoint(recipe_id: int, recipe_in: schemas.RecipeBase, db: Session = Depends(get_db), current_user: models.User = CurrentUser):
    """API 4. Update Recipe: Updates the title and/or description of a recipe."""
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    
    if db_recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
        
    if db_recipe.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You do not own this recipe")
        
    return crud.update_recipe(db=db, db_recipe=db_recipe, recipe_in=recipe_in)


@app.delete(
    "/recipes/{recipe_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Recipes"]
)
def delete_recipe_endpoint(recipe_id: int, db: Session = Depends(get_db), current_user: models.User = CurrentUser):
    """API 5. Delete Recipe: Deletes the recipe and all associated RecipeIngredient records."""
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    
    if db_recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
        
    if db_recipe.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You do not own this recipe")
        
    crud.delete_recipe(db, db_recipe)
    return


# --- 3. INGREDIENT MODULE (/ingredients) ---

@app.post(
    "/ingredients/",
    response_model=schemas.Ingredient,
    status_code=status.HTTP_201_CREATED,
    tags=["Ingredients"]
)
def add_new_ingredient(ingredient: schemas.IngredientCreate, db: Session = Depends(get_db)):
    """API 1. Add Ingredient: Creates a new ingredient in the master list."""
    # Check for case-insensitive duplicate
    db_ingredient = crud.get_ingredient_by_name(db, name=ingredient.name)
    if db_ingredient:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ingredient already exists"
        )
    return crud.create_ingredient(db=db, ingredient=ingredient)

@app.get(
    "/ingredients/",
    response_model=List[schemas.Ingredient],
    tags=["Ingredients"]
)
def list_all_ingredients(db: Session = Depends(get_db), current_user: models.User = CurrentUser): # <--- ADD current_user
    """API 2. Get All Ingredients (User-Filtered): Retrieves the unique ingredients used by the logged-in user's recipes."""
    # CHANGE: Call a new function to get ingredients based on user recipes
    return crud.get_user_linked_ingredients(db, user_id=current_user.id)

# --- 4. RECIPE INGREDIENT MODULE (Nested Routes) ---

@app.post(
    "/recipes/{recipe_id}/ingredients",
    response_model=schemas.RecipeIngredientRead,
    tags=["Recipe Ingredients"]
)
def add_ingredient_to_recipe_endpoint(recipe_id: int, item: schemas.RecipeIngredientCreate, db: Session = Depends(get_db), current_user: models.User = CurrentUser):
    """API 1. Add Ingredient to Recipe: Links an existing ingredient to a recipe and specifies the quantity."""
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)

    # 1. Check Recipe existence
    if db_recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")

    # 2. Check ownership
    if db_recipe.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You do not own this recipe")
    
    # 3. CRITICAL FIX: Check if the Ingredient exists in the master list
    db_ingredient = crud.get_ingredient_by_id(db, item.ingredient_id)
    if db_ingredient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ingredient ID {item.ingredient_id} not found in master list.")
        
    # 4. Check for conflict (duplicate ingredient in recipe)
    db_link = crud.get_recipe_ingredient_link(db, recipe_id, item.ingredient_id)
    if db_link:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ingredient already exists in this recipe. Use PUT to update quantity.")

    # 5. Create the link (crud.py handles setting the recipe_id, ingredient_id, and quantity)
    db_link = crud.add_ingredient_to_recipe(db, recipe_id, item)
    
    # 6. Manually map to RecipeIngredientRead for the response
    return {
        "recipe_id": db_link.recipe_id, 
        "ingredient_id": db_link.ingredient_id,
        "quantity": db_link.quantity,
        # Use the name fetched in step 3
        "name": db_ingredient.name 
    }


@app.delete(
    "/recipes/{recipe_id}/ingredients/{ingredient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Recipe Ingredients"]
)
def remove_ingredient_from_recipe_endpoint(recipe_id: int, ingredient_id: int, db: Session = Depends(get_db), current_user: models.User = CurrentUser):
    """API 2. Remove Ingredient From Recipe: Removes a specific ingredient link from a recipe."""
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    
    # 1. Check Recipe existence and ownership
    if db_recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    if db_recipe.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You do not own this recipe")
        
    # 2. Check link existence
    db_link = crud.get_recipe_ingredient_link(db, recipe_id, ingredient_id)
    if db_link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient link not found in recipe")

    # 3. Delete the link
    crud.remove_ingredient_from_recipe(db, db_link)
    return