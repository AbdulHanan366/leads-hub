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

function parseCSV(filePath: string): CSVRow[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());
  const headerMap: { [key: string]: number } = {};
  
  header.forEach((col, index) => {
    const normalized = col.toLowerCase().trim();
    if (normalized.includes('first name')) headerMap.firstName = index;
    else if (normalized.includes('last name')) headerMap.lastName = index;
    else if (normalized.includes('designation')) headerMap.designation = index;
    else if (normalized.includes('profile link')) headerMap.profileLink = index;
    else if (normalized.includes('email')) headerMap.email = index;
    else if (normalized.includes('company name')) headerMap.companyName = index;
    else if (normalized.includes('company link')) headerMap.companyLink = index;
    else if (normalized.includes('job title')) headerMap.jobTitle = index;
    else if (normalized.includes('job link')) headerMap.jobLink = index;
    else if (normalized.includes('city') || normalized.includes('location')) headerMap.location = index;
  });

  // Parse data rows
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Simple CSV parsing that handles quoted fields
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Push last value
    
    // Map values to CSVRow
    const row: CSVRow = {
      firstName: values[headerMap.firstName] || '',
      lastName: values[headerMap.lastName] || '',
      designation: values[headerMap.designation] || '',
      profileLink: values[headerMap.profileLink] || '',
      email: values[headerMap.email] || '',
      companyName: values[headerMap.companyName] || '',
      companyLink: values[headerMap.companyLink] || '',
      jobTitle: values[headerMap.jobTitle] || '',
      jobLink: values[headerMap.jobLink] || '',
      location: values[headerMap.location] || '',
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

