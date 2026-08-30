/**
 * Seed sample data using the same API endpoints as the admin UI forms.
 * Usage: node scripts/seed-ui-data.mjs [--base-url URL]
 */

const BASE_URL =
  process.argv.includes("--base-url")
    ? process.argv[process.argv.indexOf("--base-url") + 1]
    : process.env.NEXT_PUBLIC_API_URL || "https://new-saf-foundation-backend.onrender.com/api";

function isoDate(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

const suffix = String(Date.now()).slice(-6);

const ADMIN_MOBILE = process.env.API_TEST_MOBILE || "9999999999";
const ADMIN_PASSWORD = process.env.API_TEST_PASSWORD || "password123";

function form(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== null && v !== undefined) fd.append(k, String(v));
  });
  return fd;
}

async function apiCall(apicall, data = {}, token = null, method = "POST") {
  const url = `${BASE_URL}?apicall=${apicall}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const init = { method, headers };
  if (method === "POST") init.body = form(data);

  const res = await fetch(url, init);
  const json = await res.json();
  if (json.error === true && !/already registered/i.test(json.message || "")) {
    throw new Error(`${apicall}: ${json.message || res.status}`);
  }
  return json;
}

async function login(mobile, password) {
  const data = await apiCall("login", { mobile, password });
  const token = data?.user?.token;
  if (!token) throw new Error(`Login failed for ${mobile}`);
  return { token, user: data.user };
}

async function getFirstAgentId(token) {
  const res = await fetch(`${BASE_URL}?apicall=getAgents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data?.data?.[0]?.id || null;
}

async function main() {
  console.log(`\nSeeding UI-shaped data via ${BASE_URL}\n`);

  // 1. Register a second admin (same as public register API used by UI)
  try {
    const admin = await apiCall("register", {
      name: "Test Admin",
      email: "testadmin@purabiya.org",
      mobile: "7777777777",
      password: "password123",
    });
    console.log(admin.error ? `ℹ️  Admin register: ${admin.message}` : "✅ Admin created: Test Admin (7777777777)");
  } catch (e) {
    console.log(`ℹ️  Admin register: ${e.message}`);
  }

  const { token, user: adminUser } = await login(ADMIN_MOBILE, ADMIN_PASSWORD);
  console.log(`✅ Logged in as ${adminUser.name} (${adminUser.mobile})`);

  const addedby = adminUser.name;
  const addedby_id = adminUser.id;

  // 2. Create agent (same fields as /dashboard/agent-registration/add)
  let agentId = null;
  const agentMobile = `9876${suffix}`;
  try {
    const agent = await apiCall(
      "addAgent",
      {
        date: "2024-06-01",
        dateOfBirth: "1990-05-15",
        doj: "2024-06-01",
        name: `Test Agent ${suffix}`,
        fatherName: "Shyam Lal",
        gotra: "Prajapat",
        age: "34",
        village: "Jasal",
        address: "Ward 2, Village Jasal",
        tehsil: "Balotra",
        district: "Barmer",
        mobile: agentMobile,
        bankName: "State Bank of India",
        accountNumber: "11223344556",
        ifsc: "SBIN0001234",
        nomineeName: "Sunita Devi",
        nomineeMobile: "9876543211",
        nomineeRelation: "Wife",
        workArea: "Balotra Block",
        gender: "Male",
        designation: "Field Agent",
        password: "password123",
        addedby,
        addedby_id,
      },
      token
    );
    agentId = agent?.data?.id;
    console.log(`✅ Agent created: Test Agent ${suffix} (${agentMobile}) id=${agentId || "ok"}`);
  } catch (e) {
    console.log(`ℹ️  Agent: ${e.message}`);
    agentId = await getFirstAgentId(token);
    if (agentId) console.log(`ℹ️  Using existing agent id=${agentId}`);
  }

  // 3. General application (same shape as general-applications/add)
  let applicationId = null;
  try {
    const app = await apiCall(
      "createApplication",
      {
        applicationDate: isoDate("2024-06-10"),
        applicantName: "Mohan Singh",
        fatherName: "Ram Singh",
        motherName: "Geeta Devi",
        dateOfBirth: isoDate("1985-03-20"),
        aadharNumber: "123456789012",
        gotra: "Prajapat",
        mobile: `9123${suffix}`,
        address: "Village Jasal, Balotra",
        pinCode: "344022",
        tehsil: "Balotra",
        district: "Barmer",
        state: "Rajasthan",
        nomineeName: "Laxmi Devi",
        nomineeRelation: "Wife",
        gender: "Male",
        category: "A",
        totalAmount: "5000",
        paymentAmount: "1000",
        paymentMode: "CASH",
        addedby,
        addedby_id,
        selectedAgentId: agentId || addedby_id,
      },
      token
    );
    applicationId = app?.data?.id;
    console.log(`✅ General application created: Mohan Singh id=${applicationId || "ok"}`);
  } catch (e) {
    console.log(`ℹ️  General application: ${e.message}`);
  }

  // 4. Loan application
  try {
    await apiCall(
      "addLoanApplication",
      {
        date: isoDate("2024-06-12"),
        applicantName: "Priya Sharma",
        fatherName: "Rajesh Sharma",
        motherName: "Kamla Sharma",
        address: "Balotra, Rajasthan",
        reason: "Education support",
        addedby,
        addedby_id,
      },
      token
    );
    console.log("✅ Loan application created");
  } catch (e) {
    console.log(`ℹ️  Loan: ${e.message}`);
  }

  // 5. Financial help
  let financialHelpId = null;
  try {
    const fh = await apiCall(
      "addFinancialHelp",
      {
        formNumber: `FH-${suffix}`,
        date: isoDate("2024-06-15"),
        name: "Suresh Meena",
        gender: "Male",
        fatherName: "Gopal Meena",
        address: "Village Jasal",
        district: "Barmer",
        village: "Jasal",
        tehsil: "Balotra",
        phone: "9988776655",
        donatedAmount: "2500",
        addedby,
        addedby_id,
      },
      token
    );
    financialHelpId = fh?.data?.id;
    console.log(`✅ Financial help created id=${financialHelpId || "ok"}`);
  } catch (e) {
    console.log(`ℹ️  Financial help: ${e.message}`);
  }

  if (financialHelpId) {
    try {
      await apiCall(
        "addFinancialHelpInstallment",
        {
          financial_help_id: financialHelpId,
          amount: "500",
          date: isoDate("2024-07-01"),
          note: "First installment",
        },
        token
      );
      console.log("✅ Financial help installment added");
    } catch (e) {
      console.log(`ℹ️  Financial help installment: ${e.message}`);
    }
  }

  // 6. Disability cycle
  try {
    await apiCall(
      "addDisabilityCycle",
      {
        formNumber: `DC-${suffix}`,
        applicationDate: isoDate("2024-06-18"),
        applicantName: "Anita Devi",
        fatherName: "Bhagwan Das",
        motherName: "Sushila Devi",
        dateOfBirth: isoDate("1992-08-10"),
        aadharNumber: "234567890123",
        gotra: "Prajapat",
        age: "32",
        mobile: "9876501234",
        address: "Balotra",
        pinCode: "344022",
        tehsil: "Balotra",
        district: "Barmer",
        state: "Rajasthan",
        addedby,
        addedby_id,
      },
      token
    );
    console.log("✅ Disability cycle record created");
  } catch (e) {
    console.log(`ℹ️  Disability cycle: ${e.message}`);
  }

  // 7. Pension yojana
  try {
    await apiCall(
      "addPensionYojana",
      {
        date: isoDate("2024-06-20"),
        name: "Kamla Devi",
        fatherName: "Ram Prasad",
        gotra: "Prajapat",
        age: "68",
        gender: "Female",
        village: "Jasal",
        tehsil: "Balotra",
        district: "Barmer",
        mobile: "9876512345",
        bankName: "SBI",
        accountNumber: "99887766554",
        ifscCode: "SBIN0001234",
        monthlyPension: "1000",
        addedby,
        addedby_id,
      },
      token
    );
    console.log("✅ Pension yojana beneficiary created");
  } catch (e) {
    console.log(`ℹ️  Pension: ${e.message}`);
  }

  // 8. Sewing camp
  try {
    await apiCall(
      "addSewingCamp",
      {
        campNumber: `SC-${suffix}`,
        formNumber: `SMC-${suffix}`,
        applicationDate: isoDate("2024-06-22"),
        applicantName: "Rekha Devi",
        fatherName: "Mohan Lal",
        motherName: "Sita Devi",
        dateOfBirth: isoDate("1995-01-15"),
        aadharNumber: "345678901234",
        gotra: "Prajapat",
        age: "29",
        mobile: "9876523456",
        address: "Balotra",
        pinCode: "344022",
        tehsil: "Balotra",
        district: "Barmer",
        state: "Rajasthan",
        addedby,
        addedby_id,
      },
      token
    );
    console.log("✅ Sewing camp application created");
  } catch (e) {
    console.log(`ℹ️  Sewing camp: ${e.message}`);
  }

  // 9. Cash flow payment
  try {
    await apiCall(
      "addPayment",
      {
        date: isoDate("2024-06-25"),
        type: "Income",
        amount: "5000",
        remark: "Donation received",
      },
      token
    );
    console.log("✅ Cash flow payment recorded");
  } catch (e) {
    console.log(`ℹ️  Payment: ${e.message}`);
  }

  // 10. Mayra registration
  let mayraId = null;
  try {
    const mayra = await apiCall(
      "createmayra_Application",
      {
        applicationDate: isoDate("2024-06-28"),
        applicantName: "Vikram Singh",
        fatherName: "Dalip Singh",
        motherName: "Kamla Devi",
        dateOfBirth: isoDate("1988-04-12"),
        age: "36",
        gotra: "Prajapat",
        address: "Jasal, Balotra",
        aadharNumber: `45678901${suffix.slice(0, 4)}`,
        mobile: `9111${suffix}`,
        nomineeName: "Sunita Devi",
        nomineeRelation: "Wife",
        tehsil: "Balotra",
        district: "Barmer",
        pinCode: "344022",
        workerName: "Field Worker",
        workerMobile: `9222${suffix}`,
        gender: "Male",
        paymentAmount: "500",
        paymentMode: "CASH",
        addedby,
        addedby_id,
        selectedAgentId: agentId || addedby_id,
      },
      token
    );
    mayraId = mayra?.data?.id;
    console.log(`✅ Mayra registration created id=${mayraId || "ok"}`);
  } catch (e) {
    console.log(`ℹ️  Mayra: ${e.message}`);
  }

  // 11. Insurance application
  let insuranceId = null;
  try {
    const ins = await apiCall(
      "createInsuranceApplication",
      {
        applicationDate: isoDate("2024-06-29"),
        applicantName: "Arjun Meena",
        fatherName: "Gopal Meena",
        motherName: "Sita Devi",
        dateOfBirth: isoDate("1990-07-20"),
        aadharNumber: `56789012${suffix.slice(0, 4)}`,
        gotra: "Prajapat",
        mobile: `9333${suffix}`,
        address: "Balotra, Rajasthan",
        pinCode: "344022",
        tehsil: "Balotra",
        district: "Barmer",
        state: "Rajasthan",
        nomineeName: "Priya Meena",
        nomineeRelation: "Wife",
        gender: "Male",
        category: "A",
        totalAmount: "3000",
        paymentAmount: "500",
        paymentMode: "CASH",
        addedby,
        addedby_id,
        selectedAgentId: agentId || addedby_id,
      },
      token
    );
    insuranceId = ins?.data?.id;
    console.log(`✅ Insurance application created id=${insuranceId || "ok"}`);
  } catch (e) {
    console.log(`ℹ️  Insurance: ${e.message}`);
  }

  // 12. Marriage congratulations
  let marriageId = null;
  try {
    const marriage = await apiCall(
      "addMarriageCongrats",
      {
        date: isoDate("2024-07-01"),
        codeNumber: `MC-${suffix}`,
        marriageNumber: `MR-${suffix}`,
        applicantName: "Neha Devi",
        fatherName: "Ram Prasad",
        gotra: "Prajapat",
        address: "Jasal, Balotra",
        membershipJoinDate: isoDate("2020-01-01"),
        associatedUntil: isoDate("2025-12-31"),
        permanentFee: "1000",
        installmentAmount: "500",
        totalGrantAmount: "5000",
        totalMembersServing: "10",
        rate100: "100",
        rate200: "200",
        rate300: "300",
        deductionPercent: "10",
        deductedAmount: "500",
        totalPaidAmount: "4500",
        gender: "Female",
        addedby,
        addedby_id,
      },
      token
    );
    marriageId = marriage?.data?.id;
    console.log(`✅ Marriage congratulations created id=${marriageId || "ok"}`);
  } catch (e) {
    console.log(`ℹ️  Marriage congrats: ${e.message}`);
  }

  console.log("\n--- Seed complete ---");
  console.log("Login credentials:");
  console.log("  Super Admin: 9999999999 / password123");
  console.log("  Test Admin:  7777777777 / password123");
  console.log(`  New Agent:   ${agentMobile} / password123`);
  console.log("  Seed Agent:  8888888888 / password123");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
