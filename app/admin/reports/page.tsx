'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface ReportData {
  totalLeads: number;
  totalUsers: number;
  leadsByUser: Array<{ user: string; count: number }>;
  leadsByCompany: Array<{ company: string; count: number }>;
  leadsByMonth: Array<{ month: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
  topDesignations: Array<{ designation: string; count: number }>;
}

export default function Reports() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData>({
    totalLeads: 0,
    totalUsers: 0,
    leadsByUser: [],
    leadsByCompany: [],
    leadsByMonth: [],
    leadsBySource: [],
    topDesignations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // 7, 30, 90, 365, all
  const [reportType, setReportType] = useState('overview'); // overview, users, companies

  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportType]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch users data
      const usersResponse = await fetch('/api/admin/users?limit=1000');
      const usersData = await usersResponse.json();
      
      // Fetch leads data
      const leadsResponse = await fetch('/api/leads?role=admin&limit=1000');
      const leadsData = await leadsResponse.json();
      
      // Calculate report data based on date range
      const filteredLeads = filterLeadsByDateRange(leadsData.leads || [], dateRange);
      
      const report: ReportData = {
        totalLeads: filteredLeads.length,
        totalUsers: usersData.users?.length || 0,
        leadsByUser: calculateLeadsByUser(filteredLeads, usersData.users || []),
        leadsByCompany: calculateLeadsByCompany(filteredLeads),
        leadsByMonth: calculateLeadsByMonth(filteredLeads),
        leadsBySource: calculateLeadsBySource(filteredLeads),
        topDesignations: calculateTopDesignations(filteredLeads),
      };

      setReportData(report);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLeadsByDateRange = (leads: any[], range: string) => {
    if (range === 'all') return leads;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(range));
    return leads.filter((lead: any) => new Date(lead.created_at) >= cutoffDate);
  };

  const calculateLeadsByUser = (leads: any[], users: any[]) => {
    const userMap = new Map(users.map(user => [user.id, user.name]));
    const counts: { [key: string]: number } = {};
    
    leads.forEach(lead => {
      const userName = userMap.get(lead.assigned_to?._id) || 'Unknown';
      counts[userName] = (counts[userName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([user, count]) => ({ user, count }))
      .sort((a, b) => b.count - a.count);
  };

  const calculateLeadsByCompany = (leads: any[]) => {
    const counts: { [key: string]: number } = {};
    
    leads.forEach(lead => {
      const company = lead.company_name;
      counts[company] = (counts[company] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const calculateLeadsByMonth = (leads: any[]) => {
    const counts: { [key: string]: number } = {};
    
    leads.forEach(lead => {
      const date = new Date(lead.created_at);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      counts[monthYear] = (counts[monthYear] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  };

  const calculateLeadsBySource = (leads: any[]) => {
    const counts: { [key: string]: number } = {};
    
    leads.forEach(lead => {
      const source = lead.source || 'Unknown';
      counts[source] = (counts[source] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  };

  const calculateTopDesignations = (leads: any[]) => {
    const counts: { [key: string]: number } = {};
    
    leads.forEach(lead => {
      const designation = lead.designation;
      counts[designation] = (counts[designation] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([designation, count]) => ({ designation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getBarWidth = (count: number, maxCount: number) => {
    const maxWidth = 100;
    return (count / maxCount) * maxWidth;
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <DashboardLayout>
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl p-6 h-64"></div>
                ))}
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Reports & Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Comprehensive insights and system analytics
                </p>
              </div>
              <div className="flex space-x-3">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                  <option value="all">All time</option>
                </select>

                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="overview">Overview</option>
                  <option value="users">User Performance</option>
                  <option value="companies">Company Analysis</option>
                </select>
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Leads
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {reportData.totalLeads}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {reportData.totalUsers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg. Leads/User
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {reportData.totalUsers > 0 ? Math.round(reportData.totalLeads / reportData.totalUsers) : 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Top Company
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {reportData.leadsByCompany[0]?.count || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {reportData.leadsByCompany[0]?.company || 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leads by User */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Leads by User
              </h3>
              <div className="space-y-3">
                {reportData.leadsByUser.slice(0, 8).map((item, index) => {
                  const maxCount = Math.max(...reportData.leadsByUser.map(i => i.count));
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 mr-4">
                        {item.user}
                      </span>
                      <div className="flex items-center space-x-2 w-32">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                            style={{ width: `${getBarWidth(item.count, maxCount)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Companies */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Companies
              </h3>
              <div className="space-y-3">
                {reportData.leadsByCompany.slice(0, 8).map((item, index) => {
                  const maxCount = Math.max(...reportData.leadsByCompany.map(i => i.count));
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 mr-4">
                        {item.company}
                      </span>
                      <div className="flex items-center space-x-2 w-32">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                            style={{ width: `${getBarWidth(item.count, maxCount)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leads by Source */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Leads by Source
              </h3>
              <div className="space-y-3">
                {reportData.leadsBySource.slice(0, 8).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                      {item.source}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Designations */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Designations
              </h3>
              <div className="space-y-3">
                {reportData.topDesignations.slice(0, 8).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                      {item.designation}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Trends
            </h3>
            <div className="h-64">
              {reportData.leadsByMonth.length > 0 ? (
                <div className="flex items-end justify-between h-48 space-x-1">
                  {reportData.leadsByMonth.map((item, index) => {
                    const maxCount = Math.max(...reportData.leadsByMonth.map(i => i.count));
                    const height = (item.count / maxCount) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-indigo-600 dark:bg-indigo-500 rounded-t transition-all duration-300"
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          {formatMonth(item.month)}
                        </div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white mt-1">
                          {item.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No data available for the selected time range
                </div>
              )}
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Performance Summary
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Most Active User</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reportData.leadsByUser[0]?.user || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Top Company</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reportData.leadsByCompany[0]?.company || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Most Common Source</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reportData.leadsBySource[0]?.source || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Distribution
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Unique Companies</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reportData.leadsByCompany.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Designation Types</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reportData.topDesignations.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Source Types</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reportData.leadsBySource.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Activity Metrics
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg Leads/Month</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reportData.leadsByMonth.length > 0 
                      ? Math.round(reportData.totalLeads / reportData.leadsByMonth.length)
                      : 0
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Peak Month</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reportData.leadsByMonth.reduce((max, item) => item.count > max.count ? item : max, {count: 0}).count || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Data Coverage</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {reportData.leadsByMonth.length} months
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}