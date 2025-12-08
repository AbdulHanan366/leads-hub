import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get('company_name');

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const existingCompany = await Lead.findOne({
      company_name: companyName.toLowerCase()
    }).select('company_name company_link');

    if (!existingCompany) {
      return NextResponse.json({
        exists: false,
        company: null,
        leads: []
      });
    }

    // Fetch all leads for this company with populated user information
    const leads = await Lead.find({
      company_name: companyName.toLowerCase()
    })
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .select('first_name last_name email designation location person_mobile job_title job_link profile_link source notes created_at assigned_to created_by')
      .sort({ created_at: -1 })
      .limit(50);

    return NextResponse.json({
      exists: true,
      company: existingCompany,
      leads: leads
    });
  } catch (error) {
    console.error('Error checking company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}