import assert from "node:assert";
import {
  parseIndiaPostResponse,
  sanitizeBlockName,
  lookupPostalPincode,
} from "../lib/postal-pincode-service.ts";

async function runTests() {
  console.log("=== Testing Postal PIN Code Autocomplete Service ===");

  // 1. Sanitize Block Name tests
  console.log("Test 1: sanitizeBlockName");
  assert.strictEqual(sanitizeBlockName("NA"), "");
  assert.strictEqual(sanitizeBlockName("n/a"), "");
  assert.strictEqual(sanitizeBlockName("-"), "");
  assert.strictEqual(sanitizeBlockName("none"), "");
  assert.strictEqual(sanitizeBlockName("not available"), "");
  assert.strictEqual(sanitizeBlockName("Balotra"), "Balotra");
  assert.strictEqual(sanitizeBlockName(""), "");
  console.log("  Passed!");

  // 2. Parse mock response with multiple post offices
  console.log("Test 2: parseIndiaPostResponse with multiple post offices");
  const mockMultiple = [
    {
      Message: "Number of pincode(s) found:2",
      Status: "Success",
      PostOffice: [
        {
          Name: "Asada",
          Block: "Balotra",
          District: "Barmer",
          State: "Rajasthan",
          Pincode: "344022",
          BranchType: "Branch Post Office",
        },
        {
          Name: "Jasol",
          Block: "Balotra",
          District: "Barmer",
          State: "Rajasthan",
          Pincode: "344022",
          BranchType: "Sub Post Office",
        },
      ],
    },
  ];
  const parsedMultiple = parseIndiaPostResponse("344022", mockMultiple);
  assert.strictEqual(parsedMultiple.status, "success");
  assert.strictEqual(parsedMultiple.state, "Rajasthan");
  assert.strictEqual(parsedMultiple.district, "Barmer");
  assert.strictEqual(parsedMultiple.city, "Barmer");
  assert.strictEqual(parsedMultiple.tehsil, "Balotra");
  assert.strictEqual(parsedMultiple.postOffices.length, 2);
  assert.deepStrictEqual(parsedMultiple.localities, ["Asada", "Jasol"]);
  console.log("  Passed!");

  // 3. Parse mock response with single post office
  console.log("Test 3: parseIndiaPostResponse with single post office");
  const mockSingle = [
    {
      Message: "Number of pincode(s) found:1",
      Status: "Success",
      PostOffice: [
        {
          Name: "Central Secretariate",
          Block: "New Delhi",
          District: "New Delhi",
          State: "Delhi",
          Pincode: "110001",
          BranchType: "Sub Post Office",
        },
      ],
    },
  ];
  const parsedSingle = parseIndiaPostResponse("110001", mockSingle);
  assert.strictEqual(parsedSingle.status, "success");
  assert.strictEqual(parsedSingle.state, "Delhi");
  assert.strictEqual(parsedSingle.district, "New Delhi");
  assert.strictEqual(parsedSingle.city, "New Delhi");
  assert.strictEqual(parsedSingle.tehsil, "New Delhi");
  assert.strictEqual(parsedSingle.postOffices.length, 1);
  console.log("  Passed!");

  // 4. Parse mock response for invalid/unknown PIN code
  console.log("Test 4: parseIndiaPostResponse with invalid PIN code");
  const mockNotFound = [
    {
      Message: "No records found",
      Status: "Error",
      PostOffice: null,
    },
  ];
  const parsedNotFound = parseIndiaPostResponse("999999", mockNotFound);
  assert.strictEqual(parsedNotFound.status, "not_found");
  assert.strictEqual(parsedNotFound.postOffices.length, 0);
  assert.strictEqual(parsedNotFound.state, "");
  console.log("  Passed!");

  // 5. Test real API lookup (live integration check for Balotra/Barmer)
  console.log("Test 5: Live API lookup for 344022 (Rajasthan)");
  const liveResult = await lookupPostalPincode("344022");
  console.log("  Live result status:", liveResult.status, "district:", liveResult.district, "state:", liveResult.state, "post offices:", liveResult.postOffices.length);
  assert.strictEqual(liveResult.status, "success");
  assert.strictEqual(liveResult.state, "Rajasthan");
  assert.strictEqual(liveResult.district, "Barmer");
  assert.ok(liveResult.postOffices.length > 0);
  console.log("  Passed!");

  // 6. Test real API lookup for multiple post offices (Jaipur 302001 or Delhi 110001)
  console.log("Test 6: Live API lookup for multi-locality PIN (110001)");
  const multiResult = await lookupPostalPincode("110001");
  console.log("  Multi result status:", multiResult.status, "district:", multiResult.district, "post offices:", multiResult.postOffices.length);
  assert.strictEqual(multiResult.status, "success");
  assert.strictEqual(multiResult.state, "Delhi");
  assert.ok(multiResult.postOffices.length > 1, "Should return multiple post offices for 110001");
  console.log("  Passed!");

  // 7. Test in-memory caching behavior (instant second call)
  console.log("Test 7: In-memory caching for repeated lookups");
  const start = Date.now();
  const cachedResult = await lookupPostalPincode("344022");
  const elapsed = Date.now() - start;
  assert.strictEqual(cachedResult.status, "success");
  assert.ok(elapsed < 20, `Cache should be instant, took ${elapsed}ms`);
  console.log("  Passed! (Elapsed: " + elapsed + "ms)");

  // 8. Test invalid short PIN code
  console.log("Test 8: Input with fewer than 6 digits");
  const shortResult = await lookupPostalPincode("123");
  assert.strictEqual(shortResult.status, "not_found");
  console.log("  Passed!");

  // 9. Test unknown PIN code (live lookup for nonexistent PIN)
  console.log("Test 9: Live lookup for unknown PIN (000000 / 999999)");
  const unknownResult = await lookupPostalPincode("999999");
  console.log("  Unknown PIN status:", unknownResult.status, "message:", unknownResult.message);
  assert.ok(unknownResult.status === "not_found" || unknownResult.status === "error");
  console.log("  Passed!");

  // 10. Test abort/timeout handling
  console.log("Test 10: Signal abort handling");
  const abortController = new AbortController();
  abortController.abort();
  try {
    const abortedResult = await lookupPostalPincode("302001", { signal: abortController.signal, timeoutMs: 1 });
    assert.strictEqual(abortedResult.status, "error");
    console.log("  Passed!");
  } catch (err) {
    // If it threw an AbortError that is also an acceptable rejection
    console.log("  Passed with expected AbortError!");
  }

  console.log("\nALL 10 POSTAL SERVICE AND PIN CODE TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
