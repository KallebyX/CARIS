from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from .user import db

class ProfissionalSaude(db.Model, UserMixin):
    """Modelo para profissionais da saúde (psicólogos, terapeutas, coaches)."""
    __tablename__ = 'profissionais_saude'
    
    id = db.Column(db.Integer, primary_key=True)
    nome_completo = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.Text, nullable=False)
    
    # Dados profissionais
    crm_crp = db.Column(db.String(20), nullable=True)  # CRM para médicos, CRP para psicólogos
    tipo_profissional = db.Column(db.String(50), nullable=False)  # psicologo, terapeuta, coach, etc
    especialidade = db.Column(db.String(100), nullable=True)
    telefone = db.Column(db.String(20), nullable=True)
    
    # Endereço profissional
    endereco = db.Column(db.String(200), nullable=True)
    cidade = db.Column(db.String(100), nullable=True)
    estado = db.Column(db.String(2), nullable=True)
    cep = db.Column(db.String(10), nullable=True)
    
    # Configurações e status
    is_verified = db.Column(db.Boolean, default=False)  # Verificação profissional
    is_active = db.Column(db.Boolean, default=True)
    aceita_novos_pacientes = db.Column(db.Boolean, default=True)
    
    # Timestamps
    data_cadastro = db.Column(db.DateTime, default=datetime.utcnow)
    ultima_atividade = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    vinculos_pacientes = db.relationship(
        'VinculoProfissionalPaciente', 
        backref='profissional', 
        lazy='dynamic',
        cascade='all, delete-orphan'
    )
    
    def __init__(self, nome_completo, email, password, tipo_profissional, **kwargs):
        self.nome_completo = nome_completo
        self.email = email
        self.tipo_profissional = tipo_profissional
        self.set_password(password)
        
        # Campos opcionais
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def set_password(self, password):
        """Define hash da senha."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verifica se a senha está correta."""
        return check_password_hash(self.password_hash, password)
    
    def update_ultima_atividade(self):
        """Atualiza timestamp da última atividade."""
        self.ultima_atividade = datetime.utcnow()
        db.session.commit()
    
    def get_pacientes_ativos(self):
        """Retorna lista de pacientes com consentimento ativo."""
        return [v.paciente for v in self.vinculos_pacientes.filter_by(
            status='ativo', consentimento_ativo=True
        ).all()]
    
    def get_total_pacientes(self):
        """Retorna total de pacientes vinculados."""
        return self.vinculos_pacientes.filter_by(status='ativo').count()
    
    def pode_ver_paciente(self, user_id):
        """Verifica se profissional tem permissão para ver dados do paciente."""
        vinculo = self.vinculos_pacientes.filter_by(
            paciente_id=user_id,
            status='ativo',
            consentimento_ativo=True
        ).first()
        return vinculo is not None
    
    def __repr__(self):
        return f'<ProfissionalSaude {self.nome_completo} - {self.tipo_profissional}>'


class VinculoProfissionalPaciente(db.Model):
    """Modelo para vínculo entre profissional e paciente com controle de consentimento."""
    __tablename__ = 'vinculos_profissional_paciente'
    
    id = db.Column(db.Integer, primary_key=True)
    profissional_id = db.Column(db.Integer, db.ForeignKey('profissionais_saude.id'), nullable=False)
    paciente_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Controle de convite e aceitação
    codigo_convite = db.Column(db.String(32), unique=True, nullable=False)
    data_convite = db.Column(db.DateTime, default=datetime.utcnow)
    data_aceite = db.Column(db.DateTime, nullable=True)
    data_revogacao = db.Column(db.DateTime, nullable=True)
    
    # Status do vínculo
    status = db.Column(
        db.String(20), 
        default='pendente'  # pendente, ativo, revogado, expirado
    )
    
    # Controle de consentimento
    consentimento_ativo = db.Column(db.Boolean, default=False)
    data_consentimento = db.Column(db.DateTime, nullable=True)
    motivo_revogacao = db.Column(db.String(200), nullable=True)
    
    # Configurações de acesso
    pode_ver_historico_completo = db.Column(db.Boolean, default=True)
    pode_ver_emocoes = db.Column(db.Boolean, default=True)
    pode_ver_ciclos = db.Column(db.Boolean, default=True)
    pode_ver_rituais = db.Column(db.Boolean, default=False)  # Mais sensível
    
    # Notas profissionais (opcional)
    notas_profissional = db.Column(db.Text, nullable=True)
    
    # Relacionamentos
    paciente = db.relationship('User', backref=db.backref('vinculos_profissionais', lazy='dynamic'))
    
    def __init__(self, profissional_id, paciente_id, codigo_convite):
        self.profissional_id = profissional_id
        self.paciente_id = paciente_id
        self.codigo_convite = codigo_convite
    
    def aceitar_convite(self, consentimento_completo=True):
        """Paciente aceita o convite e concede consentimento."""
        self.status = 'ativo'
        self.consentimento_ativo = True
        self.data_aceite = datetime.utcnow()
        self.data_consentimento = datetime.utcnow()
        
        if not consentimento_completo:
            # Consentimento parcial - apenas dados básicos
            self.pode_ver_historico_completo = False
            self.pode_ver_rituais = False
        
        db.session.commit()
    
    def revogar_consentimento(self, motivo=None):
        """Paciente revoga o consentimento de acesso."""
        self.status = 'revogado'
        self.consentimento_ativo = False
        self.data_revogacao = datetime.utcnow()
        self.motivo_revogacao = motivo
        db.session.commit()
    
    def reativar_consentimento(self):
        """Paciente reativa o consentimento."""
        self.status = 'ativo'
        self.consentimento_ativo = True
        self.data_consentimento = datetime.utcnow()
        self.data_revogacao = None
        self.motivo_revogacao = None
        db.session.commit()
    
    def dias_desde_convite(self):
        """Retorna quantos dias se passaram desde o convite."""
        return (datetime.utcnow() - self.data_convite).days
    
    def convite_expirou(self, dias_expiracao=30):
        """Verifica se o convite expirou (padrão: 30 dias)."""
        return self.dias_desde_convite() > dias_expiracao and self.status == 'pendente'
    
    def get_permissoes_resumo(self):
        """Retorna resumo das permissões concedidas."""
        return {
            'historico_completo': self.pode_ver_historico_completo,
            'emocoes': self.pode_ver_emocoes,
            'ciclos': self.pode_ver_ciclos,
            'rituais': self.pode_ver_rituais
        }
    
    def __repr__(self):
        return f'<VinculoProfissionalPaciente {self.profissional_id}-{self.paciente_id} ({self.status})>'


class ConsentimentoPaciente(db.Model):
    """Modelo para histórico detalhado de consentimentos do paciente."""
    __tablename__ = 'consentimentos_paciente'
    
    id = db.Column(db.Integer, primary_key=True)
    vinculo_id = db.Column(db.Integer, db.ForeignKey('vinculos_profissional_paciente.id'), nullable=False)
    
    # Tipo de ação
    acao = db.Column(db.String(20), nullable=False)  # concedido, revogado, modificado
    data_acao = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Detalhes da permissão no momento da ação
    permissoes_snapshot = db.Column(db.JSON)  # Snapshot das permissões
    motivo = db.Column(db.String(200), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)  # Para auditoria
    
    # Relacionamentos
    vinculo = db.relationship('VinculoProfissionalPaciente', backref='historico_consentimentos')
    
    def __repr__(self):
        return f'<ConsentimentoPaciente {self.vinculo_id} - {self.acao} em {self.data_acao}>'


# Funções auxiliares para geração de códigos únicos
import secrets
import string

def gerar_codigo_convite(length=8):
    """Gera código único para convite de paciente."""
    alphabet = string.ascii_uppercase + string.digits
    codigo = ''.join(secrets.choice(alphabet) for _ in range(length))
    
    # Verifica se já existe no banco
    while VinculoProfissionalPaciente.query.filter_by(codigo_convite=codigo).first():
        codigo = ''.join(secrets.choice(alphabet) for _ in range(length))
    
    return codigo 