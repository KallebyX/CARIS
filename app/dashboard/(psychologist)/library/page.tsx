"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, FileText, Video, Mic, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const libraryItems = [
  { id: 1, type: "Artigo", title: "Entendendo a Ansiedade", category: "Psicoeducação", icon: FileText },
  { id: 2, type: "Exercício", title: "Técnica de Respiração 4-7-8", category: "Relaxamento", icon: Mic },
  { id: 3, type: "Vídeo", title: "Introdução ao Mindfulness", category: "Meditação", icon: Video },
  { id: 4, type: "Artigo", title: "O Ciclo do Hábito", category: "TCC", icon: FileText },
  { id: 5, type: "Exercício", title: "Diário de Gratidão", category: "Psicologia Positiva", icon: Mic },
  { id: 6, type: "Vídeo", title: "Comunicação Não-Violenta", category: "Relacionamentos", icon: Video },
]

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Biblioteca de Conteúdos</h1>
          <p className="text-slate-600">Gerencie e prescreva materiais para seus pacientes.</p>
        </div>
        <Button className="bg-caris-teal hover:bg-caris-teal/90">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Material
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <Tabs defaultValue="all">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="articles">Artigos</TabsTrigger>
                <TabsTrigger value="videos">Vídeos</TabsTrigger>
                <TabsTrigger value="exercises">Exercícios</TabsTrigger>
              </TabsList>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar na biblioteca..." className="pl-9" />
              </div>
            </div>
            <TabsContent value="all">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {libraryItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-2 rounded-lg">
                            <item.icon className="w-6 h-6 text-caris-teal" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">{item.type}</p>
                            <p className="font-semibold text-slate-700">{item.title}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Prescrever</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-auto pt-4">
                        <Button variant="outline" size="sm" className="w-full bg-transparent">
                          Pré-visualizar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
