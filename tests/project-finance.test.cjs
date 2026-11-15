"use strict";
const assert=require("node:assert/strict");
const finance=require("../assets/idea-project-finance.js");
const projects=[{id:"p1",name:"Loyiha 1",investment:300000000,ownerName:"Owner"},{id:"p2",name:"Loyiha 2"}];
const applications=[
 {id:"a1",projectId:"p1",offerAmount:100000000,status:"Yangi"},
 {id:"a2",projectId:"p1",amount:50000000,status:"Qabul qilindi"},
 {id:"a3",projectId:"p1",offerAmount:25000000,status:"Rad etildi"},
 {id:"a4",projectId:"p2",offerAmount:90000000,status:"Qabul qilindi"},
 {id:"a5",projectId:"p1",offerAmount:10000000,status:"Ko‘rib chiqilmoqda"},
 {id:"a6",projectId:"p1",offerAmount:"bad",status:"Yangi"}
];
{
 const result=finance.summarize(projects[0],applications);
 assert.equal(result.applicationCount,5);
 assert.equal(result.requestedAmount,185000000);
 assert.equal(result.acceptedOfferAmount,50000000);
 assert.equal(result.rejectedOfferAmount,25000000);
 assert.equal(result.reviewOfferAmount,10000000);
 assert.deepEqual(result.counts,{new:2,review:1,accepted:1,rejected:1});
}
{
 const next=finance.updateTerms(projects,"p1",{projectValuation:"1000000000",fundingTarget:"300000000",totalShareUnits:"1000",valuationBasis:"post-money",updatedAt:"2026-11-15T00:00:00.000Z"});
 assert.notEqual(next,projects);
 assert.equal(projects[0].projectValuation,undefined);
 assert.equal(next[0].projectValuation,1000000000);
 assert.equal(next[0].fundingTarget,300000000);
 assert.equal(next[0].totalShareUnits,1000);
 assert.equal(next[0].valuationBasis,"post-money");
 assert.equal(next[0].investment,300000000);
 assert.equal(next[1],projects[1]);
}
assert.throws(()=>finance.updateTerms(projects,"missing",{projectValuation:1}),RangeError);
assert.throws(()=>finance.updateTerms(projects,"p1",{projectValuation:0}),RangeError);
assert.throws(()=>finance.updateTerms(projects,"p1",{projectValuation:1,totalShareUnits:-2}),RangeError);
assert.throws(()=>finance.updateTerms({}, "p1",{projectValuation:1}),TypeError);
console.log("Project finance workspace tests passed.");
