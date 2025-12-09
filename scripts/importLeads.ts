import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dbConnect from '../lib/db';
import Lead from '../models/Lead';
import User from '../models/User';

interface CSVRow {
  firstName: string;
  lastName: string;
  designation: string;
  profileLink: string;
  email: string;
  companyName: string;
  companyLink: string;
  jobTitle: string;
  jobLink: string;
  location: string;
}

interface SkippedLead extends CSVRow {
  skipReason: string;
  rowNumber: number;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : null;
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote (double quote)
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Push last value
  values.push(current.trim());
  
  return values;
}

function parseCSV(filePath: string): CSVRow[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  // Parse header
  const headerValues = parseCSVLine(lines[0]);
  const headerMap: { [key: string]: number } = {};
  
  headerValues.forEach((col, index) => {
    const normalized = col.toLowerCase().trim();
    if (normalized.includes('first name')) headerMap.firstName = index;
    else if (normalized.includes('last name')) headerMap.lastName = index;
    else if (normalized.includes('designation')) headerMap.designation = index;
    else if (normalized.includes('profile link')) headerMap.profileLink = index;
    else if (normalized.includes('email') && !normalized.includes('additional')) headerMap.email = index;
    else if (normalized.includes('company name')) headerMap.companyName = index;
    else if (normalized.includes('company link')) headerMap.companyLink = index;
    else if (normalized.includes('job title')) headerMap.jobTitle = index;
    else if (normalized.includes('job link')) headerMap.jobLink = index;
    else if (normalized.includes('location')) headerMap.location = index;
  });

  // Validate that we found all required headers
  const requiredHeaders = ['firstName', 'lastName', 'email', 'companyName', 'designation'];
  const missingHeaders = requiredHeaders.filter(h => headerMap[h] === undefined);
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    // Ensure we have enough values (pad with empty strings if needed)
    while (values.length < headerValues.length) {
      values.push('');
    }
    
    // Map values to CSVRow
    const row: CSVRow = {
      firstName: (values[headerMap.firstName] || '').trim(),
      lastName: (values[headerMap.lastName] || '').trim(),
      designation: (values[headerMap.designation] || '').trim(),
      profileLink: (values[headerMap.profileLink] || '').trim(),
      email: (values[headerMap.email] || '').trim(),
      companyName: (values[headerMap.companyName] || '').trim(),
      companyLink: (values[headerMap.companyLink] || '').trim(),
      jobTitle: (values[headerMap.jobTitle] || '').trim(),
      jobLink: (values[headerMap.jobLink] || '').trim(),
      location: (values[headerMap.location] || '').trim(),
    };
    
    // Skip completely empty rows
    const hasData = Object.values(row).some(val => val && val.trim() !== '');
    if (hasData) {
      rows.push(row);
    }
  }
  
  return rows;
}

async function getOrCreateDefaultUser() {
  // Try to get an admin user first
  let user = await User.findOne({ role: 'admin', isActive: true });
  
  // If no admin, get any active user
  if (!user) {
    user = await User.findOne({ isActive: true });
  }
  
  // If still no user, create a default admin user
  if (!user) {
    console.log('No users found. Creating default admin user...');
    user = await User.create({
      name: 'System Admin',
      email: 'admin@leads-hub.com',
      password: 'temp123', // This will be hashed by the pre-save hook
      role: 'admin',
      isActive: true,
    });
    console.log('Default admin user created. Please change the password!');
  }
  
  return user;
}

function escapeCSVField(field: string): string {
  if (!field) return '';
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function writeSkippedLeadsToCSV(skippedLeads: SkippedLead[], outputPath: string) {
  if (skippedLeads.length === 0) {
    console.log('No skipped leads to write.');
    return;
  }

  const headers = [
    'Row Number',
    'First Name',
    'Last Name',
    'Designation',
    'Profile Link',
    'Email',
    'Company Name',
    'Company Link',
    'Job Title',
    'Job Link',
    'City or Location',
    'Skip Reason'
  ];

  const rows = skippedLeads.map(lead => [
    lead.rowNumber.toString(),
    escapeCSVField(lead.firstName),
    escapeCSVField(lead.lastName),
    escapeCSVField(lead.designation),
    escapeCSVField(lead.profileLink),
    escapeCSVField(lead.email),
    escapeCSVField(lead.companyName),
    escapeCSVField(lead.companyLink),
    escapeCSVField(lead.jobTitle),
    escapeCSVField(lead.jobLink),
    escapeCSVField(lead.location),
    escapeCSVField(lead.skipReason)
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`\nSkipped leads written to: ${outputPath}`);
}

async function importLeads() {
  try {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected successfully');

    // Get or create default user for assigned_to and created_by
    const defaultUser = await getOrCreateDefaultUser();
    console.log(`Using user: ${defaultUser.name} (${defaultUser.email})`);

    // Parse CSV file
    const csvPath = path.join(__dirname, 'leads.csv');
    console.log(`Reading CSV file from: ${csvPath}`);
    const csvRows = parseCSV(csvPath);
    console.log(`Found ${csvRows.length} rows in CSV`);

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const skippedLeads: SkippedLead[] = [];

    // Process each row
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const rowNumber = i + 2; // +2 because CSV rows start at 1 and we skip header
      
      try {
        // Validate required fields
        if (!row.firstName || !row.firstName.trim()) {
          const reason = 'Missing first name';
          console.log(`Row ${rowNumber}: Skipping - ${reason}`);
          skippedLeads.push({ ...row, skipReason: reason, rowNumber });
          skipped++;
          continue;
        }

        if (!row.email || !row.email.trim()) {
          const reason = 'Missing email';
          console.log(`Row ${rowNumber}: Skipping - ${reason}`);
          skippedLeads.push({ ...row, skipReason: reason, rowNumber });
          skipped++;
          continue;
        }

        if (!row.companyName || !row.companyName.trim()) {
          const reason = 'Missing company name';
          console.log(`Row ${rowNumber}: Skipping - ${reason}`);
          skippedLeads.push({ ...row, skipReason: reason, rowNumber });
          skipped++;
          continue;
        }

        if (!row.designation || !row.designation.trim()) {
          const reason = 'Missing designation';
          console.log(`Row ${rowNumber}: Skipping - ${reason}`);
          skippedLeads.push({ ...row, skipReason: reason, rowNumber });
          skipped++;
          continue;
        }

        // Prepare lead data
        const leadData = {
          first_name: row.firstName.trim(),
          last_name: (row.lastName || '').trim() || 'N/A',
          designation: row.designation.trim(),
          profile_link: (row.profileLink || '').trim() || undefined,
          email: row.email.trim().toLowerCase(),
          location: (row.location || '').trim() || undefined,
          company_name: row.companyName.trim().toLowerCase(),
          company_link: (row.companyLink || '').trim() || undefined,
          job_title: (row.jobTitle || '').trim() || undefined,
          job_link: (row.jobLink || '').trim() || undefined,
          assigned_to: defaultUser._id,
          created_by: defaultUser._id,
          source: 'CSV Import',
        };

        // Try to create the lead
        try {
          const lead = await Lead.create(leadData);
          created++;
          console.log(`Row ${rowNumber}: Created lead for ${lead.first_name} ${lead.last_name} at ${lead.company_name}`);
        } catch (error: any) {
          // Check if it's a duplicate error
          if (error.code === 11000 || error.message?.includes('duplicate')) {
            const reason = `Duplicate lead (${row.email} at ${row.companyName})`;
            console.log(`Row ${rowNumber}: Skipping - ${reason}`);
            skippedLeads.push({ ...row, skipReason: reason, rowNumber });
            skipped++;
          } else {
            throw error;
          }
        }
      } catch (error: any) {
        errors++;
        const reason = `Error: ${error.message}`;
        console.error(`Row ${rowNumber}: ${reason}`);
        skippedLeads.push({ ...row, skipReason: reason, rowNumber });
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total rows processed: ${csvRows.length}`);
    console.log(`Leads created: ${created}`);
    console.log(`Leads skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    // Write skipped leads to CSV file
    if (skippedLeads.length > 0) {
      const skippedCSVPath = path.join(__dirname, 'leads_skipped.csv');
      writeSkippedLeadsToCSV(skippedLeads, skippedCSVPath);
    }

  } catch (error: any) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the import
importLeads();

