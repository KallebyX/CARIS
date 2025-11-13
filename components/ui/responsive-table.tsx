"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useIsMobile, useIsTablet } from "@/lib/responsive-utils"
import { cn } from "@/lib/utils"

/* ============================================
   Types and Interfaces
   ============================================ */

export interface Column<T = any> {
  key: string
  header: string
  // Render function for custom cell content
  render?: (value: any, row: T) => React.ReactNode
  // CSS class for the column
  className?: string
  // Hide on mobile
  hideOnMobile?: boolean
  // Hide on tablet
  hideOnTablet?: boolean
  // Sort function
  sortable?: boolean
  // Mobile label (if different from header)
  mobileLabel?: string
  // Priority for mobile display (lower = more important)
  mobilePriority?: number
}

export interface ResponsiveTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  // Unique key for each row
  rowKey: (row: T) => string | number
  // Optional title
  title?: string
  // Empty state message
  emptyMessage?: string
  // Enable horizontal scroll on tablet
  scrollOnTablet?: boolean
  // Custom row click handler
  onRowClick?: (row: T) => void
  // Custom class names
  className?: string
  // Show row actions on mobile cards
  renderActions?: (row: T) => React.ReactNode
  // Loading state
  loading?: boolean
  // Striped rows
  striped?: boolean
}

/* ============================================
   Responsive Table Component
   ============================================ */

/**
 * Responsive Table Component
 *
 * Adapts table display based on screen size:
 * - Desktop: Standard table layout
 * - Tablet: Scrollable table or standard based on prop
 * - Mobile: Card-based layout
 */
export function ResponsiveTable<T = any>({
  data,
  columns,
  rowKey,
  title,
  emptyMessage = "Nenhum dado disponível",
  scrollOnTablet = true,
  onRowClick,
  className,
  renderActions,
  loading = false,
  striped = false,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  // Filter columns based on current breakpoint
  const visibleColumns = columns.filter((col) => {
    if (isMobile && col.hideOnMobile) return false
    if (isTablet && col.hideOnTablet) return false
    return true
  })

  // Sort columns by mobile priority for mobile view
  const mobileColumns = isMobile
    ? [...columns].sort((a, b) => {
        const aPriority = a.mobilePriority ?? 999
        const bPriority = b.mobilePriority ?? 999
        return aPriority - bPriority
      })
    : columns

  // Get cell value
  const getCellValue = (row: T, column: Column<T>) => {
    const value = (row as any)[column.key]
    return column.render ? column.render(value, row) : value
  }

  // Loading state
  if (loading) {
    return (
      <div className="w-full">
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="w-full">
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <p className="text-gray-500">{emptyMessage}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mobile: Card Layout
  if (isMobile) {
    return (
      <div className={cn("w-full space-y-3", className)}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}

        {data.map((row) => {
          const key = rowKey(row)

          return (
            <Card
              key={key}
              className={cn(
                "overflow-hidden transition-shadow",
                onRowClick && "cursor-pointer hover:shadow-md active:shadow-lg"
              )}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {mobileColumns
                    .filter((col) => !col.hideOnMobile)
                    .map((column) => {
                      const value = getCellValue(row, column)
                      if (value === null || value === undefined) return null

                      return (
                        <div
                          key={column.key}
                          className="flex justify-between items-start gap-3"
                        >
                          <span className="text-sm font-medium text-gray-500 shrink-0">
                            {column.mobileLabel || column.header}:
                          </span>
                          <span className="text-sm text-gray-900 text-right">
                            {value}
                          </span>
                        </div>
                      )
                    })}

                  {/* Actions */}
                  {renderActions && (
                    <div className="pt-3 border-t flex gap-2 justify-end">
                      {renderActions(row)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Tablet with scroll: Scrollable Table
  if (isTablet && scrollOnTablet) {
    return (
      <div className={cn("w-full", className)}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b bg-gray-50">
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-left text-sm font-semibold text-gray-900",
                        column.className
                      )}
                    >
                      {column.header}
                    </th>
                  ))}
                  {renderActions && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => {
                  const key = rowKey(row)
                  const isEven = index % 2 === 0

                  return (
                    <tr
                      key={key}
                      className={cn(
                        "border-b transition-colors",
                        striped && isEven && "bg-gray-50/50",
                        onRowClick &&
                          "cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {visibleColumns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "px-4 py-3 text-sm text-gray-700",
                            column.className
                          )}
                        >
                          {getCellValue(row, column)}
                        </td>
                      ))}
                      {renderActions && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            {renderActions(row)}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  // Desktop: Standard Table
  return (
    <div className={cn("w-full", className)}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-6 py-4 text-left text-sm font-semibold text-gray-900",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
              {renderActions && (
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const key = rowKey(row)
              const isEven = index % 2 === 0

              return (
                <tr
                  key={key}
                  className={cn(
                    "border-b transition-colors",
                    striped && isEven && "bg-gray-50/50",
                    onRowClick &&
                      "cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-6 py-4 text-sm text-gray-700",
                        column.className
                      )}
                    >
                      {getCellValue(row, column)}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {renderActions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ============================================
   Example Usage
   ============================================ */

/**
 * Example usage with type safety:
 *
 * interface Patient {
 *   id: number
 *   name: string
 *   email: string
 *   status: 'active' | 'inactive'
 *   lastSession: string
 * }
 *
 * const columns: Column<Patient>[] = [
 *   {
 *     key: 'name',
 *     header: 'Nome',
 *     mobileLabel: 'Nome',
 *     mobilePriority: 1,
 *   },
 *   {
 *     key: 'email',
 *     header: 'E-mail',
 *     hideOnMobile: true,
 *   },
 *   {
 *     key: 'status',
 *     header: 'Status',
 *     render: (value) => (
 *       <Badge variant={value === 'active' ? 'default' : 'secondary'}>
 *         {value === 'active' ? 'Ativo' : 'Inativo'}
 *       </Badge>
 *     ),
 *     mobilePriority: 2,
 *   },
 *   {
 *     key: 'lastSession',
 *     header: 'Última Sessão',
 *     mobileLabel: 'Última Consulta',
 *     mobilePriority: 3,
 *   },
 * ]
 *
 * <ResponsiveTable
 *   data={patients}
 *   columns={columns}
 *   rowKey={(row) => row.id}
 *   title="Pacientes"
 *   onRowClick={(patient) => router.push(`/patients/${patient.id}`)}
 *   renderActions={(patient) => (
 *     <>
 *       <Button size="sm" variant="outline">Editar</Button>
 *       <Button size="sm" variant="destructive">Deletar</Button>
 *     </>
 *   )}
 * />
 */
