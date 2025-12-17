# schemas.py
from __future__ import annotations # MUST be the first line

from pydantic import BaseModel, ConfigDict
from typing import Optional, List

# ----------------- TOKEN & AUTH -----------------

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class Login(BaseModel):
    email: str
    password: str
    
class TokenData(BaseModel):
    email: Optional[str] = None

# ----------------- INGREDIENT -----------------

class IngredientBase(BaseModel):
    name: str

class IngredientCreate(IngredientBase):
    pass

class Ingredient(IngredientBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# ----------------- RECIPE_INGREDIENT (Junction Schema) -----------------

class RecipeIngredientBase(BaseModel):
    ingredient_id: int
    quantity: str # e.g., "2 cups"

class RecipeIngredientCreate(RecipeIngredientBase):
    pass

class RecipeIngredientRead(RecipeIngredientBase):
    name: str # Ingredient name pulled from the related Ingredient model
    model_config = ConfigDict(from_attributes=True)


# ----------------- RECIPE -----------------

class RecipeBase(BaseModel):
    title: str
    description: Optional[str] = None
    
class RecipeCreate(RecipeBase):
    # This list is only used for the POST endpoint's input, but defined here to be available.
    ingredients: List[RecipeIngredientCreate] = [] 

class Recipe(RecipeBase):
    id: int
    user_id: int
    # For response, we use RecipeIngredientRead, which has the Ingredient name
    ingredients: List[RecipeIngredientRead] = []
    
    model_config = ConfigDict(from_attributes=True)
    
# ----------------- USER -----------------

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str # Used for request input only

class User(UserBase):
    id: int
    recipes: List[Recipe] = [] 
    model_config = ConfigDict(from_attributes=True)