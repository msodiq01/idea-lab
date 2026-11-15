/* IDEA LAB — investment ownership calculator (illustrative only). */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.IDEALABInvestmentCalculator=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 function positiveInteger(value,name){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<=0)throw new RangeError(name+" musbat butun son bo‘lishi kerak.");
  return number;
 }
 function calculate(input){
  input=input||{};
  const valuation=positiveInteger(input.valuation,"Loyiha bahosi");
  const investment=positiveInteger(input.investment,"Investitsiya");
  const basis=input.basis==="post-money"?"post-money":"pre-money";
  let postMoneyValue,equityPercent;
  if(basis==="pre-money"){
   if(valuation>Number.MAX_SAFE_INTEGER-investment)throw new RangeError("Hisoblash qiymati xavfsiz chegaradan oshdi.");
   postMoneyValue=valuation+investment;
   equityPercent=investment/postMoneyValue*100;
  }else{
   if(investment>valuation)throw new RangeError("Post-money bahoda investitsiya umumiy bahodan katta bo‘la olmaydi.");
   postMoneyValue=valuation;
   equityPercent=investment/valuation*100;
  }
  const committed=input.committed===undefined||input.committed===""?0:Number(input.committed);
  const target=input.target===undefined||input.target===""?0:Number(input.target);
  if(!Number.isSafeInteger(committed)||committed<0||!Number.isSafeInteger(target)||target<0)throw new RangeError("Jalb qilingan mablag‘ va maqsadli summa 0 yoki undan katta butun son bo‘lishi kerak.");
  const totalShares=input.totalShares===undefined||input.totalShares===""?null:Number(input.totalShares);
  if(totalShares!==null&&(!Number.isSafeInteger(totalShares)||totalShares<=0))throw new RangeError("Aksiyalar soni musbat butun son bo‘lishi kerak.");
  return Object.freeze({
   basis,valuation,investment,postMoneyValue,equityPercent,
   founderPercent:100-equityPercent,
   committed,target,
   fundingRemaining:Math.max(0,target-committed-investment),
   fundingProgressPercent:target>0?Math.min(100,(committed+investment)/target*100):null,
   indicativeShares:totalShares===null?null:totalShares*equityPercent/(100-equityPercent)
  });
 }
 return Object.freeze({calculate});
});
