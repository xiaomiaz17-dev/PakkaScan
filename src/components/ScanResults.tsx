import React from 'react';

interface ScanResultsProps {
  data: {
    extractedData?: {
      landlordName?: string;
      tenantName?: string;
      landlordCnic?: string;
      tenantCnic?: string;
      monthlyRent?: number;
      stampValue?: number;
    };
    validations?: {
      landlordCnicValid: boolean;
      tenantCnicValid: boolean;
      stampPaperValid: boolean;
      errors: string[];
    };
  };
}

export default function ScanResults({ data }: ScanResultsProps) {
  if (!data || !data.extractedData) return null;

  const { extractedData, validations } = data;

  return (
    <div className="mt-6 p-6 bg-white rounded-xl shadow-md border border-gray-100 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Document Verification Results</h3>

      {/* Validation Summary Badges */}
      <div className="flex gap-3 mb-6">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${validations?.landlordCnicValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Landlord CNIC {validations?.landlordCnicValid ? 'Valid' : 'Flagged'}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${validations?.tenantCnicValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Tenant CNIC {validations?.tenantCnicValid ? 'Valid' : 'Flagged'}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${validations?.stampPaperValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Stamp Duty {validations?.stampPaperValid ? 'Compliant' : 'Under-valued'}
        </span>
      </div>

      {/* Errors / Warnings List */}
      {validations?.errors && validations.errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-bold text-red-900 mb-2">Compliance Warnings Detected:</h4>
          <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
            {validations.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 border-t pt-4">
        <div>
          <p className="text-gray-500 text-xs">Landlord Name</p>
          <p className="font-medium">{extractedData.landlordName || 'Not detected'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Landlord CNIC</p>
          <p className="font-medium font-mono">{extractedData.landlordCnic || 'Not detected'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Tenant Name</p>
          <p className="font-medium">{extractedData.tenantName || 'Not detected'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Tenant CNIC</p>
          <p className="font-medium font-mono">{extractedData.tenantCnic || 'Not detected'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Monthly Rent</p>
          <p className="font-medium">PKR {extractedData.monthlyRent?.toLocaleString() || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Stamp Paper Value</p>
          <p className="font-medium">PKR {extractedData.stampValue?.toLocaleString() || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}