from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime

from ..models import db, TemporalPattern, Ritual, UserRitual, TempoEmotionalEntry, DiaryEntry
from ..utils.date_helpers import get_current_week_dates

temporal_bp = Blueprint('temporal', __name__)

@temporal_bp.route('/atlas')
@login_required
def atlas():
    """View for the Tempo-Emotional Atlas."""
    # Get user's temporal pattern
    temporal_pattern = TemporalPattern.query.filter_by(user_id=current_user.id).first()
    
    # If user doesn't have a temporal pattern yet, redirect to chronotype quiz
    if not temporal_pattern:
        return redirect(url_for('temporal.chronotype_quiz'))
    
    # Get recent tempo-emotional entries
    entries = TempoEmotionalEntry.query.filter_by(user_id=current_user.id).order_by(TempoEmotionalEntry.timestamp.desc()).limit(14).all()
    
    # Get diary entries with tempo-emotional data
    diary_entries = DiaryEntry.query.join(TempoEmotionalEntry, DiaryEntry.id == TempoEmotionalEntry.diary_id).filter(DiaryEntry.user_id == current_user.id).order_by(DiaryEntry.date.desc()).limit(10).all()
    
    return render_template('temporal/atlas.html', 
                          temporal_pattern=temporal_pattern,
                          entries=entries,
                          diary_entries=diary_entries)

@temporal_bp.route('/chronotype-quiz')
@login_required
def chronotype_quiz():
    """Quiz to determine user's chronotype."""
    return render_template('temporal/chronotype_quiz.html')

@temporal_bp.route('/save-chronotype', methods=['POST'])
@login_required
def save_chronotype():
    """Save user's chronotype from quiz results."""
    chronotype = request.form.get('chronotype')
    peak_energy_start = request.form.get('peak_energy_start')
    peak_energy_end = request.form.get('peak_energy_end')
    
    # Check if user already has a temporal pattern
    temporal_pattern = TemporalPattern.query.filter_by(user_id=current_user.id).first()
    
    if temporal_pattern:
        # Update existing pattern
        temporal_pattern.chronotype = chronotype
        temporal_pattern.peak_energy_start = datetime.strptime(peak_energy_start, '%H:%M').time() if peak_energy_start else None
        temporal_pattern.peak_energy_end = datetime.strptime(peak_energy_end, '%H:%M').time() if peak_energy_end else None
    else:
        # Create new pattern
        temporal_pattern = TemporalPattern(
            user_id=current_user.id,
            chronotype=chronotype,
            peak_energy_start=datetime.strptime(peak_energy_start, '%H:%M').time() if peak_energy_start else None,
            peak_energy_end=datetime.strptime(peak_energy_end, '%H:%M').time() if peak_energy_end else None
        )
        db.session.add(temporal_pattern)
    
    db.session.commit()
    flash('Seu perfil temporal foi salvo com sucesso!', 'success')
    return redirect(url_for('temporal.atlas'))

@temporal_bp.route('/rituals')
@login_required
def rituals():
    """View for transition rituals."""
    # Get user's rituals
    user_rituals = UserRitual.query.filter_by(user_id=current_user.id).all()
    
    # Get available rituals not yet added by user
    user_ritual_ids = [ur.ritual_id for ur in user_rituals]
    available_rituals = Ritual.query.filter(~Ritual.id.in_(user_ritual_ids)).filter_by(is_premium=False).all()
    premium_rituals = Ritual.query.filter(~Ritual.id.in_(user_ritual_ids)).filter_by(is_premium=True).all()
    
    return render_template('temporal/rituals.html',
                          user_rituals=user_rituals,
                          available_rituals=available_rituals,
                          premium_rituals=premium_rituals)

@temporal_bp.route('/add-ritual/<int:ritual_id>', methods=['POST'])
@login_required
def add_ritual(ritual_id):
    """Add a ritual to user's collection."""
    ritual = Ritual.query.get_or_404(ritual_id)
    
    # Check if user already has this ritual
    existing = UserRitual.query.filter_by(user_id=current_user.id, ritual_id=ritual_id).first()
    if existing:
        flash('Este ritual já está em sua coleção.', 'info')
        return redirect(url_for('temporal.rituals'))
    
    # Check if premium ritual and user has access
    if ritual.is_premium and not current_user.is_premium:
        flash('Este ritual é exclusivo para assinantes premium.', 'warning')
        return redirect(url_for('temporal.rituals'))
    
    # Add ritual to user's collection
    user_ritual = UserRitual(
        user_id=current_user.id,
        ritual_id=ritual_id
    )
    db.session.add(user_ritual)
    db.session.commit()
    
    flash(f'Ritual "{ritual.name}" adicionado à sua coleção!', 'success')
    return redirect(url_for('temporal.rituals'))

@temporal_bp.route('/perform-ritual/<int:user_ritual_id>')
@login_required
def perform_ritual(user_ritual_id):
    """View for performing a ritual."""
    user_ritual = UserRitual.query.filter_by(id=user_ritual_id, user_id=current_user.id).first_or_404()
    
    return render_template('temporal/perform_ritual.html', user_ritual=user_ritual)

@temporal_bp.route('/complete-ritual/<int:user_ritual_id>', methods=['POST'])
@login_required
def complete_ritual(user_ritual_id):
    """Mark a ritual as completed."""
    user_ritual = UserRitual.query.filter_by(id=user_ritual_id, user_id=current_user.id).first_or_404()
    
    user_ritual.last_performed = datetime.utcnow()
    user_ritual.times_performed += 1
    db.session.commit()
    
    flash('Ritual concluído com sucesso!', 'success')
    return redirect(url_for('temporal.rituals'))

@temporal_bp.route('/tempo-emotional-entry', methods=['GET', 'POST'])
@login_required
def tempo_emotional_entry():
    """Create a new tempo-emotional entry."""
    if request.method == 'POST':
        energy_level = request.form.get('energy_level', type=int)
        focus_level = request.form.get('focus_level', type=int)
        time_perception = request.form.get('time_perception')
        activity_type = request.form.get('activity_type')
        
        # Create new entry
        entry = TempoEmotionalEntry(
            user_id=current_user.id,
            energy_level=energy_level,
            focus_level=focus_level,
            time_perception=time_perception,
            activity_type=activity_type
        )
        
        # If this entry is linked to a diary entry
        diary_id = request.form.get('diary_id')
        if diary_id:
            entry.diary_id = diary_id
        
        db.session.add(entry)
        db.session.commit()
        
        flash('Seu registro tempo-emocional foi salvo com sucesso!', 'success')
        return redirect(url_for('temporal.atlas'))
    
    # For GET request
    diary_id = request.args.get('diary_id')
    diary_entry = None
    if diary_id:
        diary_entry = DiaryEntry.query.filter_by(id=diary_id, user_id=current_user.id).first_or_404()
    
    return render_template('temporal/tempo_emotional_entry.html', diary_entry=diary_entry)

@temporal_bp.route('/api/tempo-emotional-data')
@login_required
def api_tempo_emotional_data():
    """API endpoint to get tempo-emotional data for visualizations."""
    days = request.args.get('days', default=30, type=int)
    
    # Get entries for the specified period
    from_date = datetime.utcnow().date() - datetime.timedelta(days=days)
    entries = TempoEmotionalEntry.query.filter(
        TempoEmotionalEntry.user_id == current_user.id,
        TempoEmotionalEntry.timestamp >= from_date
    ).order_by(TempoEmotionalEntry.timestamp).all()
    
    # Format data for visualization
    data = {
        'timestamps': [entry.timestamp.isoformat() for entry in entries],
        'energy_levels': [entry.energy_level for entry in entries],
        'focus_levels': [entry.focus_level for entry in entries],
        'time_perceptions': [entry.time_perception for entry in entries],
        'activity_types': [entry.activity_type for entry in entries]
    }
    
    return jsonify(data)
