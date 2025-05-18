import os
import pytest
from flask import url_for

from app import create_app
from models import db, User, Cycle, DiaryEntry

@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    app = create_app('testing')
    
    # Create a temporary database
    with app.app_context():
        db.create_all()
        Cycle.insert_cycles()
    
    yield app
    
    # Clean up
    with app.app_context():
        db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

def test_init_db():
    """Test that the database initializes correctly."""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        Cycle.insert_cycles()
        
        # Check that cycles were created
        cycles = Cycle.query.all()
        assert len(cycles) == 4
        
        # Check cycle names
        cycle_names = [cycle.name for cycle in cycles]
        assert 'Criar' in cycle_names
        assert 'Cuidar' in cycle_names
        assert 'Crescer' in cycle_names
        assert 'Curar' in cycle_names
        
        db.drop_all()
