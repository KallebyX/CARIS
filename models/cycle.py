from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Import db instance from user.py to maintain single SQLAlchemy instance
from .user import db

class Cycle(db.Model):
    """Cycle model representing the four emotional cycles of CÁRIS."""
    __tablename__ = 'cycles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    slug = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    color_code = db.Column(db.String(7), nullable=False)  # Hex color code
    
    # one-to-many relationship from Cycle to DiaryEntry, without conflicting backref
    diary_entries = db.relationship('DiaryEntry', lazy='dynamic')
    
    def __init__(self, name, slug, description, color_code):
        self.name = name
        self.slug = slug
        self.description = description
        self.color_code = color_code
    
    @classmethod
    def insert_cycles(cls):
        """Insert the four default cycles if they don't exist."""
        cycles = {
            'criar': {
                'name': 'Criar',
                'description': 'Momento de gerar ideias, iniciar projetos e manifestar sua criatividade.',
                'color_code': '#D4AF37'  # Dourado
            },
            'cuidar': {
                'name': 'Cuidar',
                'description': 'Tempo de nutrir relacionamentos, cuidar de si e manter o que já existe.',
                'color_code': '#00A86B'  # Verde Jade
            },
            'crescer': {
                'name': 'Crescer',
                'description': 'Fase de expansão, aprendizado e desenvolvimento pessoal.',
                'color_code': '#9370DB'  # Púrpura médio
            },
            'curar': {
                'name': 'Curar',
                'description': 'Momento de introspecção, cura emocional e renovação interior.',
                'color_code': '#4682B4'  # Azul aço
            }
        }
        
        for slug, data in cycles.items():
            if not cls.query.filter_by(slug=slug).first():
                cycle = cls(
                    name=data['name'],
                    slug=slug,
                    description=data['description'],
                    color_code=data['color_code']
                )
                db.session.add(cycle)
        
        db.session.commit()
    
    def __repr__(self):
        return f'<Cycle {self.name}>'
