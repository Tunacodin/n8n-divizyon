import { NextResponse } from 'next/server'
import { sheetsClient } from '@/lib/sheets'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    if (status === 'pending') {
      const applications = await sheetsClient.getPendingApplications()
      return NextResponse.json(applications)
    } else if (status === 'approved') {
      const applications = await sheetsClient.getApprovedApplications()
      return NextResponse.json(applications)
    } else if (status === 'rejected') {
      const applications = await sheetsClient.getRejectedApplications()
      return NextResponse.json(applications)
    } else {
      const applications = await sheetsClient.getApplications()
      return NextResponse.json(applications)
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export const revalidate = 30 // Revalidate every 30 seconds
