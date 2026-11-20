import test from "node:test";
import assert from "node:assert/strict";
import { validateCompanyConfig, findPlaceholders } from "./check-company.mjs";

test("findPlaceholders detects known placeholder addresses and numbers", () => {
  const sample = {
    legalName: "Real Corp Private Limited",
    address: "Innovate Tech Park, 4th Block, Koramangala, Bengaluru 560034",
    helpdeskPhone: "+91 (080) 4567-8900",
    supportEmail: "support@realcorp.in",
  };
  const placeholders = findPlaceholders(sample);
  assert.equal(placeholders.length, 2);
  assert.equal(placeholders[0].field, "address");
  assert.equal(placeholders[1].field, "helpdeskPhone");
});

test("findPlaceholders detects pgcashflow.in placeholder emails", () => {
  const sample = {
    legalName: "Real Corp Private Limited",
    address: "Real Street 123",
    helpdeskPhone: "+91 9876543210",
    supportEmail: "support@pgcashflow.in",
    grievanceEmail: "grievance@pgcashflow.in",
  };
  const placeholders = findPlaceholders(sample);
  assert.equal(placeholders.length, 2);
  assert.equal(placeholders[0].field, "supportEmail");
  assert.equal(placeholders[1].field, "grievanceEmail");
});

test("validateCompanyConfig blocks when verified is false", () => {
  const company = {
    verified: false,
    legalName: "Real Corp",
    address: "Real Address",
    supportEmail: "support@realcorp.in",
    helpdeskPhone: "+91 9876543210",
    grievanceEmail: "grievance@realcorp.in",
  };
  const res = validateCompanyConfig(company, {});
  assert.equal(res.ok, false);
  assert.match(res.reason, /not verified/i);
});

test("validateCompanyConfig blocks when verified is true but placeholders are present", () => {
  const companyWithPlaceholders = {
    verified: true,
    legalName: "PG Cashflow Technologies Private Limited",
    address: "Innovate Tech Park, 4th Block, Koramangala, Bengaluru, Karnataka 560034, India",
    supportEmail: "support@pgcashflow.in",
    helpdeskPhone: "+91 (080) 4567-8900",
    grievanceEmail: "grievance@pgcashflow.in",
  };
  const res = validateCompanyConfig(companyWithPlaceholders, {});
  assert.equal(res.ok, false);
  assert.match(res.reason, /contain placeholder values/i);
});

test("validateCompanyConfig blocks when required fields are missing", () => {
  const companyMissingField = {
    verified: true,
    legalName: "Acme PG Services Pvt Ltd",
    address: "123 Indiranagar 100ft Road, Bengaluru 560038",
    supportEmail: "support@acmepg.in",
    helpdeskPhone: "", // missing
    grievanceEmail: "grievance@acmepg.in",
  };
  const res = validateCompanyConfig(companyMissingField, {});
  assert.equal(res.ok, false);
  assert.match(res.reason, /helpdeskPhone.*missing or empty/i);
});

test("validateCompanyConfig passes with warning when ALLOW_UNVERIFIED_COMPANY=1 is set", () => {
  const companyWithPlaceholders = {
    verified: false,
    legalName: "Placeholder Name",
    address: "Innovate Tech Park",
  };
  const res = validateCompanyConfig(companyWithPlaceholders, { ALLOW_UNVERIFIED_COMPANY: "1" });
  assert.equal(res.ok, true);
  assert.equal(res.warned, true);
});

test("validateCompanyConfig passes when verified is true with genuine details", () => {
  const genuineCompany = {
    verified: true,
    legalName: "Authentic PG Operators Private Limited",
    address: "Plot 42, HSR Layout Sector 2, Bengaluru, Karnataka 560102, India",
    supportEmail: "help@authenticpg.in",
    helpdeskPhone: "+91 9988776655",
    grievanceEmail: "nodal@authenticpg.in",
  };
  const res = validateCompanyConfig(genuineCompany, {});
  assert.equal(res.ok, true);
  assert.equal(res.legalName, "Authentic PG Operators Private Limited");
});
