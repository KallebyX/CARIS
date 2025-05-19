from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Import Cycle for relationship
from .cycle import Cycle

# Import db instance from user.py to maintain single SQLAlchemy instance
from .user import db

class DiaryEntry(db.Model):
    """Diary entry model for user reflections."""
    __tablename__ = 'diary_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    cycle_id = db.Column(db.Integer, db.ForeignKey('cycles.id'), nullable=False)
    cycle = db.relationship('Cycle', back_populates='entries')
    emotion = db.Column(db.String(64), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, user_id, cycle_id, emotion, content):
        self.user_id = user_id
        self.cycle_id = cycle_id
        self.emotion = emotion
        self.content = content
    
    def to_dict(self):
        """Convert entry to dictionary for API/export."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'cycle_id': self.cycle_id,
            'cycle_name': self.cycle.name if self.cycle else None,
            'emotion': self.emotion,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def get_entries_by_cycle(cls, user_id):
        """Get user entries grouped by cycle."""
        entries_by_cycle = {}
        entries = cls.query.filter_by(user_id=user_id).order_by(cls.created_at.desc()).all()
        
        for entry in entries:
            cycle_name = entry.cycle.name
            if cycle_name not in entries_by_cycle:
                entries_by_cycle[cycle_name] = []
            entries_by_cycle[cycle_name].append(entry)
        
        return entries_by_cycle
    
    @classmethod
    def get_emotion_stats(cls, user_id):
        """Get emotion statistics for charts."""
        entries = cls.query.filter_by(user_id=user_id).all()
        emotions = {}
        
        for entry in entries:
            if entry.emotion in emotions:
                emotions[entry.emotion] += 1
            else:
                emotions[entry.emotion] = 1
        
        return emotions
    
    def __repr__(self):
        return f'<DiaryEntry {self.id} - {self.created_at.strftime("%Y-%m-%d")}>'
