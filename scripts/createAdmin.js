const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017/leads-hub';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
  createdAt: Date
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const adminUser = {
      name: 'Admin User',
      email: 'admin@leadshub.com',
      password: await bcrypt.hash('admin123', 12),
      role: 'admin',
      isActive: true,
      createdAt: new Date()
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    await User.create(adminUser);
    console.log('Admin user created successfully');
    console.log('Email: admin@leadshub.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminUser();