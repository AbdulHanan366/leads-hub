import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';

// ✅ Don't type the second argument — Next.js validates runtime shape only
export async function GET(request: NextRequest, context: any) {
  try {
    await dbConnect();
    const { id } = context.params;

    const lead = await Lead.findById(id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email');

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Get lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: any) {
  try {
    await dbConnect();
    const { id } = context.params;

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
    } = body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Update lead fields
    if (first_name) lead.first_name = first_name;
    if (last_name) lead.last_name = last_name;
    if (designation) lead.designation = designation;
    if (profile_link !== undefined) lead.profile_link = profile_link;
    if (email) lead.email = email.toLowerCase();
    if (person_mobile !== undefined) lead.person_mobile = person_mobile;
    if (location !== undefined) lead.location = location;
    if (company_name) lead.company_name = company_name.toLowerCase();
    if (company_link !== undefined) lead.company_link = company_link;
    if (job_title !== undefined) lead.job_title = job_title;
    if (job_link !== undefined) lead.job_link = job_link;
    if (additional_emails) lead.additional_emails = additional_emails;
    if (source !== undefined) lead.source = source;
    if (notes !== undefined) lead.notes = notes;

    await lead.save();

    const updatedLead = await Lead.findById(id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email');

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error('Update lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    await dbConnect();
    const { id } = context.params;

    const lead = await Lead.findById(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    await Lead.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
