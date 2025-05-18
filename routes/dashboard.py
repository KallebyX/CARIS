from flask import Blueprint, render_template, redirect, url_for, jsonify
from flask_login import login_required, current_user

from models import DiaryEntry, Cycle, Archetype

# Create Blueprint
dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/')
@login_required
def index():
    """Dashboard home page with summary and charts."""
    # Get entry counts by cycle
    entries_by_cycle = DiaryEntry.get_entries_by_cycle(current_user.id)
    cycle_counts = {cycle: len(entries) for cycle, entries in entries_by_cycle.items()}
    
    # Get all cycles for reference
    cycles = Cycle.query.all()
    cycle_data = {cycle.name: {'color': cycle.color_code, 'count': 0} for cycle in cycles}
    
    # Update counts for cycles that have entries
    for cycle_name, count in cycle_counts.items():
        if cycle_name in cycle_data:
            cycle_data[cycle_name]['count'] = count
    
    # Get emotion statistics
    emotion_stats = DiaryEntry.get_emotion_stats(current_user.id)
    
    # Get recent entries
    recent_entries = DiaryEntry.query.filter_by(user_id=current_user.id).order_by(
        DiaryEntry.created_at.desc()
    ).limit(5).all()
    
    # Get user's unlocked archetypes
    archetypes = current_user.archetypes.all()
    
    return render_template(
        'dashboard/panel.html',
        cycle_data=cycle_data,
        emotion_stats=emotion_stats,
        recent_entries=recent_entries,
        archetypes=archetypes,
        title='Painel'
    )

@dashboard_bp.route('/api/chart-data')
@login_required
def chart_data():
    """API endpoint for chart data."""
    # Get entry counts by cycle
    entries_by_cycle = DiaryEntry.get_entries_by_cycle(current_user.id)
    cycle_counts = {cycle: len(entries) for cycle, entries in entries_by_cycle.items()}
    
    # Get all cycles for reference
    cycles = Cycle.query.all()
    cycle_data = {cycle.name: {'color': cycle.color_code, 'count': 0} for cycle in cycles}
    
    # Update counts for cycles that have entries
    for cycle_name, count in cycle_counts.items():
        if cycle_name in cycle_data:
            cycle_data[cycle_name]['count'] = count
    
    # Get emotion statistics
    emotion_stats = DiaryEntry.get_emotion_stats(current_user.id)
    
    # Format data for Chart.js
    cycle_chart_data = {
        'labels': list(cycle_data.keys()),
        'datasets': [{
            'data': [data['count'] for data in cycle_data.values()],
            'backgroundColor': [data['color'] for data in cycle_data.values()]
        }]
    }
    
    emotion_chart_data = {
        'labels': list(emotion_stats.keys()),
        'datasets': [{
            'data': list(emotion_stats.values()),
            'backgroundColor': [
                '#D4AF37', '#00A86B', '#9370DB', '#4682B4', 
                '#FF6347', '#20B2AA', '#BA55D3', '#FF7F50',
                '#3CB371', '#6495ED', '#FF69B4', '#CD853F',
                '#48D1CC', '#C71585', '#F08080', '#6B8E23',
                '#BC8F8F', '#483D8B', '#2E8B57', '#DAA520'
            ][:len(emotion_stats)]
        }]
    }
    
    return jsonify({
        'cycle_chart': cycle_chart_data,
        'emotion_chart': emotion_chart_data
    })
