import os
basedir = os.path.abspath(os.path.dirname(__file__))
from datetime import timedelta

class Config:
    """Base configuration for CÁRIS application."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'caris_clareza_existencial_cinematografica')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///' + os.path.join(basedir, 'instance', 'caris.db')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Flask-Login settings
    REMEMBER_COOKIE_DURATION = timedelta(days=14)
    
    # Application settings
    APP_NAME = "CÁRIS"
    APP_TAGLINE = "Clareza existencial em uma experiência cinematográfica"
    
    # Cycles configuration
    CYCLES = {
        'criar': {
            'name': 'Criar',
            'description': 'Momento de gerar ideias, iniciar projetos e manifestar sua criatividade.',
            'color': '#D4AF37'  # Dourado
        },
        'cuidar': {
            'name': 'Cuidar',
            'description': 'Tempo de nutrir relacionamentos, cuidar de si e manter o que já existe.',
            'color': '#00A86B'  # Verde Jade
        },
        'crescer': {
            'name': 'Crescer',
            'description': 'Fase de expansão, aprendizado e desenvolvimento pessoal.',
            'color': '#9370DB'  # Púrpura médio
        },
        'curar': {
            'name': 'Curar',
            'description': 'Momento de introspecção, cura emocional e renovação interior.',
            'color': '#4682B4'  # Azul aço
        }
    }
    
    # Emotions list
    EMOTIONS = [
        'Alegria', 'Serenidade', 'Entusiasmo', 'Gratidão', 'Amor',
        'Tristeza', 'Melancolia', 'Nostalgia', 'Ansiedade', 'Medo',
        'Raiva', 'Frustração', 'Confusão', 'Esperança', 'Curiosidade',
        'Inspiração', 'Determinação', 'Contemplação', 'Vulnerabilidade', 'Coragem'
    ]

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    # In production, set SECRET_KEY from environment variable
    

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
