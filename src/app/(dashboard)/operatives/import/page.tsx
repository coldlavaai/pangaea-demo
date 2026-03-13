import { redirect } from 'next/navigation'
import { ArrowLeft, History } from 'lucide-react'
import Link from 'next/link'
import { checkImportPermission } from '@/lib/export/check-export'
import { ImportWizard } from '@/components/operatives/import-wizard'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'

export default async function ImportOperativesPage() {
  const allowed = await checkImportPermission()
  if (!allowed) redirect('/operatives')

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Import Operatives"
        description="Bulk upload from CSV — up to 5,000 contacts per file"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Link href="/operatives/import/history">
                <History className="h-4 w-4 mr-2" />
                History
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Link href="/operatives">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <ImportWizard />
    </div>
  )
}
