import mongoose from 'mongoose';

interface ICountry {
  name: string;
  created_at: Date;
  updated_at: Date;
}

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

const Country = mongoose.models.Country || mongoose.model<ICountry>('Country', countrySchema);

export default Country;
