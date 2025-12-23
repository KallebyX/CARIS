import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors group mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Início
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
            Termos de Uso
          </h1>
          <p className="text-slate-500 mb-8">Última atualização: Dezembro de 2025</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">1. Aceitação dos Termos</h2>
              <p className="text-slate-600 leading-relaxed">
                Ao acessar e utilizar a plataforma CÁRIS, você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve utilizar nossos serviços. A CÁRIS reserva-se o direito de atualizar estes termos a qualquer momento, notificando os usuários sobre alterações significativas.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">2. Descrição do Serviço</h2>
              <p className="text-slate-600 leading-relaxed">
                A CÁRIS é uma plataforma digital que oferece ferramentas para acompanhamento terapêutico, incluindo registro de diário emocional, comunicação com profissionais de saúde mental, agendamento de sessões, exercícios de bem-estar e meditação guiada. A plataforma é destinada a pacientes e profissionais de psicologia devidamente registrados.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">3. Elegibilidade</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Para utilizar a CÁRIS, você deve:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Ter pelo menos 18 anos de idade ou consentimento de responsável legal.</li>
                <li>Fornecer informações verdadeiras e atualizadas durante o cadastro.</li>
                <li>Para profissionais: possuir registro ativo no Conselho Regional de Psicologia (CRP).</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">4. Não Substituição de Atendimento Presencial</h2>
              <p className="text-slate-600 leading-relaxed">
                <strong className="text-red-600">Importante:</strong> A CÁRIS é uma ferramenta de apoio e não substitui o atendimento psicológico ou psiquiátrico presencial. Em caso de emergência, crise ou ideação suicida, procure imediatamente o CVV (188), SAMU (192) ou vá ao pronto-socorro mais próximo. A plataforma não oferece atendimento de emergência 24 horas.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">5. Responsabilidades do Usuário</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Ao utilizar a CÁRIS, você concorda em:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Manter a confidencialidade de sua senha e dados de acesso.</li>
                <li>Não compartilhar sua conta com terceiros.</li>
                <li>Utilizar a plataforma de forma ética e respeitosa.</li>
                <li>Não publicar conteúdo ilegal, ofensivo ou que viole direitos de terceiros.</li>
                <li>Comunicar imediatamente qualquer uso não autorizado de sua conta.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">6. Responsabilidades dos Profissionais</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Profissionais de psicologia que utilizam a plataforma devem:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Manter registro ativo e regular no CRP.</li>
                <li>Seguir o Código de Ética Profissional do Psicólogo.</li>
                <li>Garantir o sigilo das informações dos pacientes.</li>
                <li>Utilizar a plataforma de forma compatível com a prática profissional ética.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">7. Propriedade Intelectual</h2>
              <p className="text-slate-600 leading-relaxed">
                Todo o conteúdo da plataforma CÁRIS, incluindo textos, gráficos, logos, ícones, imagens, áudios de meditação e software, é propriedade da CÁRIS ou de seus licenciadores e está protegido por leis de propriedade intelectual. O uso não autorizado deste conteúdo é proibido.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">8. Pagamentos e Assinaturas</h2>
              <p className="text-slate-600 leading-relaxed">
                Alguns recursos da plataforma podem exigir assinatura paga. Os valores, formas de pagamento e políticas de cancelamento e reembolso serão apresentados claramente antes da contratação. A CÁRIS utiliza processadores de pagamento seguros e não armazena dados completos de cartão de crédito.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">9. Limitação de Responsabilidade</h2>
              <p className="text-slate-600 leading-relaxed">
                A CÁRIS fornece a plataforma "como está" e não garante resultados terapêuticos específicos. Não somos responsáveis por decisões tomadas com base nas informações disponíveis na plataforma, nem por ações ou omissões de profissionais de saúde cadastrados. A responsabilidade pelo atendimento é exclusiva do profissional.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">10. Encerramento de Conta</h2>
              <p className="text-slate-600 leading-relaxed">
                Você pode encerrar sua conta a qualquer momento através das configurações da plataforma. A CÁRIS pode suspender ou encerrar contas que violem estes Termos de Uso, sem aviso prévio. Em caso de encerramento, seus dados serão tratados conforme nossa Política de Privacidade.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">11. Foro e Legislação Aplicável</h2>
              <p className="text-slate-600 leading-relaxed">
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca de São Paulo, SP, com exclusão de qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">12. Contato</h2>
              <p className="text-slate-600 leading-relaxed">
                Para dúvidas sobre estes Termos de Uso, entre em contato conosco através do e-mail:{" "}
                <a href="mailto:contato@caris.com.br" className="text-teal-600 hover:text-teal-700">
                  contato@caris.com.br
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
