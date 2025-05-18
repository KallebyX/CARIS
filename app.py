from dotenv import load_dotenv
load_dotenv()
from dotenv import load_dotenv
load_dotenv()
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from flask import Flask
from flask_login import LoginManager
from flask_migrate import Migrate

from models import db, User
from routes import auth_bp, diary_bp, dashboard_bp, export_bp, main_bp, temporal_bp
from config import config
import utils

def create_app(config_name='default'):
    """Application factory function."""
    app = Flask(__name__)
    from dotenv import load_dotenv
    load_dotenv()
    app.config.from_object(config[config_name])

    from datetime import datetime

    def format_date(value, format="%d/%m/%Y"):
        if isinstance(value, datetime):
            return value.strftime(format)
        return value

    app.jinja_env.filters['format_date'] = format_date

    def cycle_name(value):
        mapping = {
            'preparacao': 'Preparação',
            'despertar': 'Despertar',
            'exploracao': 'Exploração',
            'renascimento': 'Renascimento'
        }
        return mapping.get(value, value)

    app.jinja_env.filters['cycle_name'] = cycle_name
    
    # Initialize extensions
    db.init_app(app)
    
    # Setup Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Por favor, faça login para acessar esta página.'
    login_manager.login_message_category = 'info'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Setup Flask-Migrate
    migrate = Migrate(app, db)
    
    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(diary_bp, url_prefix='/diary')
    app.register_blueprint(dashboard_bp, url_prefix='/dashboard')
    app.register_blueprint(export_bp, url_prefix='/export')
    app.register_blueprint(temporal_bp, url_prefix='/temporal')
    
    # Ensure instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
    
    # Shell context
    @app.shell_context_processor
    def make_shell_context():
        return dict(app=app, db=db, User=User)
    
    @app.context_processor
    def inject_now():
        return {'now': datetime.utcnow()}

    @app.context_processor
    def inject_utils():
        return {'utils': utils}
    
    # Criação segura do banco quando usando SQLite local
    if "sqlite" in app.config["SQLALCHEMY_DATABASE_URI"] and "/tmp/" in app.config["SQLALCHEMY_DATABASE_URI"]:
        db_path = app.config["SQLALCHEMY_DATABASE_URI"].replace("sqlite:///", "")
        if not os.path.exists(db_path):
            with app.app_context():
                db.create_all()
                print(f"✅ Banco criado em: {db_path}")
    if os.environ.get("FLASK_ENV") == "production":
        with app.app_context():
            from flask_migrate import upgrade
            try:
                upgrade()
                print("✅ Migração automática executada com sucesso.")
            except Exception as e:
                print("⚠️ Erro ao aplicar migrations:", e)
    print("✅ Ambiente:", os.environ.get("FLASK_ENV"))
    print("✅ Database URL:", os.environ.get("DATABASE_URL"))
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
