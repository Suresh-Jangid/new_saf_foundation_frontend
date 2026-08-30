# Purabiya Foundation Admin API Services

This directory contains comprehensive TypeScript API services for the Purabiya Foundation Admin application. All services are built on top of the PHP backend API and provide type-safe, easy-to-use functions for all CRUD operations.

## Files Overview

- `api.ts` - Core API configuration, endpoints, and low-level API functions
- `services.ts` - High-level API service classes with TypeScript interfaces
- `api-examples.ts` - Comprehensive examples showing how to use all API services
- `README.md` - This documentation file

## Quick Start

```typescript
import APIService from './lib/services';

// Login
const loginResponse = await APIService.login("mobile", "password");

// Create a general application
const applicationData = {
  formNumber: "APP001",
  applicantName: "John Doe",
  // ... other fields
};
const response = await APIService.createGeneralApplication(applicationData);
```

## API Services Overview

### 1. Authentication
- `APIService.login(mobile, password)` - User login
- `APIService.logout(token)` - User logout
- `APIService.register(name, email, mobile, password)` - User registration

### 2. General Applications
- `APIService.createGeneralApplication(data)` - Create new application
- `APIService.getGeneralApplications(filters?)` - Get applications with optional filters
- `APIService.updateGeneralApplication(id, data)` - Update application
- `APIService.deleteGeneralApplication(id)` - Delete application

### 3. Insurance Applications
- `APIService.createInsuranceApplication(data)` - Create insurance application
- `APIService.getInsuranceApplications(filters?)` - Get insurance applications
- `APIService.getInsuranceApplicationById(id)` - Get single insurance application
- `APIService.updateInsuranceApplication(id, data)` - Update insurance application
- `APIService.deleteInsuranceApplication(id)` - Delete insurance application

### 4. Loan Applications
- `APIService.createLoanApplication(data)` - Create loan application
- `APIService.getLoanApplications(filters?)` - Get loan applications
- `APIService.updateLoanApplication(id, data)` - Update loan application
- `APIService.deleteLoanApplication(id)` - Delete loan application

### 5. Financial Help
- `APIService.createFinancialHelp(data)` - Create financial help record
- `APIService.getFinancialHelps(filters?)` - Get financial help records
- `APIService.updateFinancialHelp(id, data)` - Update financial help
- `APIService.deleteFinancialHelp(id)` - Delete financial help

### 6. Disability Cycle
- `APIService.createDisabilityCycle(data)` - Create disability cycle application
- `APIService.getDisabilityCycles(filters?)` - Get disability cycle applications
- `APIService.updateDisabilityCycle(id, data)` - Update disability cycle
- `APIService.deleteDisabilityCycle(id)` - Delete disability cycle

### 7. Agent Registration
- `APIService.createAgent(data)` - Create agent registration
- `APIService.getAgents(filters?)` - Get agent registrations
- `APIService.updateAgent(id, data)` - Update agent registration
- `APIService.deleteAgent(id)` - Delete agent registration

### 8. Marriage Congratulations
- `APIService.createMarriageCongratulations(data)` - Create marriage congratulations
- `APIService.getMarriageCongratulations(filters?)` - Get marriage congratulations
- `APIService.updateMarriageCongratulations(id, data)` - Update marriage congratulations
- `APIService.deleteMarriageCongratulations(id)` - Delete marriage congratulations

### 9. Marriage Sewing Machine
- `APIService.createMarriageSewingMachine(data)` - Create marriage sewing machine
- `APIService.getMarriageSewingMachines(filters?)` - Get marriage sewing machines
- `APIService.updateMarriageSewingMachine(id, data)` - Update marriage sewing machine
- `APIService.deleteMarriageSewingMachine(id)` - Delete marriage sewing machine

### 10. Pension Yojana
- `APIService.createPensionYojana(data)` - Create pension yojana
- `APIService.getPensionYojanas(filters?)` - Get pension yojanas
- `APIService.updatePensionYojana(id, data)` - Update pension yojana
- `APIService.deletePensionYojana(id)` - Delete pension yojana

### 11. Sewing Machine Camp
- `APIService.createSewingMachineCamp(data)` - Create sewing machine camp
- `APIService.getSewingMachineCamps(filters?)` - Get sewing machine camps
- `APIService.getSewingMachineCampById(id)` - Get single sewing machine camp
- `APIService.updateSewingMachineCamp(id, data)` - Update sewing machine camp
- `APIService.deleteSewingMachineCamp(id)` - Delete sewing machine camp

### 12. Suraksha Bima Yojana
- `APIService.createSurakshaBimaYojana(data)` - Create suraksha bima yojana
- `APIService.getSurakshaBimaYojanas(filters?)` - Get suraksha bima yojanas
- `APIService.getSurakshaBimaYojanaById(id)` - Get single suraksha bima yojana
- `APIService.updateSurakshaBimaYojana(id, data)` - Update suraksha bima yojana
- `APIService.deleteSurakshaBimaYojana(id)` - Delete suraksha bima yojana

### 13. Payment Management
- `APIService.createPayment(data)` - Create payment record
- `APIService.getPayments(filters?)` - Get payment records
- `APIService.updatePayment(id, data)` - Update payment record
- `APIService.deletePayment(id)` - Delete payment record

### 14. Marriage Details
- `APIService.getMarriageDetailsByNumber(marriageNumber)` - Get marriage details by number

## TypeScript Interfaces

All data structures are fully typed with TypeScript interfaces:

```typescript
import { 
  GeneralApplication,
  InsuranceApplication,
  LoanApplication,
  FinancialHelp,
  DisabilityCycle,
  AgentRegistration,
  MarriageCongratulations,
  MarriageSewingMachine,
  PensionYojana,
  SewingMachineCamp,
  SurakshaBimaYojana,
  PaymentManagement,
  ApplicationFilters,
  PaymentFilters
} from './lib/services';
```

## Filtering and Search

All list endpoints support comprehensive filtering:

```typescript
// Application filters
const filters: ApplicationFilters = {
  fromDate: "2024-01-01",
  toDate: "2024-12-31",
  applicantName: "John",
  gender: "Male",
  search: "John Doe" // Global search
};

const applications = await APIService.getGeneralApplications(filters);

// Payment filters
const paymentFilters: PaymentFilters = {
  from: "2024-01-01",
  to: "2024-12-31",
  type: "Income",
  amount: 10000
};

const payments = await APIService.getPayments(paymentFilters);
```

## Error Handling

All API functions return a consistent response format:

```typescript
interface ApiResponse<T = any> {
  status: boolean;
  message: string;
  data?: T;
  error?: boolean;
}
```

Example error handling:

```typescript
try {
  const response = await APIService.createGeneralApplication(data);
  if (response.status) {
    console.log("Success:", response.message);
    // Handle success
  } else {
    console.error("API Error:", response.message);
    // Handle API error
  }
} catch (error) {
  console.error("Network Error:", error);
  // Handle network error
}
```

## File Upload Support

The API supports file uploads for various fields:

```typescript
const applicationData = {
  applicantName: "John Doe",
  passportPhoto: fileInput.files[0], // File object
  // ... other fields
};

const response = await APIService.createGeneralApplication(applicationData);
```

## Authentication

The API automatically handles authentication tokens:

```typescript
// Login and store token
const loginResponse = await APIService.login("mobile", "password");
if (loginResponse.status) {
  localStorage.setItem("token", loginResponse.data.token);
}

// Token is automatically included in subsequent requests
const applications = await APIService.getGeneralApplications();
```

## Examples

See `api-examples.ts` for comprehensive examples of all API usage patterns.

## API Endpoints

All endpoints are defined in `API_ENDPOINTS`:

```typescript
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: "?apicall=login",
  LOGOUT: "?apicall=logout",
  REGISTER: "?apicall=register",
  
  // General Applications
  CREATE_APPLICATION: "?apicall=createApplication",
  GET_APPLICATIONS: "?apicall=getApplications",
  UPDATE_APPLICATION: "?apicall=updateApplication",
  DELETE_APPLICATION: "?apicall=deleteApplication",
  
  // ... and many more
};
```

## Base Configuration

The API is configured with:

- Base URL: `https://firewallitsolution.com/purbiya/api/api.php`
- Timeout: 30 seconds (increased for file uploads)
- Automatic token handling
- FormData support for file uploads
- CORS support
- Error interceptors

## Usage in Components

```typescript
import { useState, useEffect } from 'react';
import APIService from './lib/services';

function ApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await APIService.getGeneralApplications();
      if (response.status) {
        setApplications(response.data);
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApplication = async (data) => {
    try {
      const response = await APIService.createGeneralApplication(data);
      if (response.status) {
        loadApplications(); // Reload list
      }
    } catch (error) {
      console.error('Failed to create application:', error);
    }
  };

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
}
```

## Best Practices

1. **Always handle errors**: Wrap API calls in try-catch blocks
2. **Check response status**: Always verify `response.status` before proceeding
3. **Use TypeScript**: Leverage the provided interfaces for type safety
4. **Handle loading states**: Show loading indicators during API calls
5. **Validate data**: Validate data before sending to API
6. **Use filters**: Use the filtering capabilities for better performance
7. **File uploads**: Use FormData for file uploads
8. **Authentication**: Ensure proper token management

## Support

For issues or questions about the API services, refer to:
- The PHP backend API documentation
- The example file (`api-examples.ts`)
- The TypeScript interfaces for data structures 