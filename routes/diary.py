from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from wtforms import TextAreaField, SelectField, SubmitField
from wtforms.validators import DataRequired, Length

from models import DiaryEntry, Cycle, db
from datetime import datetime

# Create Blueprint
diary_bp = Blueprint('diary', __name__)

# Forms
class DiaryEntryForm(FlaskForm):
    """Diary entry creation form."""
    cycle = SelectField('Ciclo', validators=[DataRequired()], coerce=int)
    emotion = SelectField('Emoção', validators=[DataRequired()])
    content = TextAreaField('Reflexão', validators=[
        DataRequired(), 
        Length(10, 5000, message='Sua reflexão deve ter entre 10 e 5000 caracteres')
    ])
    submit = SubmitField('Salvar')

# Routes
@diary_bp.route('/new', methods=['GET', 'POST'])
@login_required
def new_entry():
    """Create new diary entry."""
    form = DiaryEntryForm()
    
    # Populate cycle choices
    form.cycle.choices = [(c.id, c.name) for c in Cycle.query.filter_by(user_id=current_user.id).all()]
    
    # Populate emotion choices from config
    emotions = [
        'Alegria', 'Serenidade', 'Entusiasmo', 'Gratidão', 'Amor',
        'Tristeza', 'Melancolia', 'Nostalgia', 'Ansiedade', 'Medo',
        'Raiva', 'Frustração', 'Confusão', 'Esperança', 'Curiosidade',
        'Inspiração', 'Determinação', 'Contemplação', 'Vulnerabilidade', 'Coragem'
    ]
    form.emotion.choices = [(e, e) for e in emotions]
    
    if form.validate_on_submit():
        entry = DiaryEntry(
            user_id=current_user.id,
            cycle_id=form.cycle.data,
            emotion=form.emotion.data,
            content=form.content.data
        )
        db.session.add(entry)
        db.session.commit()
        
        flash('Sua reflexão foi registrada com sucesso.', 'success')
        return redirect(url_for('diary.view_entries'))
    
    # Get cycle from query param if provided
    cycle_id = request.args.get('cycle', None)
    if cycle_id and cycle_id.isdigit():
        form.cycle.data = int(cycle_id)
    
    return render_template('diary/new_entry.html', form=form, title='Nova Reflexão')

@diary_bp.route('/entries')
@login_required
def view_entries():
    """View all diary entries grouped by cycle."""
    entries_by_cycle = DiaryEntry.get_entries_by_cycle(current_user.id)
    cycles = Cycle.query.all()
    
    return render_template(
        'diary/view_entries.html', 
        entries_by_cycle=entries_by_cycle,
        cycles=cycles,
        title='Minhas Reflexões'
    )

@diary_bp.route('/entry/<int:entry_id>')
@login_required
def view_entry(entry_id):
    """View a single diary entry."""
    entry = DiaryEntry.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
    return render_template('diary/view_entry.html', entry=entry, title='Reflexão')

@diary_bp.route('/entry/<int:entry_id>/delete', methods=['POST'])
@login_required
def delete_entry(entry_id):
    """Delete a diary entry."""
    entry = DiaryEntry.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
    db.session.delete(entry)
    db.session.commit()
    flash('Reflexão removida com sucesso.', 'success')
    return redirect(url_for('diary.view_entries'))

@diary_bp.route('/api/entries')
@login_required
def api_entries():
    """API endpoint for diary entries (used by charts)."""
    entries = DiaryEntry.query.filter_by(user_id=current_user.id).all()
    return jsonify([entry.to_dict() for entry in entries])
