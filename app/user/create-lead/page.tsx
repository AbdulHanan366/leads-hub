"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

interface AdditionalEmail {
  first_name: string;
  last_name: string;
  email: string;
  designation: string;
  profile_link: string;
  is_primary: boolean;
}

export default function CreateLead() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    designation: "",
    profile_link: "",
    email: "",
    person_mobile: "",
    location: "",
    city: "",
    country: "",
    company_name: "",
    company_link: "",
    job_title: "",
    job_link: "",
    source: "",
    notes: "",
  });

  const [additionalEmails, setAdditionalEmails] = useState<AdditionalEmail[]>(
    []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [companyCheckLoading, setCompanyCheckLoading] = useState(false);
  const [companyExists, setCompanyExists] = useState<boolean | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [showAddCountryModal, setShowAddCountryModal] = useState(false);
  const [newCountryName, setNewCountryName] = useState("");
  const [addingCountry, setAddingCountry] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyLeads, setCompanyLeads] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetchCountries();
    initializeDefaultCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch("/api/countries");
      if (response.ok) {
        const data = await response.json();
        const countryNames = data.countries.map((c: any) => c.name).sort();
        setCountries(countryNames);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const initializeDefaultCountries = async () => {
    const defaultCountries = ["US", "Canada", "UK", "Australia"];
    try {
      for (const countryName of defaultCountries) {
        const response = await fetch("/api/countries", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: countryName }),
        });
      }
      fetchCountries();
    } catch (error) {
      console.error("Error initializing default countries:", error);
    }
  };

  const handleAddCountry = async () => {
    if (!newCountryName.trim()) {
      return;
    }

    try {
      setAddingCountry(true);
      const response = await fetch("/api/countries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCountryName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add country");
      }

      const data = await response.json();
      setCountries((prev) => [...prev, data.country.name].sort());
      setFormData((prev) => ({ ...prev, country: data.country.name }));
      setNewCountryName("");
      setShowAddCountryModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add country");
    } finally {
      setAddingCountry(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.designation.trim()) {
      newErrors.designation = "Designation is required";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.company_name.trim()) {
      newErrors.company_name = "Company name is required";
    }

    // Validate additional emails
    additionalEmails.forEach((email, index) => {
      if (!email.first_name.trim()) {
        newErrors[`additional_first_name_${index}`] = "First name is required";
      }
      if (!email.last_name.trim()) {
        newErrors[`additional_last_name_${index}`] = "Last name is required";
      }
      if (email.email && !/\S+@\S+\.\S+/.test(email.email)) {
        newErrors[`additional_email_${index}`] = "Email is invalid";
      }
      if (!email.email.trim()) {
        newErrors[`additional_email_${index}`] = "Email is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const locationParts = [];
      if (formData.city.trim()) {
        locationParts.push(formData.city.trim());
      }
      if (formData.country.trim()) {
        locationParts.push(formData.country.trim());
      }
      const combinedLocation = locationParts.join(", ");

      const { city, country, ...formDataWithoutCityCountry } = formData;

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formDataWithoutCityCountry,
          location: combinedLocation,
          additional_emails: additionalEmails,
          assigned_to: user?.id,
          created_by: user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create lead");
      }

      setSuccess(true);
      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        designation: "",
        profile_link: "",
        email: "",
        person_mobile: "",
        location: "",
        city: "",
        country: "",
        company_name: "",
        company_link: "",
        job_title: "",
        job_link: "",
        source: "",
        notes: "",
      });
      setAdditionalEmails([]);

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error ? error.message : "Failed to create lead",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanyCheckSubmit = async () => {
    if (!formData.company_name.trim()) {
      setErrors({ company_name: "Company name is required" });
      return;
    }

    try {
      setCompanyCheckLoading(true);
      const response = await fetch(
        `/api/leads/company?company_name=${encodeURIComponent(
          formData.company_name.trim()
        )}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check company");
      }

      const data = await response.json();

      if (data.exists && data.company) {
        setFormData((prev) => ({
          ...prev,
          company_link: data.company.company_link || "",
        }));

        setCompanyExists(true);
        setCompanyInfo(data.company);
        setCompanyLeads(data.leads || []);
        setShowCompanyModal(true);
      } else {
        setCompanyExists(false);
        setCompanyInfo(null);
        setCompanyLeads([]);
      }
    } catch (error) {
      setCompanyExists(false);
      console.error("Error checking company:", error);
      setErrors({
        submit:
          error instanceof Error ? error.message : "Failed to check company",
      });
    } finally {
      setCompanyCheckLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const addAdditionalEmail = () => {
    setAdditionalEmails((prev) => [
      ...prev,
      {
        first_name: "",
        last_name: "",
        email: "",
        designation: "",
        profile_link: "",
        is_primary: false,
      },
    ]);
  };

  const removeAdditionalEmail = (index: number) => {
    setAdditionalEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAdditionalEmail = (
    index: number,
    field: keyof AdditionalEmail,
    value: string | boolean
  ) => {
    setAdditionalEmails((prev) =>
      prev.map((email, i) =>
        i === index ? { ...email, [field]: value } : email
      )
    );
  };

  return (
    <ProtectedRoute requiredRole="user">
      <DashboardLayout>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create New Lead
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Add a new lead to your pipeline with complete information.
            </p>
          </div>

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-400 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-green-800 dark:text-green-200">
                  Lead created successfully!
                </span>
              </div>
            </div>
          )}

          <div className="max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Company Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Company Information
                  </h3>
                  <button
                    type="button"
                    onClick={handleCompanyCheckSubmit}
                    disabled={companyCheckLoading || !formData.company_name.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {companyCheckLoading ? "Checking..." : "Check Company"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.company_name
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="Enter company name"
                    />
                    {errors.company_name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.company_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Website
                    </label>
                    <input
                      type="url"
                      name="company_link"
                      value={formData.company_link}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="https://company.com"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Click "Check Company" to auto-fill if company exists
                    </p>
                  </div>

                  {companyExists === false && (
                    <div className="md:col-span-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-400 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-green-800 dark:text-green-200">
                          Company not found. You can proceed to add a new
                          company.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.first_name
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="Enter first name"
                    />
                    {errors.first_name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.first_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.last_name
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="Enter last name"
                    />
                    {errors.last_name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.last_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Designation *
                    </label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.designation
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="e.g., CEO, Manager, etc."
                    />
                    {errors.designation && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.designation}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Profile Link
                    </label>
                    <input
                      type="url"
                      name="profile_link"
                      value={formData.profile_link}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Primary Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.email
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      placeholder="primary@company.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      name="person_mobile"
                      value={formData.person_mobile}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">
                      Additional Emails
                    </h4>
                    <button
                      type="button"
                      onClick={addAdditionalEmail}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                    >
                      + Add Email
                    </button>
                  </div>

                  {additionalEmails.map((email, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={email.first_name}
                            onChange={(e) =>
                              updateAdditionalEmail(
                                index,
                                "first_name",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={email.last_name}
                            onChange={(e) =>
                              updateAdditionalEmail(
                                index,
                                "last_name",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Designation
                          </label>
                          <input
                            type="text"
                            value={email.designation}
                            onChange={(e) =>
                              updateAdditionalEmail(
                                index,
                                "designation",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Alternative designation"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Profile Link
                          </label>
                          <input
                            type="url"
                            value={email.profile_link}
                            onChange={(e) =>
                              updateAdditionalEmail(
                                index,
                                "profile_link",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={email.email}
                            onChange={(e) =>
                              updateAdditionalEmail(
                                index,
                                "email",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                              errors[`additional_email_${index}`]
                                ? "border-red-500"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                            placeholder="additional@company.com"
                            required
                          />
                          {errors[`additional_email_${index}`] && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors[`additional_email_${index}`]}
                            </p>
                          )}
                        </div>
                        <div className="flex items-end space-x-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={email.is_primary}
                              onChange={(e) =>
                                updateAdditionalEmail(
                                  index,
                                  "is_primary",
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Primary
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdditionalEmail(index)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Job Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      name="job_title"
                      value={formData.job_title}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Current job title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Job Posting Link
                    </label>
                    <input
                      type="url"
                      name="job_link"
                      value={formData.job_link}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="https://company.com/careers/job-id"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select a country</option>
                        {countries.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddCountryModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap"
                      >
                        + Add Country
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Source
                    </label>
                    <input
                      type="text"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="How did you find this lead?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Any additional notes about this lead..."
                    />
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-400 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-red-800 dark:text-red-200">
                      {errors.submit}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-4 pt-6">
                <button
                  type="button"
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "Creating Lead..." : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {showAddCountryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add New Country
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Country Name
                </label>
                <input
                  type="text"
                  value={newCountryName}
                  onChange={(e) => setNewCountryName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddCountry();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter country name"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCountryModal(false);
                    setNewCountryName("");
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCountry}
                  disabled={addingCountry || !newCountryName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingCountry ? "Adding..." : "Add Country"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Company Leads Modal */}
        {showCompanyModal && companyInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Company Found: {companyInfo.company_name}
                    </h3>
                    {companyInfo.company_link && (
                      <a
                        href={companyInfo.company_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 block"
                      >
                        {companyInfo.company_link}
                      </a>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {companyLeads.length} lead{companyLeads.length !== 1 ? 's' : ''} found for this company
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCompanyModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {companyLeads.length > 0 ? (
                  <div className="space-y-4">
                    {companyLeads.map((lead: any) => (
                      <div
                        key={lead._id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="space-y-4">
                          {/* Contact Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {lead.first_name} {lead.last_name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {lead.email}
                              </div>
                              {lead.designation && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <span className="font-medium">Designation:</span> {lead.designation}
                                </div>
                              )}
                              {lead.profile_link && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <a
                                    href={lead.profile_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    View Profile
                                  </a>
                                </div>
                              )}
                            </div>
                            <div>
                              {lead.location && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Location:</span> {lead.location}
                                </div>
                              )}
                              {lead.person_mobile && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <span className="font-medium">Mobile:</span> {lead.person_mobile}
                                </div>
                              )}
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span className="font-medium">Created:</span>{" "}
                                {new Date(lead.created_at).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                              {lead.assigned_to && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  <span className="font-medium">Assigned to:</span> {lead.assigned_to.name}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Job Information */}
                          {(lead.job_title || lead.job_link) && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Job Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {lead.job_title && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Job Title:</span> {lead.job_title}
                                  </div>
                                )}
                                {lead.job_link && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Job Link:</span>{" "}
                                    <a
                                      href={lead.job_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                                    >
                                      {lead.job_link}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Additional Information */}
                          {(lead.source || lead.notes) && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Additional Information
                              </h4>
                              {lead.source && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  <span className="font-medium">Source:</span> {lead.source}
                                </div>
                              )}
                              {lead.notes && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Notes:</span>
                                  <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                    {lead.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No leads found for this company
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setShowCompanyModal(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
