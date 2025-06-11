from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SelectField, EmailField, TextAreaField, BooleanField, SubmitField
from wtforms.validators import DataRequired, Email, Length, EqualTo, Optional
from werkzeug.security import check_password_hash

from models import (
    db, User, DiaryEntry, Cycle, 
    ProfissionalSaude, VinculoProfissionalPaciente, 
    ConsentimentoPaciente, gerar_codigo_convite
)
from datetime import datetime, timedelta
import json

# Criar Blueprint
professional_bp = Blueprint('professional', __name__)

# ========== FORMS ==========

class ProfessionalRegistrationForm(FlaskForm):
    """Formulário de registro para profissionais."""
    nome_completo = StringField('Nome Completo', validators=[
        DataRequired(message='Nome é obrigatório'),
        Length(min=3, max=120, message='Nome deve ter entre 3 e 120 caracteres')
    ])
    email = EmailField('Email', validators=[
        DataRequired(message='Email é obrigatório'),
        Email(message='Email inválido')
    ])
    password = PasswordField('Senha', validators=[
        DataRequired(message='Senha é obrigatória'),
        Length(min=6, message='Senha deve ter no mínimo 6 caracteres')
    ])
    password_confirm = PasswordField('Confirmar Senha', validators=[
        DataRequired(message='Confirmação de senha é obrigatória'),
        EqualTo('password', message='Senhas não coincidem')
    ])
    
    tipo_profissional = SelectField('Tipo de Profissional', validators=[DataRequired()], choices=[
        ('psicologo', 'Psicólogo(a)'),
        ('psicoterapeuta', 'Psicoterapeuta'),
        ('coach', 'Coach'),
        ('psiquiatra', 'Psiquiatra'),
        ('terapeuta_ocupacional', 'Terapeuta Ocupacional'),
        ('outro', 'Outro')
    ])
    
    crm_crp = StringField('CRM/CRP/Registro', validators=[
        Optional(),
        Length(max=20)
    ])
    especialidade = StringField('Especialidade', validators=[
        Optional(),
        Length(max=100)
    ])
    telefone = StringField('Telefone', validators=[
        Optional(),
        Length(max=20)
    ])
    
    submit = SubmitField('Registrar')


class ProfessionalLoginForm(FlaskForm):
    """Formulário de login para profissionais."""
    email = EmailField('Email', validators=[
        DataRequired(message='Email é obrigatório'),
        Email(message='Email inválido')
    ])
    password = PasswordField('Senha', validators=[
        DataRequired(message='Senha é obrigatória')
    ])
    remember_me = BooleanField('Lembrar de mim')
    submit = SubmitField('Entrar')


class ConvitePacienteForm(FlaskForm):
    """Formulário para convidar paciente."""
    email_paciente = EmailField('Email do Paciente', validators=[
        DataRequired(message='Email é obrigatório'),
        Email(message='Email inválido')
    ])
    mensagem_personalizada = TextAreaField('Mensagem Personalizada', validators=[
        Optional(),
        Length(max=500, message='Mensagem muito longa')
    ])
    submit = SubmitField('Enviar Convite')


# ========== HELPER FUNCTIONS ==========

def professional_login_required(f):
    """Decorator para verificar se usuário é profissional logado."""
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not isinstance(current_user, ProfissionalSaude):
            flash('Acesso restrito a profissionais.', 'warning')
            return redirect(url_for('professional.login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function


def get_professional_dashboard_data(profissional):
    """Coleta dados agregados para o dashboard do profissional."""
    pacientes_ativos = profissional.get_pacientes_ativos()
    total_pacientes = len(pacientes_ativos)
    
    # Estatísticas dos pacientes
    stats = {
        'total_pacientes': total_pacientes,
        'novos_esta_semana': 0,
        'emocoes_mais_comuns': {},
        'ciclos_dominantes': {},
        'pacientes_sem_atividade': 0
    }
    
    semana_passada = datetime.utcnow() - timedelta(days=7)
    
    for paciente in pacientes_ativos:
        # Contar novos vínculos esta semana
        vinculo = profissional.vinculos_pacientes.filter_by(
            paciente_id=paciente.id,
            status='ativo'
        ).first()
        if vinculo and vinculo.data_aceite and vinculo.data_aceite >= semana_passada:
            stats['novos_esta_semana'] += 1
        
        # Analisar entradas recentes do paciente
        entradas_recentes = DiaryEntry.query.filter(
            DiaryEntry.user_id == paciente.id,
            DiaryEntry.created_at >= semana_passada
        ).all()
        
        if not entradas_recentes:
            stats['pacientes_sem_atividade'] += 1
        
        # Contar emoções
        for entrada in entradas_recentes:
            emotion = entrada.emotion
            stats['emocoes_mais_comuns'][emotion] = stats['emocoes_mais_comuns'].get(emotion, 0) + 1
            
            # Contar ciclos
            cycle_name = entrada.cycle.name if entrada.cycle else 'Indefinido'
            stats['ciclos_dominantes'][cycle_name] = stats['ciclos_dominantes'].get(cycle_name, 0) + 1
    
    return stats


# ========== AUTENTICAÇÃO ==========

@professional_bp.route('/registro', methods=['GET', 'POST'])
def register():
    """Registro de novo profissional."""
    form = ProfessionalRegistrationForm()
    
    if form.validate_on_submit():
        # Verificar se email já existe
        existing_prof = ProfissionalSaude.query.filter_by(email=form.email.data.lower()).first()
        if existing_prof:
            flash('Este email já está registrado.', 'danger')
            return render_template('professional/register.html', form=form)
        
        # Criar novo profissional
        profissional = ProfissionalSaude(
            nome_completo=form.nome_completo.data,
            email=form.email.data.lower(),
            password=form.password.data,
            tipo_profissional=form.tipo_profissional.data,
            crm_crp=form.crm_crp.data or None,
            especialidade=form.especialidade.data or None,
            telefone=form.telefone.data or None
        )
        
        db.session.add(profissional)
        db.session.commit()
        
        flash('Registro realizado com sucesso! Faça login para continuar.', 'success')
        return redirect(url_for('professional.login'))
    
    return render_template('professional/register.html', form=form)


@professional_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login de profissional."""
    form = ProfessionalLoginForm()
    
    if form.validate_on_submit():
        profissional = ProfissionalSaude.query.filter_by(
            email=form.email.data.lower()
        ).first()
        
        if profissional and profissional.check_password(form.password.data):
            if not profissional.is_active:
                flash('Sua conta está desativada. Entre em contato com o suporte.', 'warning')
                return render_template('professional/login.html', form=form)
            
            login_user(profissional, remember=form.remember_me.data)
            profissional.update_ultima_atividade()
            
            # Redirecionar para página solicitada ou painel
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('professional.painel'))
        else:
            flash('Email ou senha incorretos.', 'danger')
    
    return render_template('professional/login.html', form=form)


@professional_bp.route('/logout')
@professional_login_required
def logout():
    """Logout de profissional."""
    logout_user()
    flash('Logout realizado com sucesso.', 'info')
    return redirect(url_for('professional.login'))


# ========== PAINEL PRINCIPAL ==========

@professional_bp.route('/painel')
@professional_login_required
def painel():
    """Painel principal do profissional."""
    stats = get_professional_dashboard_data(current_user)
    pacientes_ativos = current_user.get_pacientes_ativos()
    
    # Pegar alguns dados recentes de cada paciente
    pacientes_data = []
    for paciente in pacientes_ativos[:10]:  # Limitar a 10 para performance
        vinculo = current_user.vinculos_pacientes.filter_by(
            paciente_id=paciente.id,
            status='ativo'
        ).first()
        
        # Última entrada do paciente
        ultima_entrada = DiaryEntry.query.filter_by(
            user_id=paciente.id
        ).order_by(DiaryEntry.created_at.desc()).first()
        
        # Emoções da última semana
        semana_passada = datetime.utcnow() - timedelta(days=7)
        emocoes_semana = DiaryEntry.query.filter(
            DiaryEntry.user_id == paciente.id,
            DiaryEntry.created_at >= semana_passada
        ).all()
        
        emocoes_count = {}
        for entrada in emocoes_semana:
            emocoes_count[entrada.emotion] = emocoes_count.get(entrada.emotion, 0) + 1
        
        # Emoção dominante
        emocao_dominante = max(emocoes_count.items(), key=lambda x: x[1])[0] if emocoes_count else 'Sem dados'
        
        pacientes_data.append({
            'paciente': paciente,
            'vinculo': vinculo,
            'ultima_entrada': ultima_entrada,
            'emocao_dominante': emocao_dominante,
            'total_entradas_semana': len(emocoes_semana),
            'emocoes_count': emocoes_count
        })
    
    return render_template('professional/painel.html',
                         profissional=current_user,
                         stats=stats,
                         pacientes_data=pacientes_data)


# ========== GERENCIAMENTO DE PACIENTES ==========

@professional_bp.route('/convidar-paciente', methods=['GET', 'POST'])
@professional_login_required
def convidar_paciente():
    """Enviar convite para paciente."""
    form = ConvitePacienteForm()
    
    if form.validate_on_submit():
        email_paciente = form.email_paciente.data.lower()
        
        # Verificar se paciente existe
        paciente = User.query.filter_by(email=email_paciente).first()
        if not paciente:
            flash('Paciente não encontrado no sistema. Convide-o a se registrar primeiro.', 'warning')
            return render_template('professional/convidar_paciente.html', form=form)
        
        # Verificar se já existe vínculo
        vinculo_existente = VinculoProfissionalPaciente.query.filter_by(
            profissional_id=current_user.id,
            paciente_id=paciente.id
        ).first()
        
        if vinculo_existente:
            if vinculo_existente.status == 'ativo':
                flash('Paciente já está vinculado.', 'info')
            elif vinculo_existente.status == 'pendente':
                flash('Convite já foi enviado e está pendente.', 'info')
            elif vinculo_existente.status == 'revogado':
                # Reativar convite
                vinculo_existente.status = 'pendente'
                vinculo_existente.data_convite = datetime.utcnow()
                vinculo_existente.codigo_convite = gerar_codigo_convite()
                db.session.commit()
                flash(f'Novo convite enviado. Código: {vinculo_existente.codigo_convite}', 'success')
            
            return redirect(url_for('professional.painel'))
        
        # Criar novo convite
        codigo = gerar_codigo_convite()
        vinculo = VinculoProfissionalPaciente(
            profissional_id=current_user.id,
            paciente_id=paciente.id,
            codigo_convite=codigo
        )
        
        db.session.add(vinculo)
        db.session.commit()
        
        # TODO: Aqui você pode implementar envio de email
        flash(f'Convite enviado com sucesso! Código: {codigo}', 'success')
        return redirect(url_for('professional.painel'))
    
    return render_template('professional/convidar_paciente.html', form=form)


@professional_bp.route('/paciente/<int:paciente_id>')
@professional_login_required
def ver_paciente(paciente_id):
    """Ver detalhes de um paciente específico."""
    if not current_user.pode_ver_paciente(paciente_id):
        flash('Você não tem permissão para ver este paciente.', 'danger')
        return redirect(url_for('professional.painel'))
    
    paciente = User.query.get_or_404(paciente_id)
    vinculo = current_user.vinculos_pacientes.filter_by(
        paciente_id=paciente_id,
        status='ativo',
        consentimento_ativo=True
    ).first()
    
    # Buscar entradas do diário baseado nas permissões
    query = DiaryEntry.query.filter_by(user_id=paciente_id)
    
    if not vinculo.pode_ver_historico_completo:
        # Apenas últimas 2 semanas se não tem permissão completa
        duas_semanas = datetime.utcnow() - timedelta(days=14)
        query = query.filter(DiaryEntry.created_at >= duas_semanas)
    
    entradas = query.order_by(DiaryEntry.created_at.desc()).limit(50).all()
    
    # Análise de dados para gráficos
    emocoes_count = {}
    ciclos_count = {}
    
    for entrada in entradas:
        if vinculo.pode_ver_emocoes:
            emocoes_count[entrada.emotion] = emocoes_count.get(entrada.emotion, 0) + 1
        if vinculo.pode_ver_ciclos:
            cycle_name = entrada.cycle.name if entrada.cycle else 'Indefinido'
            ciclos_count[cycle_name] = ciclos_count.get(cycle_name, 0) + 1
    
    return render_template('professional/paciente_detalhes.html',
                         paciente=paciente,
                         vinculo=vinculo,
                         entradas=entradas,
                         emocoes_count=emocoes_count,
                         ciclos_count=ciclos_count)


@professional_bp.route('/revocar-acesso/<int:paciente_id>', methods=['POST'])
@professional_login_required
def revogar_acesso(paciente_id):
    """Profissional revoga próprio acesso ao paciente."""
    vinculo = current_user.vinculos_pacientes.filter_by(
        paciente_id=paciente_id,
        status='ativo'
    ).first_or_404()
    
    vinculo.status = 'revogado'
    vinculo.data_revogacao = datetime.utcnow()
    vinculo.motivo_revogacao = 'Revogado pelo profissional'
    db.session.commit()
    
    flash('Acesso ao paciente revogado com sucesso.', 'info')
    return redirect(url_for('professional.painel'))


# ========== API ENDPOINTS ==========

@professional_bp.route('/api/paciente/<int:paciente_id>/emocoes')
@professional_login_required
def api_paciente_emocoes(paciente_id):
    """API para dados de emoções do paciente para gráficos."""
    if not current_user.pode_ver_paciente(paciente_id):
        return jsonify({'error': 'Sem permissão'}), 403
    
    vinculo = current_user.vinculos_pacientes.filter_by(
        paciente_id=paciente_id,
        status='ativo'
    ).first()
    
    if not vinculo.pode_ver_emocoes:
        return jsonify({'error': 'Sem permissão para ver emoções'}), 403
    
    # Buscar dados dos últimos 30 dias
    trinta_dias = datetime.utcnow() - timedelta(days=30)
    entradas = DiaryEntry.query.filter(
        DiaryEntry.user_id == paciente_id,
        DiaryEntry.created_at >= trinta_dias
    ).all()
    
    emocoes_count = {}
    for entrada in entradas:
        emocoes_count[entrada.emotion] = emocoes_count.get(entrada.emotion, 0) + 1
    
    # Preparar dados para Chart.js
    data = {
        'labels': list(emocoes_count.keys()),
        'datasets': [{
            'data': list(emocoes_count.values()),
            'backgroundColor': [
                '#D4AF37', '#00A86B', '#9370DB', '#4682B4', 
                '#FF6347', '#20B2AA', '#BA55D3', '#FF7F50',
                '#3CB371', '#6495ED', '#FF69B4', '#CD853F'
            ][:len(emocoes_count)]
        }]
    }
    
    return jsonify(data)


@professional_bp.route('/api/dashboard-stats')
@professional_login_required
def api_dashboard_stats():
    """API para estatísticas do dashboard."""
    stats = get_professional_dashboard_data(current_user)
    return jsonify(stats)


# ========== ROTAS PARA PACIENTES (aceitar/recusar convites) ==========

@professional_bp.route('/aceitar-convite/<codigo>')
@login_required
def aceitar_convite(codigo):
    """Paciente aceita convite de profissional."""
    # Verificar se usuário atual é um User (paciente), não profissional
    if isinstance(current_user, ProfissionalSaude):
        flash('Profissionais não podem aceitar convites.', 'warning')
        return redirect(url_for('professional.painel'))
    
    vinculo = VinculoProfissionalPaciente.query.filter_by(
        codigo_convite=codigo.upper(),
        paciente_id=current_user.id,
        status='pendente'
    ).first()
    
    if not vinculo:
        flash('Convite não encontrado ou já processado.', 'danger')
        return redirect(url_for('main.index'))
    
    if vinculo.convite_expirou():
        vinculo.status = 'expirado'
        db.session.commit()
        flash('Este convite expirou.', 'warning')
        return redirect(url_for('main.index'))
    
    return render_template('professional/aceitar_convite.html', 
                         vinculo=vinculo)


@professional_bp.route('/confirmar-convite/<codigo>', methods=['POST'])
@login_required
def confirmar_convite(codigo):
    """Paciente confirma aceitação do convite com consentimento."""
    vinculo = VinculoProfissionalPaciente.query.filter_by(
        codigo_convite=codigo.upper(),
        paciente_id=current_user.id,
        status='pendente'
    ).first_or_404()
    
    consentimento_completo = request.form.get('consentimento_completo') == 'true'
    
    # Aceitar convite
    vinculo.aceitar_convite(consentimento_completo)
    
    # Registrar consentimento
    consentimento = ConsentimentoPaciente(
        vinculo_id=vinculo.id,
        acao='concedido',
        permissoes_snapshot=vinculo.get_permissoes_resumo(),
        ip_address=request.remote_addr
    )
    db.session.add(consentimento)
    db.session.commit()
    
    flash(f'Convite aceito! Você está agora conectado com {vinculo.profissional.nome_completo}.', 'success')
    return redirect(url_for('dashboard.index'))


@professional_bp.route('/meus-profissionais')
@login_required
def meus_profissionais():
    """Lista profissionais vinculados ao paciente."""
    if isinstance(current_user, ProfissionalSaude):
        return redirect(url_for('professional.painel'))
    
    vinculos = current_user.vinculos_profissionais.filter_by(status='ativo').all()
    
    return render_template('professional/meus_profissionais.html', 
                         vinculos=vinculos)


@professional_bp.route('/revogar-consentimento/<int:vinculo_id>', methods=['POST'])
@login_required
def revogar_consentimento_paciente(vinculo_id):
    """Paciente revoga consentimento para profissional."""
    vinculo = VinculoProfissionalPaciente.query.filter_by(
        id=vinculo_id,
        paciente_id=current_user.id
    ).first_or_404()
    
    motivo = request.form.get('motivo', 'Sem motivo especificado')
    vinculo.revogar_consentimento(motivo)
    
    # Registrar revogação
    consentimento = ConsentimentoPaciente(
        vinculo_id=vinculo.id,
        acao='revogado',
        motivo=motivo,
        ip_address=request.remote_addr
    )
    db.session.add(consentimento)
    db.session.commit()
    
    flash('Consentimento revogado com sucesso.', 'info')
    return redirect(url_for('professional.meus_profissionais')) 