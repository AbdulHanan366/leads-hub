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

    return NextResponse.json({
      exists: !!existingCompany,
      company: existingCompany
    });
  } catch (error) {
    console.error('Error checking company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}