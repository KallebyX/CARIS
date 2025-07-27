import { MeditationAudioManager } from '@/components/admin/meditation/meditation-audio-manager'
import { getUserIdFromRequest } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'

export default async function MeditationManagementPage() {
  // Verificar autenticação e autorização
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number, role: string }
    
    if (decoded.role !== 'admin') {
      redirect('/dashboard')
    }
  } catch (error) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Meditação</h1>
        <p className="text-gray-600">
          Gerencie a biblioteca de áudios de meditação, categorias e conteúdo da plataforma.
        </p>
      </div>
      
      <MeditationAudioManager />
    </div>
  )
}