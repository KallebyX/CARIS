import os
from flask import Flask
from flask_login import LoginManager
from flask_migrate import Migrate

from models import db, User
from routes import auth_bp, diary_bp, dashboard_bp, export_bp, main_bp, temporal_bp
from config import config

def create_app(config_name='default'):
    """Application factory function."""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
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
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
