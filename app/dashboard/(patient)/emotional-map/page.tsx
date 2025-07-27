import { EmotionalDashboard } from '@/components/emotional-map/emotional-dashboard'
import { getUserIdFromRequest } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'

export default async function EmotionalMapPage() {
  // Verificar autenticação
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  let userId: number
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number, role: string }
    
    if (decoded.role !== 'patient') {
      redirect('/dashboard')
    }
    
    userId = decoded.userId
  } catch (error) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Mapa Emocional</h1>
        <p className="text-muted-foreground mt-2">
          Visualize e analise seus padrões emocionais com insights gerados por IA
        </p>
      </div>
      
      <EmotionalDashboard userId={userId} />
    </div>
  )
}