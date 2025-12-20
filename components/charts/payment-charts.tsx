"use client"

/**
 * Payment Charts - Chart.js wrapper components
 *
 * This file contains all Chart.js components for the payment dashboard.
 * It's designed to be dynamically imported to reduce initial bundle size.
 */

import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface RevenueChartProps {
  data: ChartData<'line'>
  options?: ChartOptions<'line'>
}

interface SubscriptionChartProps {
  data: ChartData<'bar'>
  options?: ChartOptions<'bar'>
}

export function RevenueLineChart({ data, options }: RevenueChartProps) {
  return <Line data={data} options={options} />
}

export function SubscriptionBarChart({ data, options }: SubscriptionChartProps) {
  return <Bar data={data} options={options} />
}
