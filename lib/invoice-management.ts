/**
 * Invoice Management System
 *
 * Handles:
 * - Invoice generation
 * - Email notifications
 * - Payment tracking
 * - Storage and retrieval
 * - PDF generation
 */

import Stripe from 'stripe'
import { stripe } from './stripe'
import { db } from '@/db'
import { invoices, subscriptions, users } from '@/db/schema'
import { eq, desc, and, gte, lte } from 'drizzle-orm'
import { sendEmail } from './email'
import jsPDF from 'jspdf'

export interface InvoiceData {
  id: string
  invoiceNumber: string
  status: string
  customerName: string
  customerEmail: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  amountPaid: number
  amountDue: number
  currency: string
  dueDate: Date | null
  paidAt: Date | null
  createdAt: Date
  stripeInvoiceUrl?: string
  stripePdfUrl?: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitAmount: number
  amount: number
}

export interface InvoiceFilters {
  userId?: number
  status?: string
  startDate?: Date
  endDate?: Date
  minAmount?: number
  maxAmount?: number
}

export class InvoiceManager {
  /**
   * Get invoice by ID
   */
  static async getInvoice(invoiceId: string): Promise<InvoiceData | null> {
    try {
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
        with: {
          user: true,
          subscription: true,
        },
      })

      if (!invoice) return null

      // Fetch full details from Stripe
      const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId, {
        expand: ['lines.data'],
      })

      return this.mapStripeInvoiceToInvoiceData(stripeInvoice, invoice.user)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      return null
    }
  }

  /**
   * Get invoices for user
   */
  static async getUserInvoices(
    userId: number,
    filters?: InvoiceFilters,
    limit: number = 50
  ): Promise<InvoiceData[]> {
    try {
      let query = db.query.invoices.findMany({
        where: eq(invoices.userId, userId),
        with: {
          user: true,
          subscription: true,
        },
        orderBy: [desc(invoices.createdAt)],
        limit,
      })

      const userInvoices = await query

      // Apply additional filters
      let filteredInvoices = userInvoices

      if (filters) {
        if (filters.status) {
          filteredInvoices = filteredInvoices.filter(inv => inv.status === filters.status)
        }

        if (filters.startDate) {
          filteredInvoices = filteredInvoices.filter(
            inv => inv.createdAt >= filters.startDate!
          )
        }

        if (filters.endDate) {
          filteredInvoices = filteredInvoices.filter(inv => inv.createdAt <= filters.endDate!)
        }

        if (filters.minAmount) {
          filteredInvoices = filteredInvoices.filter(
            inv => inv.amountDue >= filters.minAmount!
          )
        }

        if (filters.maxAmount) {
          filteredInvoices = filteredInvoices.filter(
            inv => inv.amountDue <= filters.maxAmount!
          )
        }
      }

      // Map to InvoiceData
      const invoiceDataPromises = filteredInvoices.map(async invoice => {
        try {
          const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId, {
            expand: ['lines.data'],
          })
          return this.mapStripeInvoiceToInvoiceData(stripeInvoice, invoice.user)
        } catch (error) {
          console.error(`Error fetching Stripe invoice ${invoice.stripeInvoiceId}:`, error)
          return null
        }
      })

      const invoicesData = await Promise.all(invoiceDataPromises)
      return invoicesData.filter(inv => inv !== null) as InvoiceData[]
    } catch (error) {
      console.error('Error fetching user invoices:', error)
      return []
    }
  }

  /**
   * Get all invoices (admin)
   */
  static async getAllInvoices(
    filters?: InvoiceFilters,
    limit: number = 100
  ): Promise<InvoiceData[]> {
    try {
      const conditions = []

      if (filters?.userId) {
        conditions.push(eq(invoices.userId, filters.userId))
      }

      if (filters?.status) {
        conditions.push(eq(invoices.status, filters.status))
      }

      if (filters?.startDate) {
        conditions.push(gte(invoices.createdAt, filters.startDate))
      }

      if (filters?.endDate) {
        conditions.push(lte(invoices.createdAt, filters.endDate))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const allInvoices = await db.query.invoices.findMany({
        where: whereClause,
        with: {
          user: true,
          subscription: true,
        },
        orderBy: [desc(invoices.createdAt)],
        limit,
      })

      const invoiceDataPromises = allInvoices.map(async invoice => {
        try {
          const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId, {
            expand: ['lines.data'],
          })
          return this.mapStripeInvoiceToInvoiceData(stripeInvoice, invoice.user)
        } catch (error) {
          console.error(`Error fetching Stripe invoice ${invoice.stripeInvoiceId}:`, error)
          return null
        }
      })

      const invoicesData = await Promise.all(invoiceDataPromises)
      return invoicesData.filter(inv => inv !== null) as InvoiceData[]
    } catch (error) {
      console.error('Error fetching all invoices:', error)
      return []
    }
  }

  /**
   * Send invoice email to customer
   */
  static async sendInvoiceEmail(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoice(invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Use Stripe's hosted invoice URL or generate PDF
      const invoiceUrl = invoice.stripeInvoiceUrl || invoice.stripePdfUrl

      if (!invoiceUrl) {
        throw new Error('Invoice URL not available')
      }

      // Send email via your email service
      await sendEmail({
        to: invoice.customerEmail,
        subject: `Invoice ${invoice.invoiceNumber} - CÁRIS`,
        html: this.generateInvoiceEmailHTML(invoice, invoiceUrl),
      })

      console.log(`Invoice email sent to ${invoice.customerEmail}`)
      return true
    } catch (error) {
      console.error('Error sending invoice email:', error)
      return false
    }
  }

  /**
   * Generate invoice email HTML
   */
  private static generateInvoiceEmailHTML(invoice: InvoiceData, invoiceUrl: string): string {
    const statusBadge =
      invoice.status === 'paid'
        ? '<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 4px;">Paid</span>'
        : '<span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 4px;">Due</span>'

    const itemsHTML = invoice.items
      .map(
        item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">R$ ${(item.unitAmount / 100).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">R$ ${(item.amount / 100).toFixed(2)}</td>
      </tr>
    `
      )
      .join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice ${invoice.invoiceNumber}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">CÁRIS</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0;">Mental Health Platform</p>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
              <div>
                <h2 style="margin: 0 0 10px 0;">Invoice ${invoice.invoiceNumber}</h2>
                <p style="color: #6b7280; margin: 0;">Issued: ${invoice.createdAt.toLocaleDateString('pt-BR')}</p>
                ${invoice.dueDate ? `<p style="color: #6b7280; margin: 5px 0 0 0;">Due: ${invoice.dueDate.toLocaleDateString('pt-BR')}</p>` : ''}
              </div>
              <div>
                ${statusBadge}
              </div>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280; text-transform: uppercase;">Bill To</h3>
              <p style="margin: 0; font-size: 16px; font-weight: 600;">${invoice.customerName}</p>
              <p style="margin: 5px 0 0 0; color: #6b7280;">${invoice.customerEmail}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <div style="text-align: right; margin-bottom: 30px;">
              <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                <span style="margin-right: 20px; color: #6b7280;">Subtotal:</span>
                <span style="font-weight: 600;">R$ ${(invoice.subtotal / 100).toFixed(2)}</span>
              </div>
              ${
                invoice.tax > 0
                  ? `
              <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                <span style="margin-right: 20px; color: #6b7280;">Tax:</span>
                <span style="font-weight: 600;">R$ ${(invoice.tax / 100).toFixed(2)}</span>
              </div>
              `
                  : ''
              }
              <div style="display: flex; justify-content: flex-end; padding-top: 12px; border-top: 2px solid #e5e7eb; margin-top: 8px;">
                <span style="margin-right: 20px; font-size: 18px; font-weight: 600;">Total:</span>
                <span style="font-size: 18px; font-weight: 700; color: #667eea;">R$ ${(invoice.total / 100).toFixed(2)}</span>
              </div>
              ${
                invoice.amountPaid > 0
                  ? `
              <div style="display: flex; justify-content: flex-end; margin-top: 8px; color: #10b981;">
                <span style="margin-right: 20px;">Amount Paid:</span>
                <span style="font-weight: 600;">R$ ${(invoice.amountPaid / 100).toFixed(2)}</span>
              </div>
              `
                  : ''
              }
              ${
                invoice.amountDue > 0
                  ? `
              <div style="display: flex; justify-content: flex-end; margin-top: 8px; color: #ef4444;">
                <span style="margin-right: 20px;">Amount Due:</span>
                <span style="font-weight: 600;">R$ ${(invoice.amountDue / 100).toFixed(2)}</span>
              </div>
              `
                  : ''
              }
            </div>

            ${
              invoice.status !== 'paid'
                ? `
            <div style="text-align: center;">
              <a href="${invoiceUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-bottom: 20px;">
                View & Pay Invoice
              </a>
            </div>
            `
                : `
            <div style="text-align: center;">
              <a href="${invoiceUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-bottom: 20px;">
                Download Invoice
              </a>
            </div>
            `
            }

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                Thank you for using CÁRIS. If you have any questions about this invoice, please contact us at support@caris.com.br
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} CÁRIS. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Generate PDF invoice
   */
  static async generatePDF(invoiceId: string): Promise<Buffer | null> {
    try {
      const invoice = await this.getInvoice(invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      const doc = new jsPDF()

      // Header
      doc.setFillColor(102, 126, 234)
      doc.rect(0, 0, 210, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.text('CÁRIS', 105, 20, { align: 'center' })
      doc.setFontSize(12)
      doc.text('Mental Health Platform', 105, 30, { align: 'center' })

      // Invoice details
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(20)
      doc.text(`Invoice ${invoice.invoiceNumber}`, 20, 60)

      doc.setFontSize(10)
      doc.text(`Issued: ${invoice.createdAt.toLocaleDateString('pt-BR')}`, 20, 70)
      if (invoice.dueDate) {
        doc.text(`Due: ${invoice.dueDate.toLocaleDateString('pt-BR')}`, 20, 76)
      }

      // Status
      const statusText = invoice.status === 'paid' ? 'PAID' : 'DUE'
      const statusColor = invoice.status === 'paid' ? [16, 185, 129] : [245, 158, 11]
      doc.setFillColor(...statusColor)
      doc.rect(150, 55, 40, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.text(statusText, 170, 62, { align: 'center' })

      // Bill to
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text('BILL TO', 20, 90)
      doc.setFont(undefined, 'normal')
      doc.setFontSize(12)
      doc.text(invoice.customerName, 20, 98)
      doc.setFontSize(10)
      doc.text(invoice.customerEmail, 20, 104)

      // Items table
      let yPos = 120
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text('Description', 20, yPos)
      doc.text('Qty', 110, yPos, { align: 'center' })
      doc.text('Unit Price', 140, yPos, { align: 'right' })
      doc.text('Amount', 180, yPos, { align: 'right' })

      doc.setFont(undefined, 'normal')
      yPos += 8

      invoice.items.forEach(item => {
        doc.text(item.description, 20, yPos)
        doc.text(item.quantity.toString(), 110, yPos, { align: 'center' })
        doc.text(`R$ ${(item.unitAmount / 100).toFixed(2)}`, 140, yPos, { align: 'right' })
        doc.text(`R$ ${(item.amount / 100).toFixed(2)}`, 180, yPos, { align: 'right' })
        yPos += 6
      })

      // Totals
      yPos += 10
      doc.text('Subtotal:', 140, yPos, { align: 'right' })
      doc.text(`R$ ${(invoice.subtotal / 100).toFixed(2)}`, 180, yPos, { align: 'right' })

      if (invoice.tax > 0) {
        yPos += 6
        doc.text('Tax:', 140, yPos, { align: 'right' })
        doc.text(`R$ ${(invoice.tax / 100).toFixed(2)}`, 180, yPos, { align: 'right' })
      }

      yPos += 8
      doc.setFont(undefined, 'bold')
      doc.setFontSize(12)
      doc.text('Total:', 140, yPos, { align: 'right' })
      doc.text(`R$ ${(invoice.total / 100).toFixed(2)}`, 180, yPos, { align: 'right' })

      if (invoice.amountDue > 0) {
        yPos += 8
        doc.setTextColor(239, 68, 68)
        doc.text('Amount Due:', 140, yPos, { align: 'right' })
        doc.text(`R$ ${(invoice.amountDue / 100).toFixed(2)}`, 180, yPos, { align: 'right' })
      }

      // Footer
      doc.setTextColor(156, 163, 175)
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      doc.text(
        'Thank you for using CÁRIS. For questions, contact support@caris.com.br',
        105,
        280,
        { align: 'center' }
      )

      return Buffer.from(doc.output('arraybuffer'))
    } catch (error) {
      console.error('Error generating PDF:', error)
      return null
    }
  }

  /**
   * Map Stripe invoice to InvoiceData
   */
  private static mapStripeInvoiceToInvoiceData(
    stripeInvoice: Stripe.Invoice,
    user: any
  ): InvoiceData {
    const items: InvoiceItem[] =
      stripeInvoice.lines?.data.map(line => ({
        description: line.description || '',
        quantity: line.quantity || 1,
        unitAmount: line.price?.unit_amount || 0,
        amount: line.amount,
      })) || []

    return {
      id: stripeInvoice.id,
      invoiceNumber: stripeInvoice.number || stripeInvoice.id,
      status: stripeInvoice.status || 'draft',
      customerName: user?.name || 'Unknown',
      customerEmail: user?.email || '',
      items,
      subtotal: stripeInvoice.subtotal || 0,
      tax: stripeInvoice.tax || 0,
      total: stripeInvoice.total || 0,
      amountPaid: stripeInvoice.amount_paid || 0,
      amountDue: stripeInvoice.amount_due || 0,
      currency: stripeInvoice.currency || 'brl',
      dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
      paidAt: stripeInvoice.status_transitions?.paid_at
        ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
        : null,
      createdAt: new Date(stripeInvoice.created * 1000),
      stripeInvoiceUrl: stripeInvoice.hosted_invoice_url || undefined,
      stripePdfUrl: stripeInvoice.invoice_pdf || undefined,
    }
  }

  /**
   * Get invoice statistics
   */
  static async getInvoiceStatistics(userId?: number) {
    try {
      const whereClause = userId ? eq(invoices.userId, userId) : undefined

      const allInvoices = await db.query.invoices.findMany({
        where: whereClause,
      })

      const totalInvoices = allInvoices.length
      const paidInvoices = allInvoices.filter(inv => inv.status === 'paid').length
      const unpaidInvoices = allInvoices.filter(
        inv => inv.status === 'open' || inv.status === 'draft'
      ).length
      const overdueInvoices = allInvoices.filter(
        inv =>
          inv.status === 'open' && inv.dueDate && inv.dueDate < new Date()
      ).length

      const totalRevenue = allInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amountPaid, 0)

      const outstandingAmount = allInvoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + inv.amountDue, 0)

      return {
        totalInvoices,
        paidInvoices,
        unpaidInvoices,
        overdueInvoices,
        totalRevenue,
        outstandingAmount,
        averageInvoiceValue: totalInvoices > 0 ? totalRevenue / paidInvoices : 0,
      }
    } catch (error) {
      console.error('Error calculating invoice statistics:', error)
      return null
    }
  }
}
