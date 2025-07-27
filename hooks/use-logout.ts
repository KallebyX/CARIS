"use client"

import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useState } from "react"

export function useLogout() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = async (showToast = true) => {
    if (isLoggingOut) return

    setIsLoggingOut(true)

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Limpa o localStorage
        if (typeof window !== "undefined") {
          localStorage.clear()
          sessionStorage.clear()

          // Remove dados específicos do app se existirem
          localStorage.removeItem("user")
          localStorage.removeItem("token")
          localStorage.removeItem("preferences")
        }

        if (showToast) {
          toast({
            title: "Desconectado",
            description: "Você foi desconectado com sucesso.",
            variant: "default",
          })
        }

        // Pequeno delay para garantir que o toast seja exibido
        setTimeout(() => {
          // Força recarregamento completo da página para limpar qualquer estado
          window.location.href = "/login"
        }, 500)
      } else {
        throw new Error(data.error || "Falha ao fazer logout")
      }
    } catch (error) {
      console.error("Erro no logout:", error)

      if (showToast) {
        toast({
          title: "Erro",
          description: "Não foi possível fazer o logout. Redirecionando...",
          variant: "destructive",
        })
      }

      // Mesmo com erro, redireciona para login por segurança
      setTimeout(() => {
        window.location.href = "/login"
      }, 1000)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return { logout, isLoggingOut }
}
