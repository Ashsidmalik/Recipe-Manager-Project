# crud.py
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional

import models, schemas 
import security

# --- USER CRUD (UNCHANGED) ---

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# --- INGREDIENT CRUD ---

def get_ingredient_by_id(db: Session, ingredient_id: int) -> Optional[models.Ingredient]:
    """CRITICAL FIX: This function is required by main.py's manual response mapping."""
    return db.query(models.Ingredient).filter(models.Ingredient.id == ingredient_id).first()
    
def get_ingredient_by_name(db: Session, name: str) -> Optional[models.Ingredient]:
    return db.query(models.Ingredient).filter(models.Ingredient.name.ilike(name)).first()

def create_ingredient(db: Session, ingredient: schemas.IngredientCreate) -> models.Ingredient:
    db_ingredient = models.Ingredient(name=ingredient.name)
    db.add(db_ingredient)
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient

def get_ingredients(db: Session) -> List[models.Ingredient]:
    return db.query(models.Ingredient).all()

# --- RECIPE CRUD ---
def get_recipe_by_title(db: Session, title: str, user_id: int) -> Optional[models.Recipe]:
    """Checks if a recipe title already exists for a specific user (case-insensitive)."""
    # NOTE: You should filter by user_id if recipes are user-specific
    return db.query(models.Recipe).filter(
        models.Recipe.title.ilike(title),
        models.Recipe.user_id == user_id
    ).first()

def get_recipe(db: Session, recipe_id: int) -> Optional[models.Recipe]:
    """Retrieves a single recipe with all nested ingredient details."""
    return db.query(models.Recipe).options(
        selectinload(models.Recipe.recipes_ingredients).selectinload(models.RecipeIngredient.ingredient_link)
    ).filter(models.Recipe.id == recipe_id).first()

    
def get_user_recipes(db: Session, user_id: int) -> List[models.Recipe]:
    """Retrieves all recipes owned by a specific user."""
    return db.query(models.Recipe).options(
        selectinload(models.Recipe.recipes_ingredients).selectinload(models.RecipeIngredient.ingredient_link)
    ).filter(models.Recipe.user_id == user_id).all()

def create_recipe(db: Session, recipe: schemas.RecipeCreate, user_id: int) -> models.Recipe:
    """Creates a new Recipe record."""
    db_recipe = models.Recipe(
        title=recipe.title,
        description=recipe.description,
        user_id=user_id,
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

def update_recipe(db: Session, db_recipe: models.Recipe, recipe_in: schemas.RecipeBase) -> models.Recipe:
    """Updates an existing Recipe's title and/or description."""
    if recipe_in.title is not None:
        db_recipe.title = recipe_in.title
    if recipe_in.description is not None:
        db_recipe.description = recipe_in.description
        
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

def delete_recipe(db: Session, db_recipe: models.Recipe):
    db.delete(db_recipe)
    db.commit()

# --- RECIPE_INGREDIENT CRUD ---

def get_recipe_ingredient_link(db: Session, recipe_id: int, ingredient_id: int) -> Optional[models.RecipeIngredient]:
    return db.query(models.RecipeIngredient).filter(
        models.RecipeIngredient.recipe_id == recipe_id,
        models.RecipeIngredient.ingredient_id == ingredient_id
    ).first()

def add_ingredient_to_recipe(db: Session, recipe_id: int, item: schemas.RecipeIngredientCreate) -> models.RecipeIngredient:
    db_link = models.RecipeIngredient(
        recipe_id=recipe_id,
        ingredient_id=item.ingredient_id,
        quantity=item.quantity
    )
    db.add(db_link)
    db.commit()
    db.refresh(db_link)
    return db_link

def remove_ingredient_from_recipe(db: Session, db_link: models.RecipeIngredient):
    db.delete(db_link)
    db.commit()
    
def get_user_linked_ingredients(db: Session, user_id: int) -> List[models.Ingredient]:
    """
    Retrieves unique Ingredient models that are linked to any Recipe 
    owned by the given user_id. This effectively generates a 'Pantry' list.
    """
    
    # Perform a JOIN to get the unique Ingredient IDs 
    # that are connected through RecipeIngredient to a Recipe owned by this user.
    ingredients = db.query(models.Ingredient).join(
        models.RecipeIngredient
    ).join(
        models.Recipe
    ).filter(
        models.Recipe.user_id == user_id
    ).distinct().all() 
    
    return ingredients
def delete_master_ingredient(db: Session, db_ingredient: models.Ingredient):
    """Permanently deletes an ingredient from the master list."""
    db.delete(db_ingredient)
    db.commit()