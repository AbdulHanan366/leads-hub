import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  // Basic Information
  first_name: {
    type: String,
    required: true,
    trim: true,
  },
  last_name: {
    type: String,
    required: true,
    trim: true,
  },
  designation: {
    type: String,
    required: true,
    trim: true,
  },
  profile_link: {
    type: String,
    trim: true,
  },

  // Contact Information
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  person_mobile: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },

  // Company Information
  company_name: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  company_link: {
    type: String,
    trim: true,
  },

  // Job Information
  job_title: {
    type: String,
    trim: true,
  },
  job_link: {
    type: String,
    trim: true,
  },

  // Additional Emails
  additional_emails: [{
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    profile_link: {
      type: String,
      trim: true,
    },
    is_primary: {
      type: Boolean,
      default: false,
    }
  }],

  // System Fields
  source: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },

  // Relationships
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for email and company name uniqueness
leadSchema.index({ email: 1, company_name: 1, job_link: 1}, { unique: true });

export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);