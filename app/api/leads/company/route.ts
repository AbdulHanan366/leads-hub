import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Unknown error occurred');
}

// Normalize company name for consistent matching
function normalizeCompanyName(name: string): string {
  if (!name) return '';
  // Trim whitespace, convert to lowercase, and remove extra spaces
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get('company_name');

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Normalize the company name
    const normalizedCompanyName = normalizeCompanyName(companyName);

    // Retry database operations with exponential backoff
    const result = await retryWithBackoff(async () => {
      // Ensure database connection
      await dbConnect();

      // Try exact match first (most common case)
      let existingCompany = await Lead.findOne({
        company_name: normalizedCompanyName
      }).select('company_name company_link').lean();

      // If exact match not found, try case-insensitive regex match
      // This handles edge cases where company name might have slight variations
      if (!existingCompany) {
        const regexPattern = normalizedCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        existingCompany = await Lead.findOne({
          company_name: { $regex: new RegExp(`^${regexPattern}$`, 'i') }
        }).select('company_name company_link').lean();
      }

      if (!existingCompany) {
        return {
          exists: false,
          company: null,
          leads: []
        };
      }

      // Type assertion: findOne returns a single document, not an array
      // Ensure we're working with a single document object
      const companyDoc = Array.isArray(existingCompany) ? existingCompany[0] : existingCompany;
      if (!companyDoc || !('company_name' in companyDoc)) {
        return {
          exists: false,
          company: null,
          leads: []
        };
      }

      // Fetch all leads for this company with populated user information
      // Use the found company name for consistency
      const companyNameForQuery = companyDoc.company_name;
      
      const leads = await Lead.find({
        company_name: companyNameForQuery
      })
        .populate('assigned_to', 'name email')
        .populate('created_by', 'name email')
        .select('first_name last_name email designation location person_mobile job_title job_link profile_link source notes created_at assigned_to created_by')
        .sort({ created_at: -1 })
        .limit(50)
        .lean()
        .exec();

      return {
        exists: true,
        company: companyDoc,
        leads: leads
      };
    }, 3, 200); // 3 retries with initial 200ms delay

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking company after retries:', error);
    
    // Return a more detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { 
        error: 'Failed to check company. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}