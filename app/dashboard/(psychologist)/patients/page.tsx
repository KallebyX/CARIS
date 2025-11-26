"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Eye, Edit, Calendar, Download, Filter } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "@/lib/i18n"

interface Patient {
  id: number
  name: string
  email: string
  currentCycle: string | null
  status: string
  lastActivity: string
  nextSession: string
}

export default function PatientsPage() {
  const t = useTranslations("psychologist.patientsPage")
  const [searchTerm, setSearchTerm] = useState("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("/api/psychologist/patients")
        if (res.ok) {
          const data = await res.json()
          setPatients(data)
        }
      } catch (error) {
        console.error("Failed to fetch patients:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPatients()
  }, [])

  const getCycleColor = (cycle: string | null) => {
    const colors = {
      criar: "bg-emerald-500",
      cuidar: "bg-blue-500",
      crescer: "bg-purple-500",
      curar: "bg-orange-500",
    }
    return colors[cycle as keyof typeof colors] || "bg-gray-500"
  }

  const getStatusColor = (status: string) => {
    return status === "Ativo" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
  }

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t("title")}</h1>
          <p className="text-gray-600">{t("subtitle")}</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            {t("export")}
          </Button>
          <Button className="bg-[#2D9B9B] hover:bg-[#238B8B]" asChild>
            <Link href="/dashboard/patients/new">
              <Plus className="w-4 h-4 mr-2" />
              {t("newPatient")}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("patientList")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t("searchPatients")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {t("filters")}
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tableHeaders.name")}</TableHead>
                  <TableHead>{t("tableHeaders.currentCycle")}</TableHead>
                  <TableHead>{t("tableHeaders.lastActivity")}</TableHead>
                  <TableHead>{t("tableHeaders.status")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-800">{patient.name}</p>
                          <p className="text-sm text-gray-600">{patient.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getCycleColor(patient.currentCycle)}`}></div>
                          <span className="text-sm font-medium capitalize">{patient.currentCycle || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{patient.lastActivity}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(patient.status)}>{patient.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/patients/${patient.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t("actions.viewDetails")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              {t("actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="w-4 h-4 mr-2" />
                              {t("actions.scheduleSession")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
