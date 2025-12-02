import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Lead from '@/models/Lead';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get stats from database
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalLeads = await Lead.countDocuments();
    
    // Get new leads from last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newLeads = await Lead.countDocuments({ 
      createdAt: { $gte: oneWeekAgo } 
    });
    
    // Calculate conversion rate
    const convertedLeads = await Lead.countDocuments({ status: 'qualified' });
    const conversionRate = totalLeads > 0 ? 
      Math.round((convertedLeads / totalLeads) * 100 * 10) / 10 : 0;

    // Calculate total revenue from qualified leads
    const revenueResult = await Lead.aggregate([
      { $match: { status: 'qualified' } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);
    const revenue = revenueResult[0]?.total || 0;

    // Get active users count (users with recent activity)
    const activeUsers = await User.countDocuments({ 
      isActive: true,
      lastActive: { $gte: oneWeekAgo }
    });

    // Get recent activity
    const recentLeads = await Lead.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('companyName contactPerson status createdAt');

    const recentActivity = recentLeads.map(lead => ({
      id: lead._id.toString(),
      type: 'lead_created',
      message: `New lead added: ${lead.companyName} by ${lead.createdBy.name}`,
      time: lead.createdAt.toISOString(),
    }));

    const stats = {
      totalUsers,
      totalLeads,
      newLeads,
      conversionRate,
      revenue,
      activeUsers,
    };

    return NextResponse.json({ 
      stats,
      recentActivity 
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}