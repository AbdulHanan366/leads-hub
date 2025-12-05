'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface Lead {
  _id: string;
  first_name: string;
  last_name: string;
  designation: string;
  email: string;
  company_name: string;
  location: string;
  person_mobile: string;
  profile_link: string;
  company_link: string;
  job_title: string;
  job_link: string;
  source: string;
  notes: string;
  additional_emails: Array<{
    email: string;
    designation: string;
    is_primary: boolean;
  }>;
  created_at: string;
  assigned_to: {
    name: string;
    email: string;
  };
  created_by: {
    name: string;
    email: string;
  };
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalLeads: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ViewLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalLeads: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<{
    companies: string[];
    locations: string[];
    designations: string[];
  }>({
    companies: [],
    locations: [],
    designations: [],
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [searchTerm, companyFilter, locationFilter, designationFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (user?.id) {
      fetchLeads();
    }
  }, [pagination.currentPage, searchTerm, companyFilter, locationFilter, designationFilter, sortBy, sortOrder, user?.id]);

  useEffect(() => {
    fetchFilterOptions();
  }, [user]);

  const fetchLeads = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: '10',
        userId: user.id,
        role: user.role || 'user',
        ...(searchTerm && { search: searchTerm }),
        ...(companyFilter && { company: companyFilter }),
        ...(locationFilter && { location: locationFilter }),
        ...(designationFilter && { designation: designationFilter }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/leads?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      
      const data = await response.json();
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      if (!user?.id) return;
      
      const params = new URLSearchParams({
        userId: user.id,
        role: user.role || 'user',
      });

      const response = await fetch(`/api/leads/filters?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch filter options');
      }
      
      const data = await response.json();
      setFilterOptions(data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!confirm(`Are you sure you want to delete lead "${leadName}"? This action cannot be undone.`)) {
      return;
    }

    setLoadingAction(`deleting-${leadId}`);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      // Refresh leads list
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingLead(null);
  };

  const openViewModal = (lead: Lead) => {
    setViewingLead(lead);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingLead(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    setLoadingAction('editing');
    try {
      const response = await fetch(`/api/leads/${editingLead._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingLead),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead');
      }

      // Refresh leads list
      fetchLeads();
      closeEditModal();
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCompanyFilter('');
    setLocationFilter('');
    setDesignationFilter('');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  return (
    <ProtectedRoute requiredRole="user">
      <DashboardLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              All Leads
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage and view all your leads in one place
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              <form onSubmit={handleSearch} className="lg:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, company, or job title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>

              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Companies</option>
                {filterOptions.companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Locations</option>
                {filterOptions.locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Designations</option>
                {filterOptions.designations.map(designation => (
                  <option key={designation} value={designation}>{designation}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="created_at">Sort by Date</option>
                <option value="first_name">Sort by Name</option>
                <option value="company_name">Sort by Company</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>

              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading leads...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Company & Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {leads.map((lead) => (
                        <tr key={lead._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {lead.first_name} {lead.last_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {lead.email}
                              </div>
                              {lead.person_mobile && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {lead.person_mobile}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {lead.company_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {lead.designation}
                            </div>
                            {lead.job_title && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {lead.job_title}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {lead.location || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => openViewModal(lead)}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openEditModal(lead)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead._id, `${lead.first_name} ${lead.last_name}`)}
                              disabled={loadingAction === `deleting-${lead._id}`}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                            >
                              {loadingAction === `deleting-${lead._id}` ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {leads.length === 0 && !isLoading && (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No leads found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {searchTerm || companyFilter || locationFilter || designationFilter 
                        ? 'Try adjusting your search or filters' 
                        : 'Get started by creating your first lead'
                      }
                    </p>
                    {!searchTerm && !companyFilter && !locationFilter && !designationFilter && (
                      <a
                        href="/user/create-lead"
                        className="mt-4 inline-flex px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Create Lead
                      </a>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && leads.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {leads.length} of {pagination.totalLeads} leads
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPrev}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                          Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <button
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={!pagination.hasNext}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* View Lead Modal */}
        {showViewModal && viewingLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Lead Details
                  </h3>
                  <button
                    onClick={closeViewModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.first_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.last_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Designation</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.designation}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.location || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Contact Information</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.email}</p>
                      </div>
                      {viewingLead.person_mobile && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile</label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.person_mobile}</p>
                        </div>
                      )}
                      {viewingLead.profile_link && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Link</label>
                          <a href={viewingLead.profile_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
                            {viewingLead.profile_link}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Additional Emails */}
                    {viewingLead.additional_emails && viewingLead.additional_emails.length > 0 && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Emails</label>
                        <div className="mt-2 space-y-2">
                          {viewingLead.additional_emails.map((email, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <span className="text-gray-900 dark:text-white">{email.email}</span>
                              <span className="text-gray-500 dark:text-gray-400">({email.designation})</span>
                              {email.is_primary && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                  Primary
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Company Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Company Information</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.company_name}</p>
                      </div>
                      {viewingLead.company_link && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Company Website</label>
                          <a href={viewingLead.company_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
                            {viewingLead.company_link}
                          </a>
                        </div>
                      )}
                      {viewingLead.job_title && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Job Title</label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.job_title}</p>
                        </div>
                      )}
                      {viewingLead.job_link && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Job Link</label>
                          <a href={viewingLead.job_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
                            {viewingLead.job_link}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Additional Information</h4>
                    <div className="space-y-2">
                      {viewingLead.source && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Source</label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.source}</p>
                        </div>
                      )}
                      {viewingLead.notes && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                          <p className="text-sm text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{viewingLead.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* System Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">System Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned To</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.assigned_to.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created By</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingLead.created_by.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created Date</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(viewingLead.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Lead Modal */}
        {showEditModal && editingLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Edit Lead
                  </h3>
                  <button
                    onClick={closeEditModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleEditSubmit}>
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={editingLead.first_name}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={editingLead.last_name}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={editingLead.designation}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, designation: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Location
                        </label>
                        <input
                          type="text"
                          value={editingLead.location || ''}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, location: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editingLead.email}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, email: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Mobile
                        </label>
                        <input
                          type="tel"
                          value={editingLead.person_mobile || ''}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, person_mobile: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Profile Link
                        </label>
                        <input
                          type="url"
                          value={editingLead.profile_link || ''}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, profile_link: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Company Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={editingLead.company_name}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Company Website
                        </label>
                        <input
                          type="url"
                          value={editingLead.company_link || ''}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, company_link: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Job Title
                        </label>
                        <input
                          type="text"
                          value={editingLead.job_title || ''}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, job_title: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Job Link
                        </label>
                        <input
                          type="url"
                          value={editingLead.job_link || ''}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, job_link: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Source
                        </label>
                        <input
                          type="text"
                          value={editingLead.source || ''}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, source: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Notes
                        </label>
                        <textarea
                          value={editingLead.notes || ''}
                          onChange={(e) => setEditingLead(prev => prev ? { ...prev, notes: e.target.value } : null)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loadingAction === 'editing'}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingAction === 'editing' ? 'Updating...' : 'Update Lead'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}