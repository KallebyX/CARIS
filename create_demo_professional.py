#!/usr/bin/env python3
"""
Script para criar dados de demonstração para profissionais da saúde no CÁRIS.
Execute: python create_demo_professional.py
"""

import os
import sys
from datetime import datetime, timedelta

# Add the current directory to the path so we can import the models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models import db, User, ProfissionalSaude, VinculoProfissionalPaciente, ConsentimentoPaciente, gerar_codigo_convite

def create_demo_professionals():
    """Cria profissionais de demonstração e vínculos com o usuário demo."""
    
    # Create Flask app context
    app = Flask(__name__)
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(basedir, 'instance', 'caris.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', f'sqlite:///{db_path}')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize the database
    db.init_app(app)
    
    with app.app_context():
        print("🏥 Criando profissionais de demonstração...")
        
        # Verificar se o usuário demo existe
        demo_user = User.query.filter_by(username='caris_demo').first()
        if not demo_user:
            print("❌ Usuário demo 'caris_demo' não encontrado. Execute create_demo_db.py primeiro.")
            return
        
        # Criar profissionais de demonstração
        profissionais = [
            {
                'nome_completo': 'Dra. Ana Silva',
                'email': 'ana.silva@demo.com',
                'password': 'demo123',
                'tipo_profissional': 'psicologo',
                'crm_crp': 'CRP 06/123456',
                'especialidade': 'Psicologia Clínica',
                'telefone': '(11) 99999-1234',
                'is_verified': True
            },
            {
                'nome_completo': 'Dr. Carlos Mendes',
                'email': 'carlos.mendes@demo.com', 
                'password': 'demo123',
                'tipo_profissional': 'psiquiatra',
                'crm_crp': 'CRM 12345-SP',
                'especialidade': 'Psiquiatria Geral',
                'telefone': '(11) 99999-5678',
                'is_verified': True
            },
            {
                'nome_completo': 'Maria Fernanda Coach',
                'email': 'maria.coach@demo.com',
                'password': 'demo123', 
                'tipo_profissional': 'coach',
                'especialidade': 'Life Coach & Mindfulness',
                'telefone': '(11) 99999-9999',
                'is_verified': True
            }
        ]
        
        profissionais_criados = []
        
        for prof_data in profissionais:
            # Verificar se já existe
            existing = ProfissionalSaude.query.filter_by(email=prof_data['email']).first()
            if existing:
                print(f"✅ Profissional {prof_data['nome_completo']} já existe")
                profissionais_criados.append(existing)
                continue
            
            # Criar novo profissional
            profissional = ProfissionalSaude(**prof_data)
            db.session.add(profissional)
            profissionais_criados.append(profissional)
            print(f"➕ Criado: {prof_data['nome_completo']} ({prof_data['tipo_profissional']})")
        
        db.session.commit()
        
        # Criar vínculos com o usuário demo
        print("\n🔗 Criando vínculos com usuário demo...")
        
        for i, profissional in enumerate(profissionais_criados[:2]):  # Vincular apenas os 2 primeiros
            # Verificar se vínculo já existe
            vinculo_existente = VinculoProfissionalPaciente.query.filter_by(
                profissional_id=profissional.id,
                paciente_id=demo_user.id
            ).first()
            
            if vinculo_existente:
                print(f"✅ Vínculo com {profissional.nome_completo} já existe")
                continue
            
            # Criar vínculo
            codigo = gerar_codigo_convite()
            vinculo = VinculoProfissionalPaciente(
                profissional_id=profissional.id,
                paciente_id=demo_user.id,
                codigo_convite=codigo
            )
            
            # Adicionar e fazer commit do vínculo primeiro
            db.session.add(vinculo)
            db.session.commit()
            
            # Aceitar automaticamente para demo
            vinculo.aceitar_convite(consentimento_completo=(i == 0))  # Primeiro com acesso completo
            
            # Registrar consentimento
            consentimento = ConsentimentoPaciente(
                vinculo_id=vinculo.id,
                acao='concedido',
                permissoes_snapshot=vinculo.get_permissoes_resumo(),
                motivo='Vínculo criado automaticamente para demonstração'
            )
            
            db.session.add(consentimento)
            
            print(f"➕ Vínculo criado: {profissional.nome_completo} ↔ {demo_user.username}")
            print(f"   📋 Código: {codigo}")
            print(f"   🔐 Acesso: {'Completo' if vinculo.pode_ver_historico_completo else 'Limitado'}")
        
        db.session.commit()
        
        print("\n✅ Dados de demonstração criados com sucesso!")
        print("\n📋 Profissionais criados:")
        for prof in profissionais_criados:
            print(f"   • {prof.nome_completo} ({prof.tipo_profissional}) - {prof.email}")
        
        print("\n🔑 Credenciais de acesso profissionais:")
        print("   Email: ana.silva@demo.com | Senha: demo123")
        print("   Email: carlos.mendes@demo.com | Senha: demo123")
        print("   Email: maria.coach@demo.com | Senha: demo123")
        
        print("\n🌐 URLs de acesso:")
        print("   Login Profissional: http://localhost:5000/professional/login")
        print("   Painel Profissional: http://localhost:5000/professional/painel")


if __name__ == '__main__':
    create_demo_professionals() 