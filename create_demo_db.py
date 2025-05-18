import os
import sys
from datetime import datetime, timedelta
import random
from werkzeug.security import generate_password_hash
from flask import Flask

# Add the current directory to the path so we can import the models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import db, User, Cycle, DiaryEntry, Archetype
from models.temporal import TemporalPattern, Ritual, UserRitual, TempoEmotionalEntry

def create_demo_db():
    """Create a demo database with sample data."""
    basedir = os.path.abspath(os.path.dirname(__file__))
    os.makedirs(os.path.join(basedir, "instance"), exist_ok=True)
    # Create a Flask app context
    app = Flask(__name__)
    db_path = os.path.join(basedir, 'instance', 'caris.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize the database
    db.init_app(app)
    
    with app.app_context():
        # Drop all tables and recreate them
        db.drop_all()
        db.create_all()
        
        # Create cycles
        cycles = [
            Cycle(name='criar', slug='criar', description='Ciclo de criatividade e inovação', color_code='#FF6B6B'),
            Cycle(name='cuidar', slug='cuidar', description='Ciclo de cuidado e nutrição', color_code='#4ECDC4'),
            Cycle(name='crescer', slug='crescer', description='Ciclo de crescimento e expansão', color_code='#FFD93D'),
            Cycle(name='curar', slug='curar', description='Ciclo de cura e integração', color_code='#1A535C')
        ]
        db.session.add_all(cycles)
        
        # Create archetypes
        archetypes = [
            Archetype(name='Explorador', description='Busca liberdade e autodescoberta', image_path='explorador.png', unlock_criteria='Complete 3 reflexões ao ar livre'),
            Archetype(name='Sábio', description='Busca a verdade e o conhecimento', image_path='sabio.png', unlock_criteria='Complete 5 leituras profundas'),
            Archetype(name='Criador', description='Busca criar coisas de valor duradouro', image_path='criador.png', unlock_criteria='Complete 3 projetos criativos'),
            Archetype(name='Cuidador', description='Busca proteger e cuidar dos outros', image_path='cuidador.png', unlock_criteria='Ajudar 2 pessoas nos últimos 7 dias')
        ]
        db.session.add_all(archetypes)
        
        # Create demo user
        demo_user = User(
            username='caris_demo',
            email='demo@chronoscaris.com',
            password='clareza123'
        )
        db.session.add(demo_user)
        db.session.commit()
        
        # Create diary entries
        emotions = ['Alegria', 'Tristeza', 'Raiva', 'Medo', 'Surpresa', 'Nojo', 'Antecipação', 'Confiança']
        titles = [
            'Reflexão sobre o dia', 'Pensamentos matinais', 'Momento de clareza',
            'Descoberta importante', 'Desafio superado', 'Conexão inesperada',
            'Aprendizado valioso', 'Momento de gratidão', 'Dúvida persistente',
            'Inspiração súbita'
        ]
        
        contents = [
            'Hoje percebi como meu tempo está conectado com minhas emoções. Quando estou focado em algo que amo, o tempo parece fluir de maneira diferente.',
            'Acordei com uma sensação de clareza que não sentia há muito tempo. Talvez seja o resultado de estar mais atento aos meus ciclos naturais.',
            'Estou notando um padrão interessante: minha energia criativa parece estar no auge pela manhã, enquanto à tarde me sinto mais analítico.',
            'A prática de rituais de transição está fazendo uma diferença notável. Aquele momento de pausa entre atividades traz uma qualidade diferente para cada experiência.',
            'Hoje foi um dia desafiador, mas percebi como minha relação com o tempo afeta diretamente como processo emoções difíceis.',
            'Estou começando a entender melhor meu cronotipo. Definitivamente não sou uma pessoa matutina, e isso não é um defeito - é apenas meu ritmo natural.',
            'A visualização do Atlas Tempo-Emocional me ajudou a perceber um padrão que eu não havia notado antes: meus momentos de maior clareza mental coincidem com períodos específicos do dia.',
            'Estou aprendendo a respeitar mais meus limites energéticos. Não se trata apenas de gerenciar o tempo, mas de honrar meus ciclos naturais.',
            'O ritual noturno que comecei a praticar está transformando a qualidade do meu sono. É incrível como pequenas práticas podem ter impactos tão significativos.',
            'Hoje experimentei um estado de fluxo enquanto trabalhava em um projeto pessoal. O tempo pareceu desaparecer, e havia uma harmonia perfeita entre minha energia e a tarefa.'
        ]
        
        # Create diary entries for the past 30 days
        for i in range(30):
            date = datetime.now() - timedelta(days=i)
            cycle = random.choice(cycles)
            emotion = random.choice(emotions)
            title = random.choice(titles)
            content = random.choice(contents)
            
            entry = DiaryEntry(
                user_id=demo_user.id,
                cycle_id=cycle.id,
                emotion=emotion,
                content=content
            )
            db.session.add(entry)
        
        # Create temporal pattern for demo user
        temporal_pattern = TemporalPattern(
            user_id=demo_user.id,
            chronotype='intermediate',
            peak_energy_start=datetime.strptime('10:00', '%H:%M').time(),
            peak_energy_end=datetime.strptime('14:00', '%H:%M').time(),
            secondary_peak_start=datetime.strptime('16:00', '%H:%M').time(),
            secondary_peak_end=datetime.strptime('18:00', '%H:%M').time()
        )
        db.session.add(temporal_pattern)
        
        # Create rituals
        rituals = [
            Ritual(
                name='Ritual Matinal de Clareza',
                description='Um ritual para iniciar o dia com intenção e clareza, combinando respiração consciente, visualização e definição de intenções.',
                duration_minutes=10,
                ritual_type='morning',
                is_premium=False
            ),
            Ritual(
                name='Ritual de Encerramento do Dia',
                description='Um ritual para fechar o dia com gratidão e reflexão, permitindo um descanso mais profundo e regenerador.',
                duration_minutes=15,
                ritual_type='evening',
                is_premium=False
            ),
            Ritual(
                name='Pausa para Transição de Contexto',
                description='Um breve ritual para facilitar a mudança entre diferentes tipos de atividades, ajudando a mente a mudar de contexto com mais facilidade.',
                duration_minutes=5,
                ritual_type='transition',
                is_premium=False
            ),
            Ritual(
                name='Ritual de Foco Profundo',
                description='Um ritual para entrar em estado de concentração profunda, criando as condições ideais para trabalho focado e criativo.',
                duration_minutes=8,
                ritual_type='focus',
                is_premium=False
            ),
            Ritual(
                name='Ritual de Alinhamento com Ciclos Naturais',
                description='Um ritual premium que sincroniza sua energia com os ciclos naturais do dia, utilizando técnicas avançadas de cronobiologia.',
                duration_minutes=20,
                ritual_type='morning',
                is_premium=True
            ),
            Ritual(
                name='Ritual de Integração Tempo-Emocional',
                description='Um ritual premium para harmonizar sua percepção de tempo com seu estado emocional, criando uma experiência mais coesa e significativa.',
                duration_minutes=15,
                ritual_type='transition',
                is_premium=True
            )
        ]
        db.session.add_all(rituals)
        
        # Add some rituals to demo user
        user_rituals = [
            UserRitual(
                user_id=demo_user.id,
                ritual_id=1,
                is_favorite=True,
                times_performed=12,
                last_performed=datetime.now() - timedelta(days=1)
            ),
            UserRitual(
                user_id=demo_user.id,
                ritual_id=2,
                is_favorite=True,
                times_performed=8,
                last_performed=datetime.now() - timedelta(days=1)
            ),
            UserRitual(
                user_id=demo_user.id,
                ritual_id=3,
                is_favorite=False,
                times_performed=5,
                last_performed=datetime.now() - timedelta(days=3)
            )
        ]
        db.session.add_all(user_rituals)
        
        # Create tempo-emotional entries
        activities = [
            'Trabalho Focado', 'Trabalho Criativo', 'Reunião/Colaboração',
            'Aprendizado/Estudo', 'Planejamento/Organização', 'Descanso/Recuperação',
            'Socialização', 'Cuidado Pessoal', 'Movimento/Exercício', 'Reflexão/Contemplação'
        ]
        
        time_perceptions = ['fast', 'normal', 'slow']
        
        # Create entries for the past 14 days, multiple per day
        for i in range(14):
            day = datetime.now() - timedelta(days=i)
            
            # Create 2-4 entries per day
            for j in range(random.randint(2, 4)):
                hour = random.randint(8, 22)
                timestamp = day.replace(hour=hour, minute=random.randint(0, 59))
                
                # Get a random diary entry from the same day if available
                diary_entry = DiaryEntry.query.filter(
                    DiaryEntry.user_id == demo_user.id,
                    DiaryEntry.created_at >= day.replace(hour=0, minute=0, second=0),
                    DiaryEntry.created_at < day.replace(hour=23, minute=59, second=59)
                ).first()
                
                diary_id = diary_entry.id if diary_entry else None
                
                entry = TempoEmotionalEntry(
                    user_id=demo_user.id,
                    diary_id=diary_id,
                    energy_level=random.randint(1, 10),
                    focus_level=random.randint(1, 10),
                    time_perception=random.choice(time_perceptions),
                    activity_type=random.choice(activities),
                    timestamp=timestamp
                )
                db.session.add(entry)
        
        db.session.commit()
        print("Demo database created successfully!")

if __name__ == '__main__':
    create_demo_db()
