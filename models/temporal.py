from datetime import datetime
from . import db
from .user import User

class TemporalPattern(db.Model):
    """Model for user temporal patterns based on chronobiology."""
    __tablename__ = 'temporal_patterns'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    chronotype = db.Column(db.String(20), nullable=False)  # early_bird, night_owl, intermediate
    peak_energy_start = db.Column(db.Time, nullable=True)
    peak_energy_end = db.Column(db.Time, nullable=True)
    secondary_peak_start = db.Column(db.Time, nullable=True)
    secondary_peak_end = db.Column(db.Time, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('temporal_pattern', uselist=False))
    
    def __repr__(self):
        return f'<TemporalPattern {self.id} - User {self.user_id}>'


class Ritual(db.Model):
    """Model for transition rituals."""
    __tablename__ = 'rituals'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    ritual_type = db.Column(db.String(50), nullable=False)  # morning, evening, transition, focus
    is_premium = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Ritual {self.id} - {self.name}>'


class UserRitual(db.Model):
    """Model for user-ritual relationship and customization."""
    __tablename__ = 'user_rituals'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ritual_id = db.Column(db.Integer, db.ForeignKey('rituals.id'), nullable=False)
    is_favorite = db.Column(db.Boolean, default=False)
    custom_name = db.Column(db.String(100), nullable=True)
    custom_description = db.Column(db.Text, nullable=True)
    last_performed = db.Column(db.DateTime, nullable=True)
    times_performed = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('rituals', lazy='dynamic'))
    ritual = db.relationship('Ritual')
    
    def __repr__(self):
        return f'<UserRitual {self.id} - User {self.user_id} - Ritual {self.ritual_id}>'


class TempoEmotionalEntry(db.Model):
    """Model for tempo-emotional entries that combine time and emotion."""
    __tablename__ = 'tempo_emotional_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    diary_id = db.Column(db.Integer, db.ForeignKey('diary_entries.id'), nullable=True)
    energy_level = db.Column(db.Integer, nullable=False)  # 1-10 scale
    focus_level = db.Column(db.Integer, nullable=False)  # 1-10 scale
    time_perception = db.Column(db.String(20), nullable=False)  # fast, slow, normal
    activity_type = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('tempo_emotional_entries', lazy='dynamic'))
    diary = db.relationship('DiaryEntry', backref=db.backref('tempo_emotional_data', uselist=False))
    
    def __repr__(self):
        return f'<TempoEmotionalEntry {self.id} - User {self.user_id}>'
