import { CrisisButton } from '@/components/sos/crisis-button'
import { getUserIdFromRequest } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'

export default async function SOSPage() {
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
    <div className="container mx-auto p-6 max-w-4xl">
      <CrisisButton 
        userId={userId} 
        onActivate={() => {
          // Callback quando SOS é ativado
          console.log('SOS ativado para usuário:', userId)
        }}
      />
    </div>
  )
}