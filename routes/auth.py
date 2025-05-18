from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, EmailField
from wtforms.validators import DataRequired, Email, Length, EqualTo, ValidationError

from models import User, db

# Create Blueprint
auth_bp = Blueprint('auth', __name__)

# Forms
class LoginForm(FlaskForm):
    """User login form."""
    username = StringField('Nome de usuário', validators=[DataRequired()])
    password = PasswordField('Senha', validators=[DataRequired()])
    remember_me = BooleanField('Lembrar de mim')
    submit = SubmitField('Entrar')

class RegistrationForm(FlaskForm):
    """User registration form."""
    username = StringField('Nome de usuário', validators=[DataRequired(), Length(3, 64)])
    email = EmailField('Email', validators=[DataRequired(), Email(), Length(1, 120)])
    password = PasswordField('Senha', validators=[
        DataRequired(), 
        Length(8, 128, message='A senha deve ter pelo menos 8 caracteres')
    ])
    password2 = PasswordField('Confirmar senha', validators=[
        DataRequired(), 
        EqualTo('password', message='As senhas devem ser iguais')
    ])
    submit = SubmitField('Registrar')
    
    def validate_username(self, field):
        """Validate username is unique."""
        if User.query.filter_by(username=field.data).first():
            raise ValidationError('Este nome de usuário já está em uso.')
    
    def validate_email(self, field):
        """Validate email is unique."""
        if User.query.filter_by(email=field.data).first():
            raise ValidationError('Este email já está registrado.')

# Routes
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login route."""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is not None and user.check_password(form.password.data):
            login_user(user, remember=form.remember_me.data)
            user.update_last_login()
            next_page = request.args.get('next')
            if next_page is None or not next_page.startswith('/'):
                next_page = url_for('dashboard.index')
            return redirect(next_page)
        flash('Nome de usuário ou senha inválidos.', 'error')
    
    return render_template('auth/login.html', form=form, title='Entrar')

@auth_bp.route('/logout')
@login_required
def logout():
    """User logout route."""
    logout_user()
    flash('Você saiu da sua conta.', 'info')
    return redirect(url_for('main.index'))

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """User registration route."""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))
    
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            password=form.password.data
        )
        db.session.add(user)
        db.session.commit()
        flash('Conta criada com sucesso! Agora você pode entrar.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('auth/register.html', form=form, title='Registrar')
