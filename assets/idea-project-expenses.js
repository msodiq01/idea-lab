/* IDEA LAB — transparent project expense ledger (local demo; no money movement). */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.IDEALABProjectExpenses=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const STATUSES=Object.freeze(["Rejalashtirilgan","To‘lov kutilmoqda","To‘landi","Hujjat bilan tasdiqlandi"]);
 const text=value=>String(value??"").trim();
 function amount(value,label){
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<=0)throw new RangeError(label+" musbat butun so‘m bo‘lishi kerak.");
  return n;
 }
 function createEntry(input,context){
  const data=input&&typeof input==="object"?input:{};
  const projectId=text(context&&context.projectId);
  if(!projectId)throw new TypeError("Loyiha ID topilmadi.");
  const title=text(data.title),supplier=text(data.supplier),category=text(data.category);
  if(!title||!supplier||!category)throw new TypeError("Xarid nomi, yetkazib beruvchi va kategoriya majburiy.");
  const quantity=amount(data.quantity,"Miqdor");
  const unitPrice=amount(data.unitPrice,"Birlik narxi");
  const total=quantity*unitPrice;
  if(!Number.isSafeInteger(total))throw new RangeError("Xarid summasi xavfsiz hisob chegarasidan oshdi.");
  const status=STATUSES.includes(text(data.status))?text(data.status):STATUSES[0];
  return Object.freeze({
   id:text(data.id)||"EXP-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
   projectId,title,supplier,category,quantity,unit:text(data.unit)||"dona",
   unitPrice,total,status,
   purchaseDate:text(data.purchaseDate)||new Date().toISOString().slice(0,10),
   receiptReference:text(data.receiptReference),note:text(data.note),
   createdAt:text(data.createdAt)||new Date().toISOString(),
   updatedAt:new Date().toISOString()
  });
 }
 function summarize(entries,projectId){
  const rows=(Array.isArray(entries)?entries:[]).filter(row=>row&&String(row.projectId)===String(projectId));
  const total=rows.reduce((sum,row)=>sum+(Number.isSafeInteger(Number(row.total))&&Number(row.total)>0?Number(row.total):0),0);
  const paid=rows.filter(row=>["To‘landi","Hujjat bilan tasdiqlandi"].includes(row.status));
  const verified=rows.filter(row=>row.status==="Hujjat bilan tasdiqlandi");
  return Object.freeze({
   count:rows.length,totalPlanned:total,
   paidAmount:paid.reduce((sum,row)=>sum+(Number(row.total)||0),0),
   verifiedAmount:verified.reduce((sum,row)=>sum+(Number(row.total)||0),0),
   pendingAmount:rows.filter(row=>!["To‘landi","Hujjat bilan tasdiqlandi"].includes(row.status)).reduce((sum,row)=>sum+(Number(row.total)||0),0),
   itemCount:rows.reduce((sum,row)=>sum+(Number(row.quantity)||0),0)
  });
 }
 function updateStatus(entries,entryId,status,projectId){
  if(!STATUSES.includes(status))throw new RangeError("Xarajat holati noto‘g‘ri.");
  if(!Array.isArray(entries))throw new TypeError("Xarajatlar ro‘yxati noto‘g‘ri.");
  let found=false;
  const next=entries.map(row=>{
   if(row&&String(row.id)===String(entryId)&&String(row.projectId)===String(projectId)){
    found=true;return Object.assign({},row,{status,updatedAt:new Date().toISOString()});
   }
   return row;
  });
  if(!found)throw new RangeError("Xarajat yozuvi topilmadi.");
  return next;
 }
 return Object.freeze({STATUSES,createEntry,summarize,updateStatus});
});
