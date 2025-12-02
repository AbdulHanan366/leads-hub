import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    // Build base filter for user access
    const baseFilter: any = {};
    if (role !== 'admin') {
      baseFilter.assigned_to = userId;
    }

    // Get unique companies
    const companies = await Lead.distinct('company_name', baseFilter);

    // Get unique locations (excluding null/empty)
    const locations = await Lead.distinct('location', {
      ...baseFilter,
      location: { $exists: true, $nin: [null, ''] }
    });

    // Get unique designations
    const designations = await Lead.distinct('designation', baseFilter);

    // Get unique sources (excluding null/empty) - for admin
    const sources = role === 'admin' 
      ? await Lead.distinct('source', {
          ...baseFilter,
          source: { $exists: true, $nin: [null, ''] }
        })
      : [];

    return NextResponse.json({
      companies: companies.sort(),
      locations: locations.sort(),
      designations: designations.sort(),
      sources: sources.sort(),
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

