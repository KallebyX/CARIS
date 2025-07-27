import { SessionManager } from '@/components/videotherapy/session-manager'
import { getUserIdFromRequest } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'

export default async function VideotherapyPage() {
  // Verificar autenticação
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  let userId: number
  let userRole: 'patient' | 'psychologist'
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number, role: string }
    
    if (decoded.role !== 'patient' && decoded.role !== 'psychologist') {
      redirect('/dashboard')
    }
    
    userId = decoded.userId
    userRole = decoded.role as 'patient' | 'psychologist'
  } catch (error) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto p-6">
      <SessionManager userId={userId} userRole={userRole} />
    </div>
  )
}