'use client'

import React, { useState, useEffect } from 'react'
import { AIClinicalDashboard } from '@/components/ai-clinical/ai-clinical-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Users, Brain } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'

interface Patient {
  id: number
  name: string
  email: string
  currentCycle?: string
  lastSession?: string
  riskLevel?: string
}

export default function AIAssistantPage() {
  const t = useTranslations("psychologist.aiAssistantPage")
  const [selectedPatient, setSelectedPatient] = useState<number | undefined>()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch psychologist's patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/psychologist/patients')
        const data = await response.json()
        
        if (data.success) {
          setPatients(data.data)
        }
      } catch (error) {
        console.error('Error fetching patients:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("selectPatient")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t("selectDescription")}
              </label>
              <Select
                value={selectedPatient?.toString()}
                onValueChange={(value) => setSelectedPatient(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{patient.name}</span>
                        {patient.riskLevel && (
                          <Badge 
                            variant={patient.riskLevel === 'high' ? 'destructive' : 'secondary'}
                            className="ml-2"
                          >
                            {patient.riskLevel}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPatient && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("selectedPatient")}</label>
                <div className="p-3 bg-muted rounded-lg">
                  {(() => {
                    const patient = patients.find(p => p.id === selectedPatient)
                    return patient ? (
                      <div>
                        <p className="font-semibold">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">{patient.email}</p>
                        {patient.currentCycle && (
                          <Badge variant="outline" className="mt-1">
                            {patient.currentCycle}
                          </Badge>
                        )}
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Clinical Dashboard */}
      <AIClinicalDashboard 
        patientId={selectedPatient} 
        psychologistId={1} // This would come from auth context
      />
    </div>
  )
}