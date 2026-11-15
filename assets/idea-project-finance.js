/* IDEA LAB — local project investment workspace model. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.IDEALABProjectFinance=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const ACCEPTED=new Set(["Qabul qilindi","accepted"]);
 const REJECTED=new Set(["Rad etildi","rejected"]);
 const REVIEW=new Set(["Ko‘rib chiqilmoqda","Ko'rib chiqilmoqda","under_review"]);
 function amountOf(application){
  const amount=Number(application&& (application.offerAmount??application.amount));
  return Number.isSafeInteger(amount)&&amount>0?amount:0;
 }
 function summarize(project,applications){
  const id=project&&project.id;
  const rows=(Array.isArray(applications)?applications:[]).filter(item=>item&&String(item.projectId)===String(id));
  let requestedAmount=0,acceptedOfferAmount=0,rejectedOfferAmount=0,reviewOfferAmount=0;
  const counts={new:0,review:0,accepted:0,rejected:0};
  rows.forEach(item=>{
   const amount=amountOf(item),status=String(item.status||"Yangi");
   requestedAmount+=amount;
   if(ACCEPTED.has(status)){acceptedOfferAmount+=amount;counts.accepted++}
   else if(REJECTED.has(status)){rejectedOfferAmount+=amount;counts.rejected++}
   else if(REVIEW.has(status)){reviewOfferAmount+=amount;counts.review++}
   else counts.new++;
  });
  return Object.freeze({projectId:String(id??""),applicationCount:rows.length,requestedAmount,acceptedOfferAmount,rejectedOfferAmount,reviewOfferAmount,counts:Object.freeze(counts)});
 }
 function updateTerms(projects,projectId,terms){
  if(!Array.isArray(projects))throw new TypeError("Loyihalar ro‘yxati noto‘g‘ri.");
  if(projectId===undefined||projectId===null||String(projectId)==="")throw new TypeError("Loyiha tanlanmagan.");
  const index=projects.findIndex(item=>item&&String(item.id)===String(projectId));
  if(index<0)throw new RangeError("Tanlangan loyiha topilmadi.");
  const parse=(value,label,required)=>{
   if(value===undefined||value===null||value===""){if(required)throw new RangeError(label+" kiritilishi shart.");return null}
   const number=Number(value);
   if(!Number.isSafeInteger(number)||number<=0)throw new RangeError(label+" musbat butun son bo‘lishi kerak.");
   return number;
  };
  const valuation=parse(terms&&terms.projectValuation,"Loyiha qiymati",true);
  const target=parse(terms&&terms.fundingTarget,"Jalb qilish maqsadi",false);
  const shares=parse(terms&&terms.totalShareUnits,"Aksiya/birlik soni",false);
  const basis=terms&&terms.valuationBasis==="post-money"?"post-money":"pre-money";
  const next=projects.slice();
  next[index]=Object.assign({},projects[index],{
   projectValuation:valuation,
   fundingTarget:target,
   totalShareUnits:shares,
   valuationBasis:basis,
   financeTermsUpdatedAt:terms&&terms.updatedAt?String(terms.updatedAt):new Date().toISOString()
  });
  return next;
 }
 return Object.freeze({summarize,updateTerms});
});
