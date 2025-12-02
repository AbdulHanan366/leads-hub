import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      first_name,
      last_name,
      designation,
      profile_link,
      email,
      person_mobile,
      location,
      company_name,
      company_link,
      job_title,
      job_link,
      additional_emails,
      source,
      notes,
      assigned_to,
      created_by,
    } = body;

    // Check for duplicate lead (same email and company)
    const existingLead = await Lead.findOne({
      email: email.toLowerCase(),
      company_name: company_name.toLowerCase()
    });

    if (existingLead) {
      return NextResponse.json(
        { error: 'A lead with this email and company already exists' },
        { status: 400 }
      );
    }

    // Create new lead
    const lead = await Lead.create({
      first_name,
      last_name,
      designation,
      profile_link,
      email: email.toLowerCase(),
      person_mobile,
      location,
      company_name: company_name.toLowerCase(),
      company_link,
      job_title,
      job_link,
      additional_emails: additional_emails || [],
      source,
      notes,
      assigned_to,
      created_by,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (role !== 'admin') {
      filter.assigned_to = userId;
    }

    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company_name: { $regex: search, $options: 'i' } },
        { job_title: { $regex: search, $options: 'i' } },
      ];
    }

    // Add company filter
    const company = searchParams.get('company');
    if (company) {
      filter.company_name = { $regex: company, $options: 'i' };
    }

    // Add location filter
    const location = searchParams.get('location');
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    // Add designation filter
    const designation = searchParams.get('designation');
    if (designation) {
      filter.designation = { $regex: designation, $options: 'i' };
    }

    // Add assignedTo filter (for admin)
    const assignedTo = searchParams.get('assignedTo');
    if (assignedTo && role === 'admin') {
      filter.assigned_to = assignedTo;
    }

    // Add source filter
    const source = searchParams.get('source');
    if (source) {
      filter.source = { $regex: source, $options: 'i' };
    }

    // Add date range filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      filter.created_at = {};
      if (dateFrom) {
        filter.created_at.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Include the entire end date by setting to end of day
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.created_at.$lte = endDate;
      }
    }

    // Add sorting
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Update the find query to include sorting:
    const leads = await Lead.find(filter)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Get counts for stats
    const totalLeads = await Lead.countDocuments(filter);
    const totalPages = Math.ceil(totalLeads / limit);

    return NextResponse.json({
      leads,
      stats: {
        total: totalLeads,
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalLeads,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}