"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Settings } from "lucide-react"
import { toast } from "react-hot-toast"

interface CustomField {
  id: number
  fieldName: string
  fieldType: string
  fieldOptions?: string
  isRequired: boolean
  displayOrder: number
  createdAt: string
}

export function CustomFieldsManager() {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)

  const [formData, setFormData] = useState({
    fieldName: "",
    fieldType: "text",
    fieldOptions: "",
    isRequired: false,
    displayOrder: 0,
  })

  useEffect(() => {
    fetchFields()
  }, [])

  const fetchFields = async () => {
    try {
      const response = await fetch("/api/psychologist/custom-fields")
      if (response.ok) {
        const data = await response.json()
        setFields(data.data || [])
      } else {
        toast.error("Erro ao carregar campos customizados")
      }
    } catch (error) {
      toast.error("Erro ao carregar campos customizados")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch("/api/psychologist/custom-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          fieldOptions: formData.fieldType === "select" ? formData.fieldOptions.split(",").map(o => o.trim()) : null,
        }),
      })

      if (response.ok) {
        toast.success("Campo criado com sucesso!")
        setDialogOpen(false)
        resetForm()
        fetchFields()
      } else {
        toast.error("Erro ao criar campo")
      }
    } catch (error) {
      toast.error("Erro ao criar campo")
    }
  }

  const resetForm = () => {
    setFormData({
      fieldName: "",
      fieldType: "text",
      fieldOptions: "",
      isRequired: false,
      displayOrder: 0,
    })
    setEditingField(null)
  }

  const getFieldTypeLabel = (type: string) => {
    const types = {
      text: "Texto",
      number: "Número",
      select: "Seleção",
      date: "Data",
      boolean: "Sim/Não"
    }
    return types[type as keyof typeof types] || type
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Campos Customizados
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Configure campos personalizados para seus pacientes
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Campo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingField ? "Editar Campo" : "Novo Campo Customizado"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="fieldName">Nome do Campo</Label>
                  <Input
                    id="fieldName"
                    value={formData.fieldName}
                    onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                    placeholder="Ex: Medicamentos atuais"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="fieldType">Tipo de Campo</Label>
                  <Select
                    value={formData.fieldType}
                    onValueChange={(value) => setFormData({ ...formData, fieldType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="select">Seleção</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="boolean">Sim/Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.fieldType === "select" && (
                  <div>
                    <Label htmlFor="fieldOptions">Opções (separadas por vírgula)</Label>
                    <Input
                      id="fieldOptions"
                      value={formData.fieldOptions}
                      onChange={(e) => setFormData({ ...formData, fieldOptions: e.target.value })}
                      placeholder="Opção 1, Opção 2, Opção 3"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isRequired"
                    checked={formData.isRequired}
                    onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                  />
                  <Label htmlFor="isRequired">Campo obrigatório</Label>
                </div>

                <div>
                  <Label htmlFor="displayOrder">Ordem de Exibição</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                    {editingField ? "Salvar" : "Criar Campo"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Carregando campos...</div>
        ) : fields.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum campo customizado criado ainda.</p>
            <p className="text-sm">Clique em "Novo Campo" para começar.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Campo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.fieldName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getFieldTypeLabel(field.fieldType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {field.isRequired ? (
                        <Badge variant="destructive">Obrigatório</Badge>
                      ) : (
                        <Badge variant="outline">Opcional</Badge>
                      )}
                    </TableCell>
                    <TableCell>{field.displayOrder}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingField(field)
                            setFormData({
                              fieldName: field.fieldName,
                              fieldType: field.fieldType,
                              fieldOptions: field.fieldOptions || "",
                              isRequired: field.isRequired,
                              displayOrder: field.displayOrder,
                            })
                            setDialogOpen(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}