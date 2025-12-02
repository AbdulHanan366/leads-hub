import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Country from '@/models/Country';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const countries = await Country.find({}).sort({ name: 1 });

    return NextResponse.json({ countries }, { status: 200 });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Country name is required' },
        { status: 400 }
      );
    }

    // Check if country already exists
    const existingCountry = await Country.findOne({
      name: name.trim()
    });

    if (existingCountry) {
      return NextResponse.json(
        { error: 'Country already exists' },
        { status: 400 }
      );
    }

    // Create new country
    const country = await Country.create({
      name: name.trim(),
    });

    return NextResponse.json({ country }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating country:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Country already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

