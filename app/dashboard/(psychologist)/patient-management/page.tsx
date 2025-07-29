"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Users, Target, Bell, FileText } from "lucide-react"
import { CustomFieldsManager } from "@/components/patient-management/custom-fields-manager"
import { GoalsManager } from "@/components/patient-management/goals-manager"
import { ReportsGenerator } from "@/components/patient-management/reports-generator"

export default function PatientManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Gestão Avançada de Pacientes</h1>
        <p className="text-gray-600">Configure e gerencie campos customizados, metas e relatórios para seus pacientes</p>
      </div>

      <Tabs defaultValue="custom-fields" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="custom-fields">
            <Settings className="w-4 h-4 mr-2" />
            Campos Customizados
          </TabsTrigger>
          <TabsTrigger value="goals">
            <Target className="w-4 h-4 mr-2" />
            Metas Gerais
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-2" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="w-4 h-4 mr-2" />
            Alertas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="custom-fields">
          <CustomFieldsManager />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsManager showPatientInfo={true} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsGenerator />
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-600" />
                Configuração de Alertas
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Configure alertas automáticos para acompanhamento de pacientes
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Sistema de alertas em desenvolvimento.</p>
                <p className="text-sm">Em breve você poderá configurar alertas personalizados.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}