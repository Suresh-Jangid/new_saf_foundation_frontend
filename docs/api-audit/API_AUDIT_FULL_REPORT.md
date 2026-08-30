# API Audit Full Report

Generated: 2026-06-28T16:07:58.997Z

## Summary

| Metric | Count |
|--------|-------|
| **Total Backend APIs** | 112 |
| **Tested APIs** | 112 |
| **Working APIs** | 110 |
| **Failed APIs** | 2 |
| **Success Rate** | 98.2% |

## Configuration

- Backend URL: `http://localhost:5000/api`
- Frontend URL: `http://localhost:3000`
- Auth: Yes (login token obtained)
- Health check: PASS (`http://localhost:5000/health`, 200)
- Sample IDs used: `{"agentId":"895b88d7-589f-420d-bbe1-ab235707e4aa","applicationId":"f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b","insuranceId":null,"loanId":null,"financialHelpId":null,"disabilityCycleId":null,"marriageId":"7a7864f9-3def-4daf-b63d-4a377388ab4e","marriageSewingId":null,"mayraId":null,"mayraCongratsId":null,"mayraInstallmentId":null,"mayraCongratulationsPaymentId":null,"pensionId":null,"sewingCampId":null,"surakshaBimaId":null,"paymentId":null}`

## Failed Endpoints

- `createApplication` (200) — totalAmount is required
- `addMarriageCongrats` (200) — date is required

## Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-06-28T16:08:15.560Z",
  "uptime": 1045.214928
}
```

## All API Responses

### login — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=login` |
| HTTP Status | 200 |
| Duration | 460ms |
| Message | Login successful |
| Skip write test | no |

**Request body**

```json
{
  "mobile": "9999999999",
  "password": "[REDACTED]"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Login successful",
  "user": {
    "id": "91bca7b6-c3db-43ea-ae7f-332e977bc639",
    "name": "Super Admin",
    "email": "admin@purabiya.org",
    "mobile": "9999999999",
    "token": "eyJhbG…[REDACTED]"
  }
}
```

### agentLogin — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=agentLogin` |
| HTTP Status | 200 |
| Duration | 2061ms |
| Message | Agent login successful |
| Skip write test | no |

**Request body**

```json
{
  "mobile": "8888888888",
  "password": "[REDACTED]"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Agent login successful",
  "agent": {
    "id": "b682f732-acd3-40cb-8281-c8195780fc51",
    "name": "Default Agent",
    "mobile": "8888888888",
    "email": "agent@purabiya.org",
    "employeeId": "EMP001",
    "permissions": {
      "dashboard": [
        "view"
      ],
      "applicant_registration": [
        "view",
        "create",
        "update"
      ],
      "mayra_registration": [
        "view",
        "create",
        "update"
      ],
      "payment_management": [
        "view"
      ],
      "marriage_congratulations_payment": [
        "view"
      ],
      "suraksha_bima_yojana_payment": [
        "view"
      ],
      "bulk_marriage_emi": [
        "view"
      ],
      "bulk_suraksha_bima_emi": [
        "view"
      ],
      "bulk_mayra_emi": [
        "view"
      ]
    },
    "profile": {
      "id": "bf2983e4-5833-4b5b-af6c-9f19967e4aee",
      "userId": "b682f732-acd3-40cb-8281-c8195780fc51",
      "employeeId": "EMP001",
      "fatherName": "Mr. Agent Father",
      "gotra": "Prajapat",
      "age": 30,
      "gender": "Male",
      "village": "Jasal",
      "address": "Near Temple, Village Jasal",
      "tehsil": "Balotra",
      "district": "Balotra",
      "workArea": "Balotra Block",
      "bankName": "State Bank of India",
      "accountNumber": "12345678901",
      "ifscCode": "SBIN0001234",
      "nomineeName": "Nominee Agent",
      "nomineeMobile": "9876543210",
      "nomineeRelation": "Wife",
      "createdAt": "2026-06-17T18:22:13.002Z",
      "updatedAt": "2026-06-17T18:22:13.002Z",
      "deletedAt": null
    },
    "token": "eyJhbG…[REDACTED]"
  }
}
```

### logout — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=logout` |
| HTTP Status | 200 |
| Duration | 6ms |
| Message | Logged out successfully |
| Skip write test | no |

**Request body**

```json
{
  "token": "test"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Logged out successfully"
}
```

### register — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=register` |
| HTTP Status | 200 |
| Duration | 820ms |
| Message | Mobile number is already registered |
| Skip write test | no |

**Request body**

```json
{
  "name": "Test",
  "email": "t@test.com",
  "mobile": "9999999999",
  "password": "[REDACTED]"
}
```

**Response**

```json
{
  "status": false,
  "error": true,
  "message": "Mobile number is already registered"
}
```

### getDashboardCounts — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getDashboardCounts` |
| HTTP Status | 200 |
| Duration | 3540ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{}
```

**Response**

```json
{
  "success": true,
  "status": true,
  "error": false,
  "dashboard": {
    "total_counts": {
      "agent_registration": 3,
      "applications": 5,
      "application_insurance": 0,
      "disability_cycle": 0,
      "financial_help": 0,
      "loan_applications": 0,
      "marriage_congratulations": 2,
      "marriage_sewing_machine": 0,
      "pension_yojana": 0,
      "sewing_machine_camp": 0,
      "suraksha_bima_yojana": 0,
      "mayra_registration": 0
    },
    "last_7_days_count": 5
  }
}
```

### getAgents — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getAgents` |
| HTTP Status | 200 |
| Duration | 1601ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": [
    {
      "id": "895b88d7-589f-420d-bbe1-ab235707e4aa",
      "mobile": "9000198141",
      "passwordHash": "$2a$10…[REDACTED]",
      "name": "Audit Agent",
      "email": null,
      "role": "AGENT",
      "isActive": true,
      "createdAt": "2026-06-25T19:36:39.273Z",
      "updatedAt": "2026-06-25T19:36:39.273Z",
      "deletedAt": null,
      "agentProfile": {
        "id": "73155016-c955-4097-aefc-4d5a2426e06f",
        "userId": "895b88d7-589f-420d-bbe1-ab235707e4aa",
        "employeeId": "EMP-013",
        "fatherName": "Test Father",
        "gotra": "Prajapat",
        "age": 30,
        "gender": "Male",
        "village": "Jasal",
        "address": "Test",
        "tehsil": "Balotra",
        "district": "Barmer",
        "workArea": "Balotra",
        "bankName": "SBI",
        "accountNumber": "123",
        "ifscCode": "SBIN0001234",
        "nomineeName": "Nominee",
        "nomineeMobile": "9999999998",
        "nomineeRelation": "Wife",
        "createdAt": "2026-06-25T19:36:39.424Z",
        "updatedAt": "2026-06-25T19:36:39.424Z",
        "deletedAt": null
      }
    },
    {
      "id": "9a8896c4-d697-475f-812d-4ce5473055ad",
      "mobile": "9876543210",
      "passwordHash": "$2a$10…[REDACTED]",
      "name": "Ramesh Kumar",
      "email": null,
      "role": "AGENT",
      "isActive": true,
      "createdAt": "2026-06-21T18:35:24.172Z",
      "updatedAt": "2026-06-21T18:35:24.172Z",
      "deletedAt": null,
      "agentProfile": {
        "id": "d3551acf-9a2d-48a2-bd57-d4a1606a38d6",
        "userId": "9a8896c4-d697-475f-812d-4ce5473055ad",
        "employeeId": "EMP-002",
        "fatherName": "Shyam Lal",
        "gotra": "Prajapat",
        "age": 34,
        "gender": "Male",
        "village": "Jasal",
        "address": "Ward 2, Village Jasal",
        "tehsil": "Balotra",
        "district": "Barmer",
        "workArea": "Balotra Block",
        "bankName": "State Bank of India",
        "accountNumber": "11223344556",
        "ifscCode": "SBIN0001234",
        "nomineeName": "Sunita Devi",
        "nomineeMobile": "9876543211",
        "nomineeRelation": "Wife",
        "createdAt": "2026-06-21T18:35:24.452Z",
        "updatedAt": "2026-06-21T18:35:24.452Z",
        "deletedAt": null
      }
    },
    {
      "id": "b682f732-acd3-40cb-8281-c8195780fc51",
      "mobile": "8888888888",
      "passwordHash": "$2a$10…[REDACTED]",
      "name": "Default Agent",
      "email": "agent@purabiya.org",
      "role": "AGENT",
      "isActive": true,
      "createdAt": "2026-06-17T18:22:11.090Z",
      "updatedAt": "2026-06-25T19:27:29.128Z",
      "deletedAt": null,
      "agentProfile": {
        "id": "bf2983e4-5833-4b5b-af6c-9f19967e4aee",
        "userId": "b682f732-acd3-40cb-8281-c8195780fc51",
        "employeeId": "EMP001",
        "fatherName": "Mr. Agent Father",
        "gotra": "Prajapat",
        "age": 30,
        "gender": "Male",
        "village": "Jasal",
        "address": "Near Temple, Village Jasal",
        "tehsil": "Balotra",
        "district": "Balotra",
        "workArea": "Balotra Block",
        "bankName": "State Bank of India",
        "accountNumber": "12345678901",
        "ifscCode": "SBIN0001234",
        "nomineeName": "Nominee Agent",
        "nomineeMobile": "9876543210",
        "nomineeRelation": "Wife",
        "createdAt": "2026-06-17T18:22:13.002Z",
        "updatedAt": "2026-06-17T18:22:13.002Z",
        "deletedAt": null
      }
    }
  ]
}
```

### addAgent — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addAgent` |
| HTTP Status | 200 |
| Duration | 8482ms |
| Message | Agent created successfully |
| Skip write test | yes |

**Request body**

```json
{
  "name": "Audit Agent",
  "fatherName": "Test Father",
  "gender": "Male",
  "mobile": "9000904056",
  "password": "[REDACTED]",
  "gotra": "Prajapat",
  "village": "Jasal",
  "address": "Test",
  "tehsil": "Balotra",
  "district": "Barmer",
  "workArea": "Balotra",
  "bankName": "SBI",
  "accountNumber": "123",
  "ifsc": "SBIN0001234",
  "nomineeName": "Nominee",
  "nomineeMobile": "9999999998",
  "nomineeRelation": "Wife",
  "age": "30"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Agent created successfully",
  "data": {
    "id": "da77ea81-8e39-42d9-875b-34cb0d4a2673",
    "mobile": "9000904056",
    "name": "Audit Agent",
    "email": null,
    "role": "AGENT",
    "isActive": true,
    "createdAt": "2026-06-28T16:08:26.059Z",
    "updatedAt": "2026-06-28T16:08:26.059Z",
    "deletedAt": null
  }
}
```

### editAgent — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editAgent` |
| HTTP Status | 200 |
| Duration | 2296ms |
| Message | Agent updated successfully |
| Skip write test | yes |

**Request body**

```json
{
  "id": "895b88d7-589f-420d-bbe1-ab235707e4aa"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Agent updated successfully",
  "data": {
    "id": "895b88d7-589f-420d-bbe1-ab235707e4aa",
    "mobile": "9000198141",
    "name": "Audit Agent",
    "email": null,
    "role": "AGENT",
    "isActive": true,
    "createdAt": "2026-06-25T19:36:39.273Z",
    "updatedAt": "2026-06-28T16:08:33.674Z",
    "deletedAt": null
  }
}
```

### deleteAgent — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteAgent` |
| HTTP Status | 200 |
| Duration | 3213ms |
| Message | Agent deleted successfully |
| Skip write test | yes |

**Request body**

```json
{
  "id": "895b88d7-589f-420d-bbe1-ab235707e4aa"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Agent deleted successfully",
  "data": {
    "id": "895b88d7-589f-420d-bbe1-ab235707e4aa",
    "name": "Audit Agent",
    "deletedAt": "2026-06-28T16:08:36.815Z"
  }
}
```

### getAgentPermissions — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getAgentPermissions` |
| HTTP Status | 200 |
| Duration | 917ms |
| Message | Agent not found |
| Skip write test | no |

**Request body**

```json
{
  "agent_id": "895b88d7-589f-420d-bbe1-ab235707e4aa"
}
```

**Response**

```json
{
  "error": true,
  "message": "Agent not found"
}
```

### setAgentPermissions — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=setAgentPermissions` |
| HTTP Status | 200 |
| Duration | 1136ms |
| Message | Agent not found |
| Skip write test | yes |

**Request body**

```json
{
  "agent_id": "895b88d7-589f-420d-bbe1-ab235707e4aa",
  "permissions": []
}
```

**Response**

```json
{
  "error": true,
  "message": "Agent not found"
}
```

### getAllBulkData — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getAllBulkData` |
| HTTP Status | 200 |
| Duration | 397ms |
| Message | Agent not found |
| Skip write test | no |

**Request body**

```json
{
  "addedby_id": "895b88d7-589f-420d-bbe1-ab235707e4aa",
  "startDate": "2024-01-01",
  "endDate": "2026-12-31"
}
```

**Response**

```json
{
  "error": true,
  "message": "Agent not found"
}
```

### addAgentPaymentForDetails — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addAgentPaymentForDetails` |
| HTTP Status | 200 |
| Duration | 400ms |
| Message | Agent not found |
| Skip write test | yes |

**Request body**

```json
{
  "agentId": "895b88d7-589f-420d-bbe1-ab235707e4aa",
  "amount": "1",
  "startDate": "2024-01-01",
  "endDate": "2026-12-31"
}
```

**Response**

```json
{
  "error": true,
  "message": "Agent not found"
}
```

### getAgentPaymentsForDetails — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getAgentPaymentsForDetails` |
| HTTP Status | 200 |
| Duration | 425ms |
| Message | Agent not found |
| Skip write test | no |

**Request body**

```json
{
  "agentId": "895b88d7-589f-420d-bbe1-ab235707e4aa"
}
```

**Response**

```json
{
  "error": true,
  "message": "Agent not found"
}
```

### createApplication — FAIL

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=createApplication` |
| HTTP Status | 200 |
| Duration | 30ms |
| Message | totalAmount is required |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "totalAmount is required"
}
```

### getApplications — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getApplications` |
| HTTP Status | 200 |
| Duration | 1831ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": [
    {
      "id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
      "srNo": 10,
      "formNumber": "GEN-1010",
      "applicationDate": "2007-02-01T00:00:00.000Z",
      "applicantName": "hello",
      "fatherName": "hell011",
      "motherName": "helly",
      "dateOfBirth": "1999-06-02T00:00:00.000Z",
      "aadharNumber": "252550503030",
      "gotra": "aaa",
      "mobile": "9995999999",
      "address": "blt",
      "pinCode": "344022",
      "tehsil": "jasol",
      "district": "balotara",
      "state": "rajasthan",
      "nomineeName": "suresh",
      "nomineeRelation": "test",
      "affidavitUrl": null,
      "passportPhotoUrl": "/uploads/passportPhoto-1782646855838-298589469.png",
      "gender": "Female",
      "category": "C",
      "totalAmount": "9000",
      "pendingAmount": "4000",
      "isActive": true,
      "addedById": "b682f732-acd3-40cb-8281-c8195780fc51",
      "createdAt": "2026-06-28T11:40:57.003Z",
      "updatedAt": "2026-06-28T11:40:57.003Z",
      "deletedAt": null,
      "addedBy": {
        "id": "b682f732-acd3-40cb-8281-c8195780fc51",
        "name": "Default Agent",
        "mobile": "8888888888"
      },
      "form_number": "GEN-1010",
      "application_date": "2007-02-01T00:00:00.000Z",
      "applicant_name": "hello",
      "father_name": "hell011",
      "mother_name": "helly",
      "date_of_birth": "1999-06-02T00:00:00.000Z",
      "aadhar_number": "252550503030",
      "pin_code": "344022",
      "nominee_name": "suresh",
      "nominee_relation": "test",
      "passport_photo": "/uploads/passportPhoto-1782646855838-298589469.png",
      "passportPhoto": "/uploads/passportPhoto-1782646855838-298589469.png",
      "age": "27",
      "is_active": 1,
      "added_name": "Default Agent",
      "added_mobile": "8888888888",
      "workerName": "Default Agent",
      "workerMobile": "8888888888",
      "addedby_id": "b682f732-acd3-40cb-8281-c8195780fc51"
    },
    {
      "id": "842c5bec-3c87-4654-8dbe-44a438bd55a8",
      "srNo": 9,
      "formNumber": "GEN-1009",
      "applicationDate": "2026-06-26T00:00:00.000Z",
      "applicantName": "suresh",
      "fatherName": "parasmal",
      "motherName": "sumitra devi",
      "dateOfBirth": "1996-06-26T00:00:00.000Z",
      "aadharNumber": "123112311231",
      "gotra": "suthar",
      "mobile": "9950730637",
      "address": "balotra",
      "pinCode": "344022",
      "tehsil": "pachpadra",
      "district": "balotara",
      "state": "rajasthan",
      "nomineeName": "Ashok",
      "nomineeRelation": "mama",
      "affidavitUrl": "hhiii",
      "passportPhotoUrl": "/uploads/passportPhoto-1782505689468-250387704.jpg",
      "gender": "Male",
      "category": "C",
      "totalAmount": "9000",
      "pendingAmount": "0",
      "isActive": true,
      "addedById": "b682f732-acd3-40cb-8281-c8195780fc51",
      "createdAt": "2026-06-26T20:28:10.121Z",
      "updatedAt": "2026-06-26T20:28:10.121Z",
      "deletedAt": null,
      "addedBy": {
        "id": "b682f732-acd3-40cb-8281-c8195780fc51",
        "name": "Default Agent",
        "mobile": "8888888888"
      },
      "form_number": "GEN-1009",
      "application_date": "2026-06-26T00:00:00.000Z",
      "applicant_name": "suresh",
      "father_name": "parasmal",
      "mother_name": "sumitra devi",
      "date_of_birth": "1996-06-26T00:00:00.000Z",
      "aadhar_number": "123112311231",
      "pin_code": "344022",
      "nominee_name": "Ashok",
      "nominee_relation": "mama",
      "passport_photo": "/uploads/passportPhoto-1782505689468-250387704.jpg",
      "passportPhoto": "/uploads/passportPhoto-1782505689468-250387704.jpg",
      "affidavit": "hhiii",
      "age": "30",
      "is_active": 1,
      "added_name": "Default Agent",
      "added_mobile": "8888888888",
      "workerName": "Default Agent",
      "workerMobile": "8888888888",
      "addedby_id": "b682f732-acd3-40cb-8281-c8195780fc51"
    },
    {
      "id": "c301bb59-7b4a-43b6-a76b-d2f6c1100149",
      "srNo": 8,
      "formNumber": "GEN-1008",
      "applicationDate": "2026-06-21T00:00:00.000Z",
      "applicantName": "API Test 003759",
      "fatherName": "Test Father",
      "motherName": "Test Mother",
      "dateOfBirth": "2000-03-15T00:00:00.000Z",
      "aadharNumber": "123400375956",
      "gotra": "Prajapat",
      "mobile": "9003759123",
      "address": "Test Village",
      "pinCode": "344001",
      "tehsil": "Balotra",
      "district": "Barmer",
      "state": "Rajasthan",
      "nomineeName": "Nominee",
      "nomineeRelation": "Brother",
      "affidavitUrl": null,
      "passportPhotoUrl": null,
      "gender": "Male",
      "category": "C",
      "totalAmount": "9000",
      "pendingAmount": "8000",
      "isActive": true,
      "addedById": "895b88d7-589f-420d-bbe1-ab235707e4aa",
      "createdAt": "2026-06-26T19:08:00.860Z",
      "updatedAt": "2026-06-26T19:08:00.860Z",
      "deletedAt": null,
      "addedBy": {
        "id": "895b88d7-589f-420d-bbe1-ab235707e4aa",
        "name": "Audit Agent",
        "mobile": "9000198141"
      },
      "form_number": "GEN-1008",
      "application_date": "2026-06-21T00:00:00.000Z",
      "applicant_name": "API Test 003759",
      "father_name": "Test Father",
      "mother_name": "Test Mother",
      "date_of_birth": "2000-03-15T00:00:00.000Z",
      "aadhar_number": "123400375956",
      "pin_code": "344001",
      "nominee_name": "Nominee",
      "nominee_relation": "Brother",
      "age": "26",
      "is_active": 1,
      "added_name": "Audit Agent",
      "added_mobile": "9000198141",
      "workerName": "Audit Agent",
      "workerMobile": "9000198141",
      "addedby_id": "895b88d7-589f-420d-bbe1-ab235707e4aa"
    },
    {
      "id": "0c8e5767-44d1-43ef-8663-433892b597c9",
      "srNo": 7,
      "formNumber": "GEN-1007",
      "applicationDate": "2026-06-01T00:00:00.000Z",
      "applicantName": "Dinesh",
      "fatherName": "Paras mal",
      "motherName": "sumitra",
      "dateOfBirth": "1987-06-10T00:00:00.000Z",
      "aadharNumber": "741085209630",
      "gotra": "jangid",
      "mobile": "8974563210",
      "address": "blt",
      "pinCode": "344022",
      "tehsil": "jdp",
      "district": "balotara",
      "state": "newRaj",
      "nomineeName": "tets1",
      "nomineeRelation": "test2",
      "affidavitUrl": "test ",
      "passportPhotoUrl": "/uploads/passportPhoto-1782506076308-908049391.jpg",
      "gender": "Male",
      "category": "C",
      "totalAmount": "9000",
      "pendingAmount": "9000",
      "isActive": true,
      "addedById": "b682f732-acd3-40cb-8281-c8195780fc51",
      "createdAt": "2026-06-26T17:32:55.128Z",
      "updatedAt": "2026-06-26T20:34:36.804Z",
      "deletedAt": null,
      "addedBy": {
        "id": "b682f732-acd3-40cb-8281-c8195780fc51",
        "name": "Default Agent",
        "mobile": "8888888888"
      },
      "form_number": "GEN-1007",
      "application_date": "2026-06-01T00:00:00.000Z",
      "applicant_name": "Dinesh",
      "father_name": "Paras mal",
      "mother_name": "sumitra",
      "date_of_birth": "1987-06-10T00:00:00.000Z",
      "aadhar_number": "741085209630",
      "pin_code": "344022",
      "nominee_name": "tets1",
      "nominee_relation": "test2",
      "passport_photo": "/uploads/passportPhoto-1782506076308-908049391.jpg",
      "passportPhoto": "/uploads/passportPhoto-1782506076308-908049391.jpg",
      "affidavit": "test ",
      "age": "39",
      "is_active": 1,
      "added_name": "Default Agent",
      "added_mobile": "8888888888",
      "workerName": "Default Agent",
      "workerMobile": "8888888888",
      "addedby_id": "b682f732-acd3-40cb-8281-c8195780fc51"
    },
    {
      "id": "638cfb80-44ca-42fd-a776-bc9c2cdeccfb",
      "srNo": 6,
      "formNumber": "GEN-1006",
      "applicationDate": "2026-06-26T00:00:00.000Z",
      "applicantName": "Test Applicant",
      "fatherName": "Test Father",
      "motherName": "Test Mother",
      "dateOfBirth": "2000-01-01T00:00:00.000Z",
      "aadharNumber": "123456789012",
      "gotra": "Prajapat",
      "mobile": "9876543210",
      "address": "Test Address",
      "pinCode": "344001",
      "tehsil": "Balotra",
      "district": "Barmer",
      "state": "Rajasthan",
      "nomineeName": "test",
      "nomineeRelation": "test",
      "affidavitUrl": null,
      "passportPhotoUrl": "/uploads/passportPhoto-1782498422586-346774183.jpg",
      "gender": "Male",
      "category": "C",
      "totalAmount": "5000",
      "pendingAmount": "4000",
      "isActive": true,
      "addedById": "895b88d7-589f-420d-bbe1-ab235707e4aa",
      "createdAt": "2026-06-26T17:32:13.889Z",
      "updatedAt": "2026-06-26T18:27:02.876Z",
      "deletedAt": null,
      "addedBy": {
        "id": "895b88d7-589f-420d-bbe1-ab235707e4aa",
        "name": "Audit Agent",
        "mobile": "9000198141"
      },
      "form_number": "GEN-1006",
      "application_date": "2026-06-26T00:00:00.000Z",
      "applicant_name": "Test Applicant",
      "father_name": "Test Father",
      "mother_name": "Test Mother",
      "date_of_birth": "2000-01-01T00:00:00.000Z",
      "aadhar_number": "123456789012",
      "pin_code": "344001",
      "nominee_name": "test",
      "nominee_relation": "test",
      "passport_photo": "/uploads/passportPhoto-1782498422586-346774183.jpg",
      "passportPhoto": "/uploads/passportPhoto-1782498422586-346774183.jpg",
      "age": "26",
      "is_active": 1,
      "added_name": "Audit Agent",
      "added_mobile": "9000198141",
      "workerName": "Audit Agent",
      "workerMobile": "9000198141",
      "addedby_id": "895b88d7-589f-420d-bbe1-ab235707e4aa"
    }
  ]
}
```

### updateApplication — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateApplication` |
| HTTP Status | 200 |
| Duration | 1605ms |
| Message | Application updated successfully |
| Skip write test | yes |

**Request body**

```json
{
  "id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Application updated successfully",
  "data": {
    "id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
    "srNo": 10,
    "formNumber": "GEN-1010",
    "applicationDate": "2007-02-01T00:00:00.000Z",
    "applicantName": "hello",
    "fatherName": "hell011",
    "motherName": "helly",
    "dateOfBirth": "1999-06-02T00:00:00.000Z",
    "aadharNumber": "252550503030",
    "gotra": "aaa",
    "mobile": "9995999999",
    "address": "blt",
    "pinCode": "344022",
    "tehsil": "jasol",
    "district": "balotara",
    "state": "rajasthan",
    "nomineeName": "suresh",
    "nomineeRelation": "test",
    "affidavitUrl": null,
    "passportPhotoUrl": "/uploads/passportPhoto-1782646855838-298589469.png",
    "gender": "Female",
    "category": "C",
    "totalAmount": "9000",
    "pendingAmount": "4000",
    "isActive": true,
    "addedById": "b682f732-acd3-40cb-8281-c8195780fc51",
    "createdAt": "2026-06-28T11:40:57.003Z",
    "updatedAt": "2026-06-28T16:08:43.961Z",
    "deletedAt": null
  }
}
```

### deleteApplication — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteApplication` |
| HTTP Status | 200 |
| Duration | 1192ms |
| Message | Application deleted successfully |
| Skip write test | yes |

**Request body**

```json
{
  "id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Application deleted successfully",
  "data": {
    "id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
    "srNo": 10,
    "formNumber": "GEN-1010",
    "applicationDate": "2007-02-01T00:00:00.000Z",
    "applicantName": "hello",
    "fatherName": "hell011",
    "motherName": "helly",
    "dateOfBirth": "1999-06-02T00:00:00.000Z",
    "aadharNumber": "252550503030",
    "gotra": "aaa",
    "mobile": "9995999999",
    "address": "blt",
    "pinCode": "344022",
    "tehsil": "jasol",
    "district": "balotara",
    "state": "rajasthan",
    "nomineeName": "suresh",
    "nomineeRelation": "test",
    "affidavitUrl": null,
    "passportPhotoUrl": "/uploads/passportPhoto-1782646855838-298589469.png",
    "gender": "Female",
    "category": "C",
    "totalAmount": "9000",
    "pendingAmount": "4000",
    "isActive": false,
    "addedById": "b682f732-acd3-40cb-8281-c8195780fc51",
    "createdAt": "2026-06-28T11:40:57.003Z",
    "updatedAt": "2026-06-28T16:08:45.200Z",
    "deletedAt": "2026-06-28T16:08:45.197Z"
  }
}
```

### updateApplicationActiveStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateApplicationActiveStatus` |
| HTTP Status | 200 |
| Duration | 906ms |
| Message | Status updated successfully |
| Skip write test | yes |

**Request body**

```json
{
  "id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
  "is_active": "1"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Status updated successfully",
  "data": {
    "id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
    "srNo": 10,
    "formNumber": "GEN-1010",
    "applicationDate": "2007-02-01T00:00:00.000Z",
    "applicantName": "hello",
    "fatherName": "hell011",
    "motherName": "helly",
    "dateOfBirth": "1999-06-02T00:00:00.000Z",
    "aadharNumber": "252550503030",
    "gotra": "aaa",
    "mobile": "9995999999",
    "address": "blt",
    "pinCode": "344022",
    "tehsil": "jasol",
    "district": "balotara",
    "state": "rajasthan",
    "nomineeName": "suresh",
    "nomineeRelation": "test",
    "affidavitUrl": null,
    "passportPhotoUrl": "/uploads/passportPhoto-1782646855838-298589469.png",
    "gender": "Female",
    "category": "C",
    "totalAmount": "9000",
    "pendingAmount": "4000",
    "isActive": true,
    "addedById": "b682f732-acd3-40cb-8281-c8195780fc51",
    "createdAt": "2026-06-28T11:40:57.003Z",
    "updatedAt": "2026-06-28T16:08:45.993Z",
    "deletedAt": "2026-06-28T16:08:45.197Z"
  }
}
```

### getApplicationInstallments — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getApplicationInstallments` |
| HTTP Status | 200 |
| Duration | 883ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "application_id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": [
    {
      "id": "99316bf9-bd37-407e-8709-e45bc163ec67",
      "applicationId": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
      "amount": "5000",
      "date": "2026-06-02T00:00:00.000Z",
      "note": "Registration Initial Payment",
      "paymentMode": "CASH",
      "addedById": "91bca7b6-c3db-43ea-ae7f-332e977bc639",
      "createdAt": "2026-06-28T11:40:57.162Z",
      "updatedAt": "2026-06-28T11:40:57.162Z",
      "deletedAt": null
    }
  ]
}
```

### addApplicationInstallment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addApplicationInstallment` |
| HTTP Status | 200 |
| Duration | 408ms |
| Message | General Application not found |
| Skip write test | yes |

**Request body**

```json
{
  "application_id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
  "amount": "1",
  "date": "2024-01-01"
}
```

**Response**

```json
{
  "error": true,
  "message": "General Application not found"
}
```

### getPreviousApplicationsMembers — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getPreviousApplicationsMembers` |
| HTTP Status | 200 |
| Duration | 3555ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "id": "7a7864f9-3def-4daf-b63d-4a377388ab4e"
}
```

**Response**

```json
{
  "status": true,
  "categories": {
    "A": {
      "members": []
    },
    "B": {
      "members": []
    },
    "C": {
      "members": [
        {
          "id": "638cfb80-44ca-42fd-a776-bc9c2cdeccfb",
          "applicantName": "Test Applicant",
          "formNumber": "GEN-1006",
          "category": "C",
          "payment_status": 0
        },
        {
          "id": "c301bb59-7b4a-43b6-a76b-d2f6c1100149",
          "applicantName": "API Test 003759",
          "formNumber": "GEN-1008",
          "category": "C",
          "payment_status": 0
        },
        {
          "id": "842c5bec-3c87-4654-8dbe-44a438bd55a8",
          "applicantName": "suresh",
          "formNumber": "GEN-1009",
          "category": "C",
          "payment_status": 0
        },
        {
          "id": "0c8e5767-44d1-43ef-8663-433892b597c9",
          "applicantName": "Dinesh",
          "formNumber": "GEN-1007",
          "category": "C",
          "payment_status": 0
        }
      ]
    }
  }
}
```

### createInsuranceApplication — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=createInsuranceApplication` |
| HTTP Status | 200 |
| Duration | 1862ms |
| Message | Record not found or invalid request data |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found or invalid request data"
}
```

### getInsuranceApplication — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getInsuranceApplication` |
| HTTP Status | 200 |
| Duration | 1342ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### editInsuranceApplication — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editInsuranceApplication` |
| HTTP Status | 200 |
| Duration | 791ms |
| Message | Insurance Application not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Insurance Application not found"
}
```

### deleteInsuranceApplication — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteInsuranceApplication` |
| HTTP Status | 200 |
| Duration | 394ms |
| Message | Insurance Application not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Insurance Application not found"
}
```

### updateInsuranceApplicationActiveStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateInsuranceApplicationActiveStatus` |
| HTTP Status | 200 |
| Duration | 770ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "is_active": "1"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### getApplicationInsuranceInstallments — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getApplicationInsuranceInstallments` |
| HTTP Status | 200 |
| Duration | 767ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "application_insurance_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### addApplicationInsuranceInstallment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addApplicationInsuranceInstallment` |
| HTTP Status | 200 |
| Duration | 370ms |
| Message | Insurance Application not found |
| Skip write test | yes |

**Request body**

```json
{
  "application_insurance_id": "00000000-0000-0000-0000-000000000001",
  "amount": "1",
  "date": "2024-01-01"
}
```

**Response**

```json
{
  "error": true,
  "message": "Insurance Application not found"
}
```

### addLoanApplication — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addLoanApplication` |
| HTTP Status | 200 |
| Duration | 28ms |
| Message | Record not found or invalid request data |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found or invalid request data"
}
```

### getLoanApplications — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getLoanApplications` |
| HTTP Status | 200 |
| Duration | 847ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### editLoanApplication — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editLoanApplication` |
| HTTP Status | 200 |
| Duration | 782ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### deleteLoanApplication — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteLoanApplication` |
| HTTP Status | 200 |
| Duration | 805ms |
| Message | Loan application not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Loan application not found"
}
```

### getLoanApplicationInstallments — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getLoanApplicationInstallments` |
| HTTP Status | 200 |
| Duration | 789ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "loan_application_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### addLoanApplicationInstallment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addLoanApplicationInstallment` |
| HTTP Status | 200 |
| Duration | 411ms |
| Message | Loan application not found |
| Skip write test | yes |

**Request body**

```json
{
  "loan_application_id": "00000000-0000-0000-0000-000000000001",
  "amount": "1",
  "date": "2024-01-01",
  "type": "User Repayment"
}
```

**Response**

```json
{
  "error": true,
  "message": "Loan application not found"
}
```

### addFinancialHelp — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addFinancialHelp` |
| HTTP Status | 200 |
| Duration | 10ms |
| Message | Record not found or invalid request data |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found or invalid request data"
}
```

### getFinancialHelps — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getFinancialHelps` |
| HTTP Status | 200 |
| Duration | 746ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### editFinancialHelp — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editFinancialHelp` |
| HTTP Status | 200 |
| Duration | 833ms |
| Message | Financial help record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Financial help record not found"
}
```

### deleteFinancialHelp — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteFinancialHelp` |
| HTTP Status | 200 |
| Duration | 879ms |
| Message | Financial help record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Financial help record not found"
}
```

### getFinancialHelpInstallments — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getFinancialHelpInstallments` |
| HTTP Status | 200 |
| Duration | 768ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "financial_help_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### addFinancialHelpInstallment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addFinancialHelpInstallment` |
| HTTP Status | 200 |
| Duration | 447ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "financial_help_id": "00000000-0000-0000-0000-000000000001",
  "amount": "1",
  "date": "2024-01-01"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### addDisabilityCycle — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addDisabilityCycle` |
| HTTP Status | 200 |
| Duration | 12ms |
| Message | Record not found or invalid request data |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found or invalid request data"
}
```

### getDisabilityCycles — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getDisabilityCycles` |
| HTTP Status | 200 |
| Duration | 804ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### editDisabilityCycle — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editDisabilityCycle` |
| HTTP Status | 200 |
| Duration | 777ms |
| Message | Disability cycle not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Disability cycle not found"
}
```

### deleteDisabilityCycle — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteDisabilityCycle` |
| HTTP Status | 200 |
| Duration | 863ms |
| Message | Disability cycle not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Disability cycle not found"
}
```

### addMarriageCongrats — FAIL

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addMarriageCongrats` |
| HTTP Status | 200 |
| Duration | 2356ms |
| Message | date is required |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "date is required"
}
```

### getMarriageCongrats — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getMarriageCongrats` |
| HTTP Status | 200 |
| Duration | 1740ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": [
    {
      "id": "7a7864f9-3def-4daf-b63d-4a377388ab4e",
      "date": "2026-06-26T00:00:00.000Z",
      "codeNumber": "GEN-1009",
      "marriageNumber": "PM-35135",
      "applicantName": "suresh",
      "fatherName": "parasmal",
      "wifeOf": null,
      "gotra": "suthar",
      "address": "balotra",
      "membershipJoinDate": "2026-06-26T00:00:00.000Z",
      "associatedUntil": "0 दिन",
      "permanentFee": "9000",
      "installmentAmount": "9000",
      "totalGrantAmount": "18000",
      "totalMembersServing": 4,
      "rate100": "0",
      "rate200": "0",
      "rate300": "4",
      "deductionPercent": "20",
      "deductedAmount": "240",
      "totalPaidAmount": "960",
      "gender": "Male",
      "addedById": "91bca7b6-c3db-43ea-ae7f-332e977bc639",
      "createdAt": "2026-06-26T20:41:40.587Z",
      "updatedAt": "2026-06-26T20:41:40.587Z",
      "deletedAt": null,
      "addedBy": {
        "id": "91bca7b6-c3db-43ea-ae7f-332e977bc639",
        "name": "Super Admin"
      }
    },
    {
      "id": "51665d5a-baf4-4cfb-95fd-d0c5c4a56711",
      "date": "2026-06-25T00:00:00.000Z",
      "codeNumber": "GEN-1006",
      "marriageNumber": "PM-44599",
      "applicantName": "Test Applicant",
      "fatherName": "Test Father",
      "wifeOf": null,
      "gotra": "Prajapat",
      "address": "Test Address",
      "membershipJoinDate": "2026-06-26T00:00:00.000Z",
      "associatedUntil": "—",
      "permanentFee": "5000",
      "installmentAmount": "1000",
      "totalGrantAmount": "6000",
      "totalMembersServing": 1,
      "rate100": "0",
      "rate200": "0",
      "rate300": "1",
      "deductionPercent": "20",
      "deductedAmount": "60",
      "totalPaidAmount": "240",
      "gender": "Male",
      "addedById": "91bca7b6-c3db-43ea-ae7f-332e977bc639",
      "createdAt": "2026-06-26T18:38:08.896Z",
      "updatedAt": "2026-06-26T18:38:08.896Z",
      "deletedAt": null,
      "addedBy": {
        "id": "91bca7b6-c3db-43ea-ae7f-332e977bc639",
        "name": "Super Admin"
      }
    }
  ]
}
```

### getMarriageCongratulations — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMarriageCongratulations` |
| HTTP Status | 200 |
| Duration | 2256ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "application_id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": {
    "id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
    "applicantName": "hello",
    "fatherName": "hell011",
    "gotra": "aaa",
    "address": "blt",
    "applicationDate": "2007-02-01T00:00:00.000Z",
    "gender": "Female",
    "totalAmount": "9000"
  },
  "counts": [
    {
      "category": "A",
      "total": 0
    },
    {
      "category": "B",
      "total": 0
    },
    {
      "category": "C",
      "total": 4
    }
  ],
  "totalEMI": 5000
}
```

### editMarriageCongrats — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editMarriageCongrats` |
| HTTP Status | 200 |
| Duration | 816ms |
| Message | Marriage congratulations updated successfully |
| Skip write test | yes |

**Request body**

```json
{
  "id": "7a7864f9-3def-4daf-b63d-4a377388ab4e"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Marriage congratulations updated successfully",
  "data": {
    "id": "7a7864f9-3def-4daf-b63d-4a377388ab4e",
    "date": "2026-06-26T00:00:00.000Z",
    "codeNumber": "GEN-1009",
    "marriageNumber": "PM-35135",
    "applicantName": "suresh",
    "fatherName": "parasmal",
    "wifeOf": null,
    "gotra": "suthar",
    "address": "balotra",
    "membershipJoinDate": "2026-06-26T00:00:00.000Z",
    "associatedUntil": "0 दिन",
    "permanentFee": "0",
    "installmentAmount": "0",
    "totalGrantAmount": "0",
    "totalMembersServing": 0,
    "rate100": "0",
    "rate200": "0",
    "rate300": "0",
    "deductionPercent": "0",
    "deductedAmount": "0",
    "totalPaidAmount": "0",
    "gender": "Male",
    "addedById": "91bca7b6-c3db-43ea-ae7f-332e977bc639",
    "createdAt": "2026-06-26T20:41:40.587Z",
    "updatedAt": "2026-06-28T16:09:14.205Z",
    "deletedAt": null
  }
}
```

### deleteMarriageCongrats — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteMarriageCongrats` |
| HTTP Status | 200 |
| Duration | 1576ms |
| Message | Marriage congratulations deleted successfully |
| Skip write test | yes |

**Request body**

```json
{
  "id": "7a7864f9-3def-4daf-b63d-4a377388ab4e"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "Marriage congratulations deleted successfully",
  "data": {
    "id": "7a7864f9-3def-4daf-b63d-4a377388ab4e",
    "date": "2026-06-26T00:00:00.000Z",
    "codeNumber": "GEN-1009",
    "marriageNumber": "PM-35135",
    "applicantName": "suresh",
    "fatherName": "parasmal",
    "wifeOf": null,
    "gotra": "suthar",
    "address": "balotra",
    "membershipJoinDate": "2026-06-26T00:00:00.000Z",
    "associatedUntil": "0 दिन",
    "permanentFee": "0",
    "installmentAmount": "0",
    "totalGrantAmount": "0",
    "totalMembersServing": 0,
    "rate100": "0",
    "rate200": "0",
    "rate300": "0",
    "deductionPercent": "0",
    "deductedAmount": "0",
    "totalPaidAmount": "0",
    "gender": "Male",
    "addedById": "91bca7b6-c3db-43ea-ae7f-332e977bc639",
    "createdAt": "2026-06-26T20:41:40.587Z",
    "updatedAt": "2026-06-28T16:09:15.840Z",
    "deletedAt": "2026-06-28T16:09:15.838Z"
  }
}
```

### getMarriageCongratulationsPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMarriageCongratulationsPayment` |
| HTTP Status | 200 |
| Duration | 1510ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "marriage_congratulations_id": "7a7864f9-3def-4daf-b63d-4a377388ab4e"
}
```

**Response**

```json
{
  "status": true,
  "data": []
}
```

### createMarriageCongratulationsPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=createMarriageCongratulationsPayment` |
| HTTP Status | 200 |
| Duration | 772ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "marriage_congratulations_id": "7a7864f9-3def-4daf-b63d-4a377388ab4e",
  "application_id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
  "amount": "1",
  "category": "A"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### getMarriageDetailsByNumber — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMarriageDetailsByNumber` |
| HTTP Status | 200 |
| Duration | 746ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "marriageNumber": "1"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": null
}
```

### addMarriageSewing — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addMarriageSewing` |
| HTTP Status | 200 |
| Duration | 371ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### getMarriageSewing — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getMarriageSewing` |
| HTTP Status | 200 |
| Duration | 769ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### editMarriageSewing — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editMarriageSewing` |
| HTTP Status | 200 |
| Duration | 784ms |
| Message | Sewing machine application not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Sewing machine application not found"
}
```

### deleteMarriageSewing — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteMarriageSewing` |
| HTTP Status | 200 |
| Duration | 958ms |
| Message | Sewing machine application not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Sewing machine application not found"
}
```

### createmayra_Application — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=createmayra_Application` |
| HTTP Status | 200 |
| Duration | 1626ms |
| Message | Record not found or invalid request data |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found or invalid request data"
}
```

### getmayra_application — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getmayra_application` |
| HTTP Status | 200 |
| Duration | 746ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### updatemayra_Application — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updatemayra_Application` |
| HTTP Status | 200 |
| Duration | 1137ms |
| Message | Mayra Registration not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Mayra Registration not found"
}
```

### deletemayra_Application — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deletemayra_Application` |
| HTTP Status | 200 |
| Duration | 373ms |
| Message | Mayra Registration not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Mayra Registration not found"
}
```

### updateMayraApplicationActiveStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateMayraApplicationActiveStatus` |
| HTTP Status | 200 |
| Duration | 816ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "is_active": "1"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### addMayraCongrats — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addMayraCongrats` |
| HTTP Status | 200 |
| Duration | 823ms |
| Message | Mayra Registration not found |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Mayra Registration not found"
}
```

### getMayraCongrats — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getMayraCongrats` |
| HTTP Status | 200 |
| Duration | 812ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### editMayraCongrats — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editMayraCongrats` |
| HTTP Status | 200 |
| Duration | 1153ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### deleteMayraCongrats — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteMayraCongrats` |
| HTTP Status | 200 |
| Duration | 851ms |
| Message | Mayra congratulations not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Mayra congratulations not found"
}
```

### updateMayraCongratulationsStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateMayraCongratulationsStatus` |
| HTTP Status | 200 |
| Duration | 770ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "payment_status": "1"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### getMayraCongratulations — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMayraCongratulations` |
| HTTP Status | 200 |
| Duration | 1562ms |
| Message | Mayra registration or congratulations record not found |
| Skip write test | no |

**Request body**

```json
{
  "mayra_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "status": false,
  "error": true,
  "message": "Mayra registration or congratulations record not found"
}
```

### addMayraInstallment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addMayraInstallment` |
| HTTP Status | 200 |
| Duration | 408ms |
| Message | Mayra Registration not found |
| Skip write test | yes |

**Request body**

```json
{
  "mayra_id": "00000000-0000-0000-0000-000000000001",
  "amount": "1",
  "date": "2024-01-01"
}
```

**Response**

```json
{
  "error": true,
  "message": "Mayra Registration not found"
}
```

### getMayraInstallments — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMayraInstallments` |
| HTTP Status | 200 |
| Duration | 809ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "mayra_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### updateMayraInstallment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateMayraInstallment` |
| HTTP Status | 200 |
| Duration | 758ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "mayra_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### deleteMayraInstallment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteMayraInstallment` |
| HTTP Status | 200 |
| Duration | 919ms |
| Message | Installment not found |
| Skip write test | yes |

**Request body**

```json
{
  "mayra_id": "00000000-0000-0000-0000-000000000001",
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Installment not found"
}
```

### getMayraCongratulationsPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMayraCongratulationsPayment` |
| HTTP Status | 200 |
| Duration | 754ms |
| Message | Mayra Congratulations record not found |
| Skip write test | no |

**Request body**

```json
{
  "mayra_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": [],
  "message": "Mayra Congratulations record not found"
}
```

### createMayraCongratulationsPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=createMayraCongratulationsPayment` |
| HTTP Status | 200 |
| Duration | 821ms |
| Message | Mayra Congratulations record not found |
| Skip write test | yes |

**Request body**

```json
{
  "mayra_congratulations_id": "00000000-0000-0000-0000-000000000001",
  "mayra_id": "00000000-0000-0000-0000-000000000001",
  "application_id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
  "amount": "1",
  "category": "100"
}
```

**Response**

```json
{
  "error": true,
  "message": "Mayra Congratulations record not found"
}
```

### deleteMayraCongratulationsPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteMayraCongratulationsPayment` |
| HTTP Status | 200 |
| Duration | 753ms |
| Message | Payment record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Payment record not found"
}
```

### updateMayraCongratulationsPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateMayraCongratulationsPayment` |
| HTTP Status | 200 |
| Duration | 777ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### getMayraDetailsByNumber — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMayraDetailsByNumber` |
| HTTP Status | 200 |
| Duration | 756ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "mayraNumber": "1"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": null
}
```

### getMayraBeforeDate — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMayraBeforeDate` |
| HTTP Status | 200 |
| Duration | 389ms |
| Message | Mayra Registration not found |
| Skip write test | no |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Mayra Registration not found"
}
```

### updateMayraStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateMayraStatus` |
| HTTP Status | 200 |
| Duration | 1181ms |
| Message | Payer application not found |
| Skip write test | yes |

**Request body**

```json
{
  "mayra_id": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b",
  "data": []
}
```

**Response**

```json
{
  "error": true,
  "message": "Payer application not found"
}
```

### getMayraPreviousMembers — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMayraPreviousMembers` |
| HTTP Status | 200 |
| Duration | 457ms |
| Message | Mayra Congratulations record not found |
| Skip write test | no |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Mayra Congratulations record not found"
}
```

### getMayraBulkData — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMayraBulkData` |
| HTTP Status | 200 |
| Duration | 804ms |
| Message | No member found |
| Skip write test | no |

**Request body**

```json
{
  "userId": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b"
}
```

**Response**

```json
{
  "success": false,
  "status": false,
  "message": "No member found"
}
```

### getMayraUserData — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getMayraUserData` |
| HTTP Status | 200 |
| Duration | 5ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "userId": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### updateMayraPdfStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateMayraPdfStatus` |
| HTTP Status | 200 |
| Duration | 4ms |
| Message | PDF status updated |
| Skip write test | yes |

**Request body**

```json
{
  "ids": []
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "PDF status updated"
}
```

### getUserData — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getUserData` |
| HTTP Status | 200 |
| Duration | 452ms |
| Message | No member found |
| Skip write test | no |

**Request body**

```json
{
  "userId": "f06f6e1b-3b31-4c59-b1e7-5bcb3ac6699b"
}
```

**Response**

```json
{
  "success": false,
  "status": false,
  "message": "No member found"
}
```

### updatePaymentStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updatePaymentStatus` |
| HTTP Status | 200 |
| Duration | 5ms |
| Message | No payment updates requested |
| Skip write test | yes |

**Request body**

```json
{
  "data": []
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "marriages_updated": 0,
  "marriages_failed": 0,
  "details": [],
  "message": "No payment updates requested"
}
```

### updatePdfStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updatePdfStatus` |
| HTTP Status | 200 |
| Duration | 6ms |
| Message | PDF status updated |
| Skip write test | yes |

**Request body**

```json
{
  "ids": []
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "PDF status updated"
}
```

### addPensionYojana — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addPensionYojana` |
| HTTP Status | 200 |
| Duration | 11ms |
| Message | Record not found or invalid request data |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found or invalid request data"
}
```

### getPensionYojanas — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getPensionYojanas` |
| HTTP Status | 200 |
| Duration | 805ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### editPensionYojana — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editPensionYojana` |
| HTTP Status | 200 |
| Duration | 783ms |
| Message | Pension beneficiary not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Pension beneficiary not found"
}
```

### deletePensionYojana — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deletePensionYojana` |
| HTTP Status | 200 |
| Duration | 759ms |
| Message | Pension beneficiary not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Pension beneficiary not found"
}
```

### getPensionYojanaPayments — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getPensionYojanaPayments` |
| HTTP Status | 200 |
| Duration | 382ms |
| Message | Pension beneficiary not found |
| Skip write test | no |

**Request body**

```json
{
  "pension_yojana_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Pension beneficiary not found"
}
```

### addPensionYojanaPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addPensionYojanaPayment` |
| HTTP Status | 200 |
| Duration | 393ms |
| Message | Pension beneficiary not found |
| Skip write test | yes |

**Request body**

```json
{
  "pension_yojana_id": "00000000-0000-0000-0000-000000000001",
  "amount": "1",
  "date": "2024-01-01"
}
```

**Response**

```json
{
  "error": true,
  "message": "Pension beneficiary not found"
}
```

### addSewingCamp — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addSewingCamp` |
| HTTP Status | 200 |
| Duration | 20ms |
| Message | Record not found or invalid request data |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found or invalid request data"
}
```

### getSewingCamp — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getSewingCamp` |
| HTTP Status | 200 |
| Duration | 829ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### editSewingCamp — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editSewingCamp` |
| HTTP Status | 200 |
| Duration | 822ms |
| Message | Sewing machine camp application not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Sewing machine camp application not found"
}
```

### deleteSewingCamp — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteSewingCamp` |
| HTTP Status | 200 |
| Duration | 808ms |
| Message | Sewing machine camp application not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Sewing machine camp application not found"
}
```

### addSurakshaBima — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addSurakshaBima` |
| HTTP Status | 200 |
| Duration | 907ms |
| Message | Insurance Application not found |
| Skip write test | yes |

**Request body**

```json
{}
```

**Response**

```json
{
  "error": true,
  "message": "Insurance Application not found"
}
```

### getSurakshaBimaList — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getSurakshaBimaList` |
| HTTP Status | 200 |
| Duration | 853ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### getSurakshaBima — PASS

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:5000/api?apicall=getSurakshaBima&id=00000000-0000-0000-0000-000000000001` |
| HTTP Status | 200 |
| Duration | 852ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
null
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": null
}
```

### getSurakshaBimaData — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getSurakshaBimaData` |
| HTTP Status | 200 |
| Duration | 756ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "insuranceApplication_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": null
}
```

### editSurakshaBima — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editSurakshaBima` |
| HTTP Status | 200 |
| Duration | 807ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### deleteSurakshaBima — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deleteSurakshaBima` |
| HTTP Status | 200 |
| Duration | 392ms |
| Message | Suraksha Bima not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Suraksha Bima not found"
}
```

### getPreviousSurakshaBimaMembers — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getPreviousSurakshaBimaMembers` |
| HTTP Status | 200 |
| Duration | 1548ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### getSurakshaBimaPaymentById — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getSurakshaBimaPaymentById` |
| HTTP Status | 200 |
| Duration | 801ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{
  "application_insurance_id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": []
}
```

### createSurakshaBimaPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=createSurakshaBimaPayment` |
| HTTP Status | 200 |
| Duration | 1739ms |
| Message | Record not found or invalid request data |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "amount": "1"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found or invalid request data"
}
```

### getInsuranceBulkData — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getInsuranceBulkData` |
| HTTP Status | 200 |
| Duration | 815ms |
| Message | No member found |
| Skip write test | no |

**Request body**

```json
{
  "userId": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "success": false,
  "status": false,
  "message": "No member found"
}
```

### updateBimaPaymentStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateBimaPaymentStatus` |
| HTTP Status | 200 |
| Duration | 5ms |
| Message | No payment updates requested |
| Skip write test | yes |

**Request body**

```json
{
  "data": []
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "updated": 0,
  "failed": 0,
  "details": [],
  "message": "No payment updates requested"
}
```

### updateInsurancePdfStatus — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=updateInsurancePdfStatus` |
| HTTP Status | 200 |
| Duration | 7ms |
| Message | PDF status updated |
| Skip write test | yes |

**Request body**

```json
{
  "ids": []
}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "message": "PDF status updated"
}
```

### addPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=addPayment` |
| HTTP Status | 200 |
| Duration | 15ms |
| Message | Record not found or invalid request data |
| Skip write test | yes |

**Request body**

```json
{
  "date": "2024-01-01",
  "type": "Income",
  "amount": "1",
  "remark": "test"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found or invalid request data"
}
```

### getPaymentList — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=getPaymentList` |
| HTTP Status | 200 |
| Duration | 747ms |
| Message | HTTP 200 |
| Skip write test | no |

**Request body**

```json
{}
```

**Response**

```json
{
  "status": true,
  "error": false,
  "data": [],
  "totalIncome": 0,
  "totalExpenses": 0,
  "netBalance": 0
}
```

### editPayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=editPayment` |
| HTTP Status | 200 |
| Duration | 970ms |
| Message | Record not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Record not found"
}
```

### deletePayment — PASS

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:5000/api?apicall=deletePayment` |
| HTTP Status | 200 |
| Duration | 822ms |
| Message | Payment not found |
| Skip write test | yes |

**Request body**

```json
{
  "id": "00000000-0000-0000-0000-000000000001"
}
```

**Response**

```json
{
  "error": true,
  "message": "Payment not found"
}
```


## Next.js API Routes

### /api/proxy-image

- Method: `GET`
- Status: exists (500)
- Response:

```json
{
  "error": "Failed to proxy image"
}
```

### /api/fireconnect

- Method: `POST`
- Status: skipped (n/a)
- Response:

```json
null
```

### /api/razorpay/create-order

- Method: `POST`
- Status: skipped (n/a)
- Response:

```json
null
```

### /api/razorpay/verify-payment

- Method: `POST`
- Status: skipped (n/a)
- Response:

```json
null
```

### /api/whatsapp-test

- Method: `GET`
- Status: exists (200)
- Response:

```json
{
  "message": "WhatsApp Test API",
  "usage": {
    "POST": {
      "description": "Send a WhatsApp message",
      "body": {
        "phoneNumber": "string (required)",
        "message": "string (optional)",
        "templateName": "string (optional)"
      },
      "examples": [
        {
          "description": "Send custom message",
          "body": {
            "phoneNumber": "918094983470",
            "message": "Hello from Purabiya Foundation!"
          }
        },
        {
          "description": "Send template message",
          "body": {
            "phoneNumber": "918094983470",
            "templateName": "hello_world"
          }
        },
        {
          "description": "Send application confirmation",
          "body": {
            "phoneNumber": "918094983470"
          }
        }
      ]
    }
  }
}
```

### /api/fill-pdf-form

- Method: `POST`
- Status: skipped (n/a)
- Response:

```json
null
```

### /api/generate-agent-pdf

- Method: `POST`
- Status: skipped (n/a)
- Response:

```json
null
```

### /api/generate-insurance-pdf

- Method: `POST`
- Status: skipped (n/a)
- Response:

```json
null
```

### /api/generate-mayra-pdf

- Method: `POST`
- Status: skipped (n/a)
- Response:

```json
null
```

### /api/generate-pension-pdf

- Method: `POST`
- Status: skipped (n/a)
- Response:

```json
null
```

## Output Files

- `API_AUDIT_FULL_REPORT.md` — this report
- `API_AUDIT_RESULTS.json` — machine-readable summary + all responses
- `responses/<apicall>.json` — one file per endpoint
