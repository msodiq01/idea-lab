/* IDEA LAB — investor's own submitted-offer portfolio (local demo). */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.IDEALABInvestorPortfolio=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const ACCEPTED=new Set(["qabul qilindi","accepted"]);
 const REJECTED=new Set(["rad etildi","rejected"]);
 const REVIEW=new Set(["ko‘rib chiqilmoqda","ko'rib chiqilmoqda","under_review","ko‘rib chiqilmoqda"]);
 function normalizeEmail(value){return String(value||"").trim().toLowerCase()}
 function amountOf(row){
  const amount=Number(row&&(row.offerAmount??row.amount));
  return Number.isSafeInteger(amount)&&amount>0?amount:0;
 }
 function statusOf(row){
  const status=String(row&&row.status||"Yangi").trim().toLowerCase();
  if(ACCEPTED.has(status))return "accepted";
  if(REJECTED.has(status))return "rejected";
  if(REVIEW.has(status))return "review";
  return "new";
 }
 function ownApplications(profile,applications){
  if(!profile||typeof profile!=="object")return [];
  const id=String(profile.id||"").trim();
  const email=normalizeEmail(profile.email);
  if(!id&&!email)return [];
  return (Array.isArray(applications)?applications:[]).filter(row=>{
   if(!row||typeof row!=="object")return false;
   const applicantId=String(row.applicantId||"").trim();
   if(applicantId)return Boolean(id&&applicantId===id);
   const rowEmail=normalizeEmail(row.applicantEmail||row.investorEmail);
   return Boolean(email&&rowEmail&&email===rowEmail);
  }).map(row=>Object.freeze({
   application:row,
   matchMethod:String(row.applicantId||"").trim()?"profile-id":"legacy-email"
  }));
 }
 function summarize(rows){
  const summary={count:0,totalAmount:0,acceptedAmount:0,reviewAmount:0,rejectedAmount:0,newAmount:0,acceptedCount:0,reviewCount:0,rejectedCount:0,newCount:0};
  (Array.isArray(rows)?rows:[]).forEach(item=>{
   const row=item&&item.application?item.application:item;
   if(!row||typeof row!=="object")return;
   const amount=amountOf(row),status=statusOf(row);
   summary.count++;summary.totalAmount+=amount;
   if(status==="accepted"){summary.acceptedAmount+=amount;summary.acceptedCount++}
   else if(status==="review"){summary.reviewAmount+=amount;summary.reviewCount++}
   else if(status==="rejected"){summary.rejectedAmount+=amount;summary.rejectedCount++}
   else{summary.newAmount+=amount;summary.newCount++}
  });
  return Object.freeze(summary);
 }
 function estimate(row,projects,calculator){
  const application=row&&row.application?row.application:row;
  if(!application)return null;
  const project=(Array.isArray(projects)?projects:[]).find(item=>item&&String(item.id)===String(application.projectId));
  if(!project)return Object.freeze({available:false,reason:"project-not-found"});
  const valuation=Number(project.projectValuation||project.valuation||0);
  const investment=amountOf(application);
  if(!Number.isSafeInteger(valuation)||valuation<=0||!investment)return Object.freeze({available:false,reason:"valuation-missing"});
  if(!calculator||typeof calculator.calculate!=="function")return Object.freeze({available:false,reason:"calculator-unavailable"});
  try{
   const result=calculator.calculate({valuation,investment,basis:project.valuationBasis==="post-money"?"post-money":"pre-money"});
   return Object.freeze({available:true,projectName:String(project.name||application.projectName||"Loyiha"),valuation,investment,equityPercent:result.equityPercent,postMoneyValue:result.postMoneyValue,basis:result.basis});
  }catch(error){return Object.freeze({available:false,reason:"calculation-error",message:error&&error.message?String(error.message):"Hisoblab bo‘lmadi"})}
 }
 return Object.freeze({ownApplications,summarize,estimate,statusOf,amountOf});
});
