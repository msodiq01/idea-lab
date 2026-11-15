"use strict";
const assert=require("node:assert/strict");
const portfolio=require("../assets/idea-investor-portfolio.js");
const calculator=require("../assets/idea-investment-calculator.js");
const profile={id:"profile-1",email:"owner@example.com"};
const rows=[
 {id:"mine-1",applicantId:"profile-1",applicantEmail:"owner@example.com",projectId:"p1",projectName:"Green Tech",offerAmount:100000000,status:"Qabul qilindi",date:"2026-11-01"},
 {id:"mine-2",applicantId:"profile-1",applicantEmail:"owner@example.com",projectId:"p2",projectName:"Edu App",amount:50000000,status:"Ko‘rib chiqilmoqda"},
 {id:"legacy",investorEmail:"OWNER@example.com",projectId:"p1",offerAmount:25000000,status:"Yangi"},
 {id:"other",applicantId:"profile-2",applicantEmail:"owner@example.com",projectId:"p1",offerAmount:999999999,status:"Qabul qilindi"}
];
const own=portfolio.ownApplications(profile,rows);
assert.deepEqual(own.map(item=>item.application.id),["mine-1","mine-2","legacy"]);
assert.equal(own[0].matchMethod,"profile-id");
assert.equal(own[2].matchMethod,"legacy-email");
assert.equal(portfolio.ownApplications({id:"profile-1",email:"owner@example.com"},[{applicantId:"profile-2",applicantEmail:"owner@example.com"}]).length,0,"Mismatched explicit profile IDs must not fall back to email");
const summary=portfolio.summarize(own);
assert.equal(summary.count,3);
assert.equal(summary.totalAmount,175000000);
assert.equal(summary.acceptedAmount,100000000);
assert.equal(summary.reviewAmount,50000000);
assert.equal(summary.newCount,1);
const projects=[
 {id:"p1",name:"Green Tech",projectValuation:1000000000,valuationBasis:"pre-money"},
 {id:"p2",name:"Edu App",projectValuation:500000000,valuationBasis:"post-money"}
];
const acceptedEstimate=portfolio.estimate(own[0],projects,calculator);
assert.equal(acceptedEstimate.available,true);
assert.ok(Math.abs(acceptedEstimate.equityPercent-(100000000/1100000000*100))<1e-9);
assert.equal(portfolio.estimate(own[1],projects,calculator).equityPercent,10);
assert.equal(portfolio.estimate(own[2],[{id:"p1",name:"Green Tech"}],calculator).reason,"valuation-missing");
assert.equal(portfolio.ownApplications(null,rows).length,0);
console.log("Investor portfolio model tests passed.");
