# models.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import List, Optional

# FIX: Use absolute import
from database import Base, engine 

# ----------------- USER Model -----------------

class User(Base):
    __tablename__ = "users" # Corrected double underscore
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    
    recipes: Mapped[List["Recipe"]] = relationship(back_populates="owner")

# ----------------- RECIPE Model -----------------

class Recipe(Base):
    __tablename__ = "recipes" # Corrected double underscore
    
    # FIX: Corrected indentation for all attributes
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Foreign Key to USERS table
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    
    # Relationship to User (Recipe belongs to one User)
    owner: Mapped["User"] = relationship(back_populates="recipes")
    
    # Relationship to RecipeIngredient (Recipe has many RecipeIngredients)
    recipes_ingredients: Mapped[List["RecipeIngredient"]] = relationship(back_populates="recipe_link", cascade="all, delete-orphan")


# ----------------- INGREDIENT Model (Master List) -----------------

class Ingredient(Base):
    __tablename__ = "ingredients" # Corrected double underscore
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    
    recipes_links: Mapped[List["RecipeIngredient"]] = relationship(back_populates="ingredient_link")


# ----------------- RECIPE_INGREDIENT Model (Junction Table) -----------------

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients" # Corrected double underscore
    
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id"), primary_key=True)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"), primary_key=True)
    
    quantity: Mapped[str] = mapped_column(String(50), nullable=False)
    
    recipe_link: Mapped["Recipe"] = relationship(back_populates="recipes_ingredients")
    ingredient_link: Mapped["Ingredient"] = relationship(back_populates="recipes_links")


def create_db_tables():
    print("Attempting to create database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created (if they did not exist).")