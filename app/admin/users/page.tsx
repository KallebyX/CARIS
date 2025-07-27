"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, UserPlus, ShieldCheck, UserCog } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const users = [
  {
    id: 1,
    name: "Dr. Carlos Andrade",
    email: "carlos.andrade@caris.com",
    role: "Psicólogo",
    status: "Ativo",
    plan: "Profissional",
    joined: "2024-05-10",
  },
  {
    id: 2,
    name: "Ana Silva",
    email: "ana.silva@email.com",
    role: "Paciente",
    status: "Ativo",
    plan: "N/A",
    joined: "2024-06-20",
  },
  {
    id: 3,
    name: "Clínica Bem Estar",
    email: "contato@bemestar.com",
    role: "Admin Clínica",
    status: "Ativo",
    plan: "Clínica",
    joined: "2024-03-15",
  },
  {
    id: 4,
    name: "Dr. Joana Lima",
    email: "joana.lima@caris.com",
    role: "Psicólogo",
    status: "Pendente",
    plan: "Essencial",
    joined: "2024-07-10",
  },
]

export default function AdminUsersPage() {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Psicólogo":
        return "bg-blue-100 text-blue-800"
      case "Paciente":
        return "bg-green-100 text-green-800"
      case "Admin Clínica":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gerenciamento de Usuários</h1>
          <p className="text-slate-600">Visualize e administre todos os usuários da plataforma.</p>
        </div>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Adicionar Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Todos os Usuários</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`/placeholder.svg?height=40&width=40&query=${user.name}`} />
                          <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadge(user.role)}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "Ativo" ? "default" : "outline"}
                        className={user.status === "Ativo" ? "bg-green-500" : ""}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.plan}</TableCell>
                    <TableCell>{new Date(user.joined).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <UserCog className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Verificar CRP
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Suspender</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
