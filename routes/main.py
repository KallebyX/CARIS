from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
import os

from ..models import db, User, DiaryEntry, Cycle, TemporalPattern, Ritual, UserRitual, TempoEmotionalEntry

# Import models to ensure they're registered with SQLAlchemy
from ..models.temporal import TemporalPattern, Ritual, UserRitual, TempoEmotionalEntry

# Create blueprint
main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Home page route."""
    return render_template('index.html')

@main_bp.route('/about')
def about():
    """About page route."""
    return render_template('about.html')

# Update __init__.py in routes folder to include the temporal blueprint
