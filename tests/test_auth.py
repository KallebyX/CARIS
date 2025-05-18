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
        
        # Create test user
        test_user = User(
            username='test_user',
            email='test@example.com',
            password='password123'
        )
        db.session.add(test_user)
        db.session.commit()
    
    yield app
    
    # Clean up
    with app.app_context():
        db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """A test CLI runner for the app."""
    return app.test_cli_runner()

def test_auth_pages(client):
    """Test that authentication pages load correctly."""
    # Test login page
    response = client.get('/auth/login')
    assert response.status_code == 200
    assert b'Entrar' in response.data
    
    # Test register page
    response = client.get('/auth/register')
    assert response.status_code == 200
    assert b'Criar Conta' in response.data

def test_user_registration(client, app):
    """Test user registration functionality."""
    # Register a new user
    response = client.post(
        '/auth/register',
        data={
            'username': 'new_user',
            'email': 'new@example.com',
            'password': 'securepass',
            'password2': 'securepass'
        },
        follow_redirects=True
    )
    
    # Check that registration was successful
    assert response.status_code == 200
    assert b'Conta criada com sucesso' in response.data
    
    # Verify user was added to database
    with app.app_context():
        user = User.query.filter_by(username='new_user').first()
        assert user is not None
        assert user.email == 'new@example.com'
        assert user.check_password('securepass')
