import { redirect } from 'next/navigation'

export default function ReportingIndex() {
  redirect('/api-reference/reporting/generate-report')
}
