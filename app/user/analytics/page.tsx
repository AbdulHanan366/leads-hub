'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface AnalyticsData {
  totalLeads: number;
  leadsByCompany: any;
  leadsByLocation: any;
  leadsByDesignation: any;
  leadsBySource: any;
  leadsOverTime: any;
  topCompanies: any;
}

export default function Analytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalLeads: 0,
    leadsByCompany: [],
    leadsByLocation: [],
    leadsByDesignation: [],
    leadsBySource: [],
    leadsOverTime: [],
    topCompanies: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // 7, 30, 90, 365

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [timeRange, user?.id]);

  const fetchAnalytics = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // In a real app, you would have an analytics API endpoint
      // For now, we'll fetch leads and calculate analytics on the client
      const params = new URLSearchParams({
        userId: user.id,
        role: user.role || 'user',
        limit: '1000',
      });

      const response = await fetch(`/api/leads?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      calculateAnalytics(data.leads);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAnalytics = (leads: any[]) => {
    // Filter leads by time range
    const filteredLeads = leads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));
      return leadDate >= cutoffDate;
    });

    // Calculate various analytics
    const leadsByCompany = calculateCountByField(filteredLeads, 'company_name', 'company');
    const leadsByLocation = calculateCountByField(filteredLeads, 'location', 'location').filter(item => item.location);
    const leadsByDesignation = calculateCountByField(filteredLeads, 'designation', 'designation');
    const leadsBySource = calculateCountByField(filteredLeads, 'source', 'source').filter(item => item.source);
    const leadsOverTime = calculateLeadsOverTime(filteredLeads);
    const topCompanies = leadsByCompany.slice(0, 10);

    setAnalytics({
      totalLeads: filteredLeads.length,
      leadsByCompany,
      leadsByLocation,
      leadsByDesignation,
      leadsBySource,
      leadsOverTime,
      topCompanies,
    });
  };

  const calculateCountByField = (leads: any[], field: string, label: string) => {
    const counts: { [key: string]: number } = {};

    leads.forEach(lead => {
      const value = lead[field] || 'Unknown';
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([key, count]) => ({ [label]: key, count }))
      .sort((a, b) => b.count - a.count);
  };

  const calculateLeadsOverTime = (leads: any[]) => {
    const counts: { [key: string]: number } = {};

    leads.forEach(lead => {
      const date = new Date(lead.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
      counts[date] = (counts[date] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days
  };

  const getBarWidth = (count: number, maxCount: number) => {
    const maxWidth = 100;
    return (count / maxCount) * maxWidth;
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="user">
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
    <ProtectedRoute requiredRole="user">
      <DashboardLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Insights and trends from your leads data
                </p>
              </div>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
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
                    {analytics.totalLeads}
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
                    Unique Companies
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {analytics.leadsByCompany.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Locations Covered
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {analytics.leadsByLocation.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Designations
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {analytics.leadsByDesignation.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Companies */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Companies
              </h3>
              <div className="space-y-3">
                {analytics.topCompanies.slice(0, 8).map((item: any, index: any) => {
                  const maxCount = Math.max(...analytics.topCompanies.map((i: any) => i.count));
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 mr-4">
                        {item.company}
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

            {/* Leads by Designation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Designations
              </h3>
              <div className="space-y-3">
                {analytics.leadsByDesignation.slice(0, 8).map((item: any, index: any) => {
                  const maxCount = Math.max(...analytics.leadsByDesignation.map((i: any) => i.count));
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 mr-4">
                        {item.designation}
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

            {/* Leads by Location */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Leads by Location
              </h3>
              <div className="space-y-3">
                {analytics.leadsByLocation.slice(0, 8).map((item: any, index: any) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                      {item.location}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leads by Source */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Leads by Source
              </h3>
              <div className="space-y-3">
                {analytics.leadsBySource.slice(0, 8).map((item: any, index: any) => (
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
          </div>

          {/* Recent Activity Chart */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Leads Over Time
            </h3>
            <div className="h-64">
              {analytics.leadsOverTime.length > 0 ? (
                <div className="flex items-end justify-between h-48 space-x-1">
                  {analytics.leadsOverTime.map((item: any, index: any) => {
                    const maxCount = Math.max(...analytics.leadsOverTime.map((i: any) => i.count));
                    const height = (item.count / maxCount) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-indigo-600 dark:bg-indigo-500 rounded-t transition-all duration-300"
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}