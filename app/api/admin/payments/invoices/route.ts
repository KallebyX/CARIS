import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { users, invoices, subscriptions } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true, isGlobalAdmin: true }
    })

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status") // 'paid', 'open', 'void', etc.

    // Get recent invoices
    let query = db
      .select({
        id: invoices.id,
        userId: invoices.userId,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        amountDue: invoices.amountDue,
        amountPaid: invoices.amountPaid,
        currency: invoices.currency,
        description: invoices.description,
        invoiceUrl: invoices.invoiceUrl,
        hostedInvoiceUrl: invoices.hostedInvoiceUrl,
        invoicePdf: invoices.invoicePdf,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
        subscriptionId: invoices.subscriptionId,
      })
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)

    const invoiceList = await query

    // Get user details for each invoice
    const invoicesWithDetails = await Promise.all(
      invoiceList.map(async (invoice) => {
        const invoiceUser = await db.query.users.findFirst({
          where: eq(users.id, invoice.userId),
          columns: {
            id: true,
            name: true,
            email: true,
          }
        })

        let subscription = null
        if (invoice.subscriptionId) {
          subscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.id, invoice.subscriptionId),
            columns: {
              planName: true,
            }
          })
        }

        return {
          ...invoice,
          amountDue: invoice.amountDue / 100, // Convert from cents
          amountPaid: invoice.amountPaid / 100,
          user: invoiceUser || { id: invoice.userId, name: "Usuario desconhecido", email: "" },
          subscription: subscription || null,
        }
      })
    )

    return NextResponse.json({ success: true, data: invoicesWithDetails })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
