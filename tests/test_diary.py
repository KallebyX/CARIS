import os
import pytest
from flask import url_for
from flask_login import current_user, login_user

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
        
        # Get cycles
        criar_cycle = Cycle.query.filter_by(slug='criar').first()
        
        # Create a test diary entry
        test_entry = DiaryEntry(
            user_id=1,  # Will be the ID of test_user
            cycle_id=criar_cycle.id,
            emotion='Inspiração',
            content='Entrada de teste para verificar funcionalidade do diário.'
        )
        db.session.add(test_entry)
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
def auth_client(client, app):
    """A test client with authenticated user."""
    with app.test_request_context():
        with client.session_transaction() as session:
            # Log in the user
            client.post(
                '/auth/login',
                data={
                    'username': 'test_user',
                    'password': 'password123',
                    'remember_me': False
                },
                follow_redirects=True
            )
    return client

def test_diary_pages_require_login(client):
    """Test that diary pages require authentication."""
    # Test new entry page
    response = client.get('/diary/new', follow_redirects=True)
    assert response.status_code == 200
    assert b'Por favor, fa\xc3\xa7a login' in response.data
    
    # Test view entries page
    response = client.get('/diary/entries', follow_redirects=True)
    assert response.status_code == 200
    assert b'Por favor, fa\xc3\xa7a login' in response.data

def test_create_diary_entry(auth_client, app):
    """Test creating a new diary entry."""
    with app.app_context():
        criar_cycle = Cycle.query.filter_by(slug='criar').first()
        
        # Create a new diary entry
        response = auth_client.post(
            '/diary/new',
            data={
                'cycle': criar_cycle.id,
                'emotion': 'Alegria',
                'content': 'Esta é uma entrada de teste criada durante os testes automatizados.',
                'submit': 'Salvar'
            },
            follow_redirects=True
        )
        
        # Check that entry was created successfully
        assert response.status_code == 200
        assert b'Sua reflex\xc3\xa3o foi registrada com sucesso' in response.data
        
        # Verify entry was added to database
        user = User.query.filter_by(username='test_user').first()
        entry = DiaryEntry.query.filter_by(
            user_id=user.id,
            emotion='Alegria',
            content='Esta é uma entrada de teste criada durante os testes automatizados.'
        ).first()
        
        assert entry is not None
        assert entry.cycle_id == criar_cycle.id

def test_view_entries(auth_client, app):
    """Test viewing diary entries."""
    # View entries page
    response = auth_client.get('/diary/entries')
    assert response.status_code == 200
    
    # Should contain the test entry
    assert b'Entrada de teste para verificar funcionalidade do di\xc3\xa1rio' in response.data
    
    # Should show the cycle name
    with app.app_context():
        criar_cycle = Cycle.query.filter_by(slug='criar').first()
        assert criar_cycle.name.encode() in response.data
