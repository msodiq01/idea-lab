"use strict";
const assert=require("node:assert/strict");
const calculator=require("../assets/idea-investment-calculator.js");
{
 const result=calculator.calculate({valuation:1000000000,investment:100000000,basis:"pre-money",target:300000000,committed:50000000,totalShares:1000});
 assert.equal(result.postMoneyValue,1100000000);
 assert.ok(Math.abs(result.equityPercent-9.0909090909)<1e-8);
 assert.ok(Math.abs(result.founderPercent-90.9090909091)<1e-8);
 assert.equal(result.fundingRemaining,150000000);
 assert.equal(result.indicativeShares,1000*100/1100);
}
{
 const result=calculator.calculate({valuation:1000000000,investment:100000000,basis:"post-money"});
 assert.equal(result.postMoneyValue,1000000000);
 assert.equal(result.equityPercent,10);
}
assert.throws(()=>calculator.calculate({valuation:0,investment:1}),RangeError);
assert.throws(()=>calculator.calculate({valuation:100,investment:101,basis:"post-money"}),RangeError);
assert.throws(()=>calculator.calculate({valuation:100,investment:10,totalShares:-1}),RangeError);
console.log("Investment calculator tests passed.");
