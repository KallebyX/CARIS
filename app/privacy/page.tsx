import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
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
            Política de Privacidade
          </h1>
          <p className="text-slate-500 mb-8">Última atualização: Dezembro de 2025</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">1. Introdução</h2>
              <p className="text-slate-600 leading-relaxed">
                A CÁRIS ("nós", "nosso" ou "plataforma") está comprometida em proteger a privacidade e os dados pessoais de nossos usuários. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações quando você utiliza nossa plataforma de saúde mental.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">2. Dados que Coletamos</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Para fornecer nossos serviços, coletamos os seguintes tipos de informações:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li><strong>Dados de Identificação:</strong> Nome, e-mail, telefone e foto de perfil.</li>
                <li><strong>Dados de Saúde:</strong> Registros de humor, entradas de diário, histórico de sessões terapêuticas e informações compartilhadas durante o uso da plataforma.</li>
                <li><strong>Dados de Uso:</strong> Informações sobre como você interage com a plataforma, incluindo páginas visitadas e funcionalidades utilizadas.</li>
                <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, dispositivo e sistema operacional.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">3. Como Usamos seus Dados</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Utilizamos suas informações para:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Fornecer e personalizar nossos serviços de acompanhamento terapêutico.</li>
                <li>Permitir a comunicação entre pacientes e profissionais de saúde mental.</li>
                <li>Melhorar continuamente nossa plataforma e experiência do usuário.</li>
                <li>Garantir a segurança e prevenir atividades fraudulentas.</li>
                <li>Cumprir obrigações legais e regulatórias.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">4. Proteção de Dados Sensíveis</h2>
              <p className="text-slate-600 leading-relaxed">
                Por se tratar de uma plataforma de saúde mental, tratamos todos os dados relacionados à sua saúde com o máximo cuidado e sigilo. Implementamos medidas técnicas e organizacionais robustas, incluindo criptografia de ponta a ponta, controles de acesso rigorosos e auditorias regulares de segurança. O acesso aos seus dados de saúde é restrito apenas aos profissionais de saúde autorizados envolvidos no seu atendimento.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">5. Compartilhamento de Dados</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Não vendemos seus dados pessoais. Podemos compartilhar informações apenas nas seguintes situações:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Com profissionais de saúde envolvidos no seu atendimento.</li>
                <li>Com prestadores de serviços essenciais (hospedagem, processamento de pagamentos).</li>
                <li>Quando exigido por lei ou ordem judicial.</li>
                <li>Em situações de emergência que envolvam risco à vida.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">6. Seus Direitos (LGPD)</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Confirmar a existência de tratamento de dados.</li>
                <li>Acessar seus dados pessoais.</li>
                <li>Corrigir dados incompletos ou desatualizados.</li>
                <li>Solicitar a anonimização ou eliminação de dados desnecessários.</li>
                <li>Solicitar a portabilidade dos dados.</li>
                <li>Revogar o consentimento a qualquer momento.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">7. Retenção de Dados</h2>
              <p className="text-slate-600 leading-relaxed">
                Mantemos seus dados pelo tempo necessário para fornecer nossos serviços e cumprir obrigações legais. Para dados de saúde, seguimos as diretrizes do Conselho Federal de Psicologia (CFP), que estabelece um período mínimo de guarda de 5 anos após o último atendimento. Após esse período, você pode solicitar a exclusão dos seus dados.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">8. Contato</h2>
              <p className="text-slate-600 leading-relaxed">
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato conosco através do e-mail:{" "}
                <a href="mailto:privacidade@caris.com.br" className="text-teal-600 hover:text-teal-700">
                  privacidade@caris.com.br
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
