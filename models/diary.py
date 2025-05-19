# models/diary.py
from datetime import datetime
from .user import db

class DiaryEntry(db.Model):
    """Diary entry model for user reflections."""
    __tablename__ = 'diary_entries'
    
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'),  nullable=False)
    cycle_id   = db.Column(db.Integer, db.ForeignKey('cycles.id'), nullable=False)
    emotion    = db.Column(db.String(64), nullable=False)
    content    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # relacionamento bidirecional com Cycle
    cycle = db.relationship(
        'Cycle',
        back_populates='diary_entries',
        lazy='joined'
    )
    
    def __init__(self, user_id, cycle_id, emotion, content):
        self.user_id  = user_id
        self.cycle_id = cycle_id
        self.emotion  = emotion
        self.content  = content
    
    def to_dict(self):
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
        """Agrupa entradas do usuário pelo nome do ciclo."""
        entries_by_cycle = {}
        for entry in cls.query.filter_by(user_id=user_id).order_by(cls.created_at.desc()):
            name = entry.cycle.name
            entries_by_cycle.setdefault(name, []).append(entry)
        return entries_by_cycle
    
    @classmethod
    def get_emotion_stats(cls, user_id):
        stats = {}
        for entry in cls.query.filter_by(user_id=user_id):
            stats[entry.emotion] = stats.get(entry.emotion, 0) + 1
        return stats
    
    def __repr__(self):
        date = self.created_at.strftime("%Y-%m-%d")
        return f'<DiaryEntry {self.id} – {date}>'