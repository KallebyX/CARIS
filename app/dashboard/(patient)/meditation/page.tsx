import { MeditationLibraryComponent } from '@/components/meditation/meditation-library'
import { getUserIdFromRequest } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'

export default async function MeditationPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Centro de Meditação</h1>
        <p className="text-gray-600">
          Explore nossa biblioteca de meditações guiadas e desenvolva uma prática consistente de mindfulness.
        </p>
      </div>
      
      <MeditationLibraryComponent userId={userId} />
    </div>
  )
}