from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Import db instance from user.py to maintain single SQLAlchemy instance
from .user import db

class Archetype(db.Model):
    """Archetype model for symbolic gamification rewards."""
    __tablename__ = 'archetypes'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(128), nullable=False)
    unlock_criteria = db.Column(db.String(128), nullable=False)
    
    # Many-to-many relationship with users
    users = db.relationship('User', secondary='user_archetypes', backref=db.backref('archetypes', lazy='dynamic'))
    
    def __init__(self, name, description, image_path, unlock_criteria):
        self.name = name
        self.description = description
        self.image_path = image_path
        self.unlock_criteria = unlock_criteria
    
    @classmethod
    def insert_archetypes(cls):
        """Insert default archetypes if they don't exist."""
        archetypes = [
            {
                'name': 'O Buscador',
                'description': 'Aquele que inicia a jornada de autoconhecimento, movido pela curiosidade e desejo de clareza.',
                'image_path': 'img/archetypes/seeker.png',
                'unlock_criteria': 'first_entry'
            },
            {
                'name': 'O Criador',
                'description': 'Manifesta ideias e transforma inspiração em realidade tangível.',
                'image_path': 'img/archetypes/creator.png',
                'unlock_criteria': 'five_criar_entries'
            },
            {
                'name': 'O Guardião',
                'description': 'Protege o que é valioso e nutre relacionamentos com cuidado e atenção.',
                'image_path': 'img/archetypes/guardian.png',
                'unlock_criteria': 'five_cuidar_entries'
            },
            {
                'name': 'O Sábio',
                'description': 'Busca conhecimento e compreensão profunda, valorizando a verdade acima de tudo.',
                'image_path': 'img/archetypes/sage.png',
                'unlock_criteria': 'five_crescer_entries'
            },
            {
                'name': 'O Curador',
                'description': 'Transforma dor em sabedoria e facilita processos de cura e integração.',
                'image_path': 'img/archetypes/healer.png',
                'unlock_criteria': 'five_curar_entries'
            },
            {
                'name': 'O Contemplativo',
                'description': 'Observa o mundo com atenção plena, encontrando significado nos detalhes sutis da existência.',
                'image_path': 'img/archetypes/contemplative.png',
                'unlock_criteria': 'thirty_entries'
            }
        ]
        
        for archetype_data in archetypes:
            if not cls.query.filter_by(name=archetype_data['name']).first():
                archetype = cls(
                    name=archetype_data['name'],
                    description=archetype_data['description'],
                    image_path=archetype_data['image_path'],
                    unlock_criteria=archetype_data['unlock_criteria']
                )
                db.session.add(archetype)
        
        db.session.commit()
    
    def __repr__(self):
        return f'<Archetype {self.name}>'

# Association table for User-Archetype many-to-many relationship
user_archetypes = db.Table('user_archetypes',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('archetype_id', db.Integer, db.ForeignKey('archetypes.id'), primary_key=True),
    db.Column('unlocked_at', db.DateTime, default=datetime.utcnow)
)
