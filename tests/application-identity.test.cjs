"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Taklif e'lonining yangi yozuvi profil egasi identifikatorini saqlaydi", () => {
  const offers = read("offers.html");
  assert.match(offers, /identity\.stamp\(offer, "owner"\)/);
  assert.match(offers, /offerOwnerId: offer\.ownerId/);
  assert.match(offers, /offerOwnerEmail: offer\.ownerEmail/);
});

test("Taklif arizasi arizachi va taklif egasini ID/email bilan bog'laydi", () => {
  const offers = read("offers.html");
  assert.match(offers, /identity\.stamp\(application, "applicant"\)/);
  assert.match(offers, /applicantId/);
  assert.match(offers, /offerOwnerId/);
  assert.match(offers, /item\.applicantId/);
});

test("Talab-taklif e'lonlarida yangi egaga profil identifikatori biriktiriladi", () => {
  const exchange = read("exchange.html");
  assert.match(exchange, /identity\.stamp\(item,"owner"\)/);
  assert.match(exchange, /ideaLabExchangeItems/);
});

test("Kabinet taklif arizalarini kiruvchi va yuborilgan oqimga qo'shadi", () => {
  const profile = read("profile.html");
  assert.match(profile, /key:"offerApplications"/);
  assert.match(profile, /offerOwnerId/);
  assert.match(profile, /applicantId/);
});

test("Legacy saqlash kalitlari o'chirilmagan", () => {
  const offers = read("offers.html");
  const exchange = read("exchange.html");
  assert.match(offers, /readData\("offers"\)/);
  assert.match(offers, /readData\("offerApplications"\)/);
  assert.match(offers, /readData\("offerMessages"\)/);
  assert.match(exchange, /ideaLabExchangeItems/);
});

test("Investor hamkorlik so‘rovi profil identifikatoriga biriktiriladi va shaxsiy ro‘yxat filtrlanadi",()=>{
 const investors=read("investors.html");
 const profile=read("profile.html");
 assert.match(investors,/identity\.stamp\(request, "applicant"\)/);
 assert.match(investors,/applicantId/);
 assert.match(investors,/profilingizga bog‘langan yuborilgan so‘rov yo‘q/);
 assert.match(profile,/key:"investorRequests"/);
 assert.match(profile,/Investorlar bilan hamkorlik so‘rovlarim/);
});
