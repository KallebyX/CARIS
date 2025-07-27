import { NextResponse, NextRequest } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"

// Mock data - em produção seria do banco de dados
const mockPrescribedTasks = [
  {
    id: 'task_001',
    taskId: 'tcc-001',
    patientId: 1,
    psychologistId: 2,
    prescribedAt: new Date('2024-01-15'),
    dueDate: new Date('2024-01-22'),
    status: 'pending',
    notes: 'Foque especialmente em identificar pensamentos sobre trabalho'
  },
  {
    id: 'task_002', 
    taskId: 'act-001',
    patientId: 1,
    psychologistId: 2,
    prescribedAt: new Date('2024-01-10'),
    dueDate: null,
    status: 'completed',
    notes: 'Pratique quando sentir ansiedade',
    patientFeedback: 'Ajudou muito com a ansiedade matinal',
    completedAt: new Date('2024-01-12')
  }
]

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Buscar tarefas prescritas para o paciente
    const patientTasks = mockPrescribedTasks.filter(task => task.patientId === userId)

    return NextResponse.json({
      success: true,
      tasks: patientTasks
    })

  } catch (error) {
    console.error('Error fetching patient tasks:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}