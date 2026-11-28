/* IDEA LAB — server-backed career centre.
 * Vacancies display the employer-provided work contact. Applications remain visible only
 * to the applicant and the organization that published the vacancy.
 */
(() => {
  "use strict";
  const auth=window.IDEALAB_AUTH, data=window.IDEALAB_DATA;
  const $=id=>document.getElementById(id);
  const clean=value=>String(value??"").trim();
  const typeLabels={full_time:"To‘liq ish kuni",part_time:"Yarim stavka",remote:"Masofaviy",internship:"Amaliyot",freelance:"Frilans"};
  const statusLabels={submitted:"Ko‘rib chiqilmoqda",interview:"Suhbatga taklif",accepted:"Qabul qilindi",declined:"Rad etildi",withdrawn:"Qaytarib olindi"};
  let userId=null,jobs=[],ownedJobs=[],selectedJob=null,activeMode="seeker",appliedJobIds=new Set();
  const section=$("career-section"),jobList=$("jobList"),form=$("jobForm");
  function setCareerMode(mode){
    const active=mode==="employer"?"employer":"seeker";activeMode=active;
    document.querySelectorAll("[data-career-flow]").forEach(node=>{node.hidden=node.dataset.careerFlow!=="both"&&node.dataset.careerFlow!==active;});document.querySelectorAll(".career-apply-action").forEach(button=>{button.hidden=active==="employer";});
    if(active==="seeker"){$("employerOrgPanel").hidden=true;$("jobFormPanel").hidden=true;}else if(typeof applicationPanel!=="undefined"){applicationPanel.hidden=true;selectedJob=null;}
    $("modeSeeker").className=active==="seeker"?"btn green":"btn secondary";
    $("modeEmployer").className=active==="employer"?"btn green":"btn secondary";
  }
  const resumeForm=$("jobSeekerResumeForm"),matchBox=$("matchingJobs"),employerOrgForm=$("employerOrgForm");
  if(!section||!jobList||!form)return;
  jobList.replaceChildren();
  const legacyEmployerPanel=$("employerApplications")?.closest(".section");
  if(legacyEmployerPanel)legacyEmployerPanel.hidden=true;

  const notice=document.createElement("p");
  notice.className="notice";
  notice.setAttribute("role","status");
  notice.textContent="Xavfsizlik: vakansiya shartlari, ish beruvchi va yosh bo‘yicha talablarni ariza yuborishdan oldin ishonchli katta bilan tekshiring. E’londa aloqa uchun kiritilgan ism va ish telefoni hammaga ko‘rinadi; shaxsiy raqamingizni kiritmang.";
  section.insertBefore(notice,form.parentElement);

  const myPosts=document.createElement("section");
  myPosts.id="ilMyPostsSection";
  myPosts.className="section";
  myPosts.dataset.careerFlow="employer";
  myPosts.innerHTML='<div class="section-head"><div><h2>Mening e’lonlarim</h2><p>Bu yerda aynan shu IDEA LAB akkauntidan joylangan vakansiyalar va ularning holati ko‘rinadi. Boshqa qurilmada ham shu akkauntga kiring.</p></div><button class="btn secondary" id="ilRefreshCareerData" type="button">Ma’lumotlarni yangilash</button></div><div class="panel" id="ilEmployerDailyDashboard"><h3>Kunlik nomzodlar nazorati</h3><p class="notice">Keyingi bog‘lanish sanasi belgilangan nomzodlar, bugungi vazifalar va muddati o‘tgan eslatmalar.</p><div class="cards" id="ilEmployerFollowups"></div><h4>Bog‘lanilgan nomzodlar</h4><div class="cards" id="ilEmployerContactedCandidates"></div><h4>Suhbat bosqichidagi nomzodlar</h4><div class="cards" id="ilEmployerInterviewCandidates"></div></div><div class="panel" id="ilCentralApplicationsPanel"><h3>Yagona arizalar markazi</h3><p class="notice">Barcha vakansiyalaringizga kelgan arizalar bitta ro‘yxatda. Holat bo‘yicha filtrlashingiz mumkin.</p><div class="form-grid"><div class="field"><label for="ilCentralApplicationSearch">Nomzod yoki vakansiya</label><input id="ilCentralApplicationSearch" type="search" placeholder="Qidirish"></div><div class="field"><label for="ilCentralApplicationStatus">Ariza holati</label><select id="ilCentralApplicationStatus"><option value="">Barcha holatlar</option><option value="submitted">Yangi / ko‘rib chiqilmoqda</option><option value="interview">Suhbatga taklif</option><option value="accepted">Qabul qilindi</option><option value="declined">Rad etildi</option><option value="withdrawn">Qaytarib olindi</option></select></div><div class="field"><label for="ilCentralApplicationSort">Saralash</label><select id="ilCentralApplicationSort"><option value="newest">Eng yangi arizalar</option><option value="oldest">Eng eski arizalar</option><option value="candidate">Nomzod A–Z</option><option value="interview_first">Suhbat ustuvor</option></select></div></div><div class="cards" id="ilCentralApplications"></div></div><div id="ilMyJobPosts" class="cards"></div><h3 style="margin-top:22px">Vakansiya bo‘yicha arizalar</h3><p class="notice">Arizalarni alohida vakansiya bo‘yicha ham ko‘rishingiz mumkin.</p><div id="ilJobOwnerApplications" class="cards"></div>';
  section.append(myPosts);
  const myApps=document.createElement("section");
  myApps.id="ilMyApplicationsSection";
  myApps.className="section";
  myApps.dataset.careerFlow="seeker";
  myApps.innerHTML='<div class="section-head"><div><h2>Men yuborgan arizalar</h2><p>Vakansiyalarga yuborgan arizalaringiz va ularning holati.</p></div></div><div id="ilMyJobApplications" class="cards"></div>';
  section.append(myApps);
  const myActivity=document.createElement("section");
  myActivity.id="ilMyActivitySection";
  myActivity.className="section";
  myActivity.dataset.careerFlow="both";
  myActivity.innerHTML='<div class="section-head"><div><h2>Bildirishnomalar</h2><p>Ariza holati va ish beruvchi javoblari haqidagi yangilanishlar.</p></div></div><div id="ilMyJobActivity" class="cards"></div>';
  section.append(myActivity);
  const quickNav=document.createElement("div");
  quickNav.className="hero-actions";
  quickNav.innerHTML='<a class="btn secondary" href="#career-section">Ochiq vakansiyalar</a><a class="btn secondary" href="#ilMyPostsSection" data-career-flow="employer">Mening e’lonlarim</a><a class="btn secondary" href="#ilMyApplicationsSection" data-career-flow="seeker">Arizalarim</a><a class="btn secondary" href="#ilMyActivitySection" data-career-flow="both">Bildirishnomalar</a>';
  document.querySelector(".hero")?.append(quickNav);

  const oldCompany=$("companyName");
  if(oldCompany){
    const select=document.createElement("select");select.id="jobOrganization";select.required=true;select.className=oldCompany.className;
    select.innerHTML='<option value="">Tashkilotni tanlang</option>';
    const field=oldCompany.closest(".field");oldCompany.replaceWith(select);
    const label=field?.querySelector("label");if(label)label.textContent="Ish beruvchi tashkilot *";
  }
  const phoneField=$("employerPhone")?.closest(".field");if(phoneField)phoneField.remove();
  const formHint=document.createElement("p");formHint.className="notice";formHint.textContent="Vakansiya joylashtirish uchun IDEA LAB’da faol tashkilot egasi bo‘lishingiz kerak. Joylangan vakansiya moderator kutuvisiz darhol ochiq katalogda chiqadi. Aloqa uchun mas’ul shaxs ismi va ish telefon raqami ochiq e’londa ko‘rinadi; faqat ish uchun mo‘ljallangan raqamni kiriting.";
  form.insertBefore(formHint,form.firstChild);

  const applicationPanel=document.createElement("div");
  applicationPanel.className="form-panel";
  applicationPanel.hidden=true;
  applicationPanel.innerHTML='<h3 id="ilApplyTitle">Vakansiyaga ariza</h3><p class="notice">Ariza yuborilganda ism-familiya, kasb yo‘nalishi, ko‘nikmalar, ta’lim va tajriba ma’lumotlaringiz ushbu ish beruvchiga ko‘rinadi. Telefon, pasport yoki uy manzilingizni kiritmang.</p><div id="ilApplyFeedback" class="notice" role="status" aria-live="polite" hidden></div><form id="ilApplyForm"><div class="field"><label for="ilApplyMessage">Ish beruvchiga xabar (10–2000 belgi)</label><textarea id="ilApplyMessage" required minlength="10" maxlength="2000" rows="5" placeholder="Tajriba, qiziqish va mosligingiz haqida yozing. Telefon, manzil yoki boshqa maxfiy ma’lumotlarni kiritmang."></textarea></div><button class="btn btn-green" type="submit">Ariza yuborish</button><button class="btn btn-secondary" id="ilApplyCancel" type="button">Bekor qilish</button></form>';
  jobList.insertAdjacentElement("afterend",applicationPanel);

  function card(title,lines=[]){
    const node=document.createElement("article");node.className="card";
    const h=document.createElement("h3");h.textContent=title;node.append(h);
    lines.filter(Boolean).forEach(value=>{const p=document.createElement("p");p.textContent=value;node.append(p);});
    return node;
  }
  function empty(node,message){node.replaceChildren();const p=document.createElement("p");p.className="empty";p.textContent=message;node.append(p);}
  function setStatus(message,isError=false){
    notice.textContent=message;
    notice.style.borderColor=isError?"rgba(255,100,124,.65)":"rgba(22,199,181,.35)";
  }
  function errorText(result){return result?.error?.message||"Server amali bajarilmadi. Qayta urinib ko‘ring.";}
  function employmentType(raw){
    const found=Object.entries(typeLabels).find(([key])=>key===raw);return found?found[1]:"Boshqa";
  }
  function locationLabel(job){
    return [clean(job.region_label),clean(job.district_label),clean(job.location_label)].filter(Boolean).join(" · ")||"Hudud ko‘rsatilmagan";
  }
  function updateCounts(visibleCount=jobs.length){
    if($("jobCount"))$("jobCount").textContent=String(jobs.length);
    const statsRows=$("vacancyStatsRows");
    if(statsRows){
      statsRows.replaceChildren();
      [["Jami faol e’lonlar",jobs.length],["Jami ish o‘rinlari",jobs.reduce((sum,job)=>sum+(Number(job.openings_count)||1),0)],["Filtrdan keyin ko‘rinayotgan e’lonlar",visibleCount],["E’lon joylangan hududlar",new Set(jobs.map(job=>clean(job.region_label)||clean(job.location_label)||"Hudud ko‘rsatilmagan")).size]].forEach(([label,value])=>{
        const row=document.createElement("tr"),left=document.createElement("td"),right=document.createElement("td");
        left.textContent=label;right.textContent=String(value);right.style.textAlign="right";
        [left,right].forEach(cell=>{cell.style.padding="10px";cell.style.borderTop="1px solid var(--border,rgba(255,255,255,.12))";});
        row.append(left,right);statsRows.append(row);
      });
    }
    const employerTotals=new Map();
    jobs.forEach(job=>{
      const employer=clean(job.company_name)||"Tashkilot ko‘rsatilmagan";
      const totals=employerTotals.get(employer)||{posts:0,openings:0};
      totals.posts+=1;totals.openings+=Number(job.openings_count)||1;employerTotals.set(employer,totals);
    });
    const employerRows=$("vacancyEmployerRows");
    if(employerRows){
      employerRows.replaceChildren();
      [...employerTotals.entries()].sort((a,b)=>b[1].openings-a[1].openings||a[0].localeCompare(b[0],"uz")).slice(0,10).forEach(([employer,totals])=>{
        const row=document.createElement("tr"),left=document.createElement("td"),posts=document.createElement("td"),openings=document.createElement("td");
        left.textContent=employer;posts.textContent=String(totals.posts);openings.textContent=String(totals.openings);
        posts.style.textAlign="right";openings.style.textAlign="right";
        [left,posts,openings].forEach(cell=>{cell.style.padding="10px";cell.style.borderTop="1px solid var(--border,rgba(255,255,255,.12))";});
        row.append(left,posts,openings);employerRows.append(row);
      });
      if(!employerTotals.size){const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=3;cell.textContent="Ish beruvchilar statistikasi uchun ma’lumot topilmadi.";cell.style.padding="10px";row.append(cell);employerRows.append(row);}
    }
    const monthTotals=new Map();
    const now=new Date();
    for(let offset=5;offset>=0;offset--){
      const date=new Date(now.getFullYear(),now.getMonth()-offset,1);
      const key=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
      monthTotals.set(key,{label:date.toLocaleDateString("uz-UZ",{month:"long",year:"numeric"}),posts:0,openings:0});
    }
    jobs.forEach(job=>{
      const rawDate=job.published_at||job.created_at;
      if(!rawDate)return;
      const date=new Date(rawDate);if(Number.isNaN(date.getTime()))return;
      const key=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
      const totals=monthTotals.get(key);if(totals){totals.posts+=1;totals.openings+=Number(job.openings_count)||1;}
    });
    const trendRows=$("vacancyTrendRows");
    if(trendRows){
      trendRows.replaceChildren();
      [...monthTotals.values()].forEach(totals=>{
        const row=document.createElement("tr"),left=document.createElement("td"),posts=document.createElement("td"),openings=document.createElement("td");
        left.textContent=totals.label;posts.textContent=String(totals.posts);openings.textContent=String(totals.openings);
        posts.style.textAlign="right";openings.style.textAlign="right";
        [left,posts,openings].forEach(cell=>{cell.style.padding="10px";cell.style.borderTop="1px solid var(--border,rgba(255,255,255,.12))";});
        row.append(left,posts,openings);trendRows.append(row);
      });
    }
    const regions=new Map();
    jobs.forEach(job=>{
      const region=clean(job.region_label)||"Hudud ko‘rsatilmagan";
      const district=clean(job.district_label)||clean(job.location_label)||"Tuman ko‘rsatilmagan";
      const key=region+"|||"+district;
      const totals=regions.get(key)||{region,district,posts:0,openings:0};
      totals.posts+=1;totals.openings+=Number(job.openings_count)||1;regions.set(key,totals);
    });
    const professionTotals=new Map();
    jobs.forEach(job=>{
      const profession=clean(job.title)||"Lavozim ko‘rsatilmagan";
      const totals=professionTotals.get(profession)||{posts:0,openings:0};
      totals.posts+=1;totals.openings+=Number(job.openings_count)||1;professionTotals.set(profession,totals);
    });
    const professionRows=$("vacancyProfessionRows");
    if(professionRows){
      professionRows.replaceChildren();
      [...professionTotals.entries()].sort((a,b)=>b[1].openings-a[1].openings||a[0].localeCompare(b[0],"uz")).forEach(([profession,totals])=>{
        const row=document.createElement("tr"),left=document.createElement("td"),posts=document.createElement("td"),openings=document.createElement("td");
        left.textContent=profession;posts.textContent=String(totals.posts);openings.textContent=String(totals.openings);
        posts.style.textAlign="right";openings.style.textAlign="right";
        [left,posts,openings].forEach(cell=>{cell.style.padding="10px";cell.style.borderTop="1px solid var(--border,rgba(255,255,255,.12))";});
        row.append(left,posts,openings);professionRows.append(row);
      });
      if(!professionTotals.size){const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=3;cell.textContent="Kasblar statistikasi uchun vakansiya topilmadi.";cell.style.padding="10px";row.append(cell);professionRows.append(row);}
    }
    const regionRows=$("vacancyRegionRows");
    if(regionRows){
      regionRows.replaceChildren();
      [...regions.values()].sort((a,b)=>b.posts-a.posts||a.region.localeCompare(b.region,"uz")||a.district.localeCompare(b.district,"uz")).forEach(totals=>{
        const row=document.createElement("tr"),regionCell=document.createElement("td"),districtCell=document.createElement("td"),posts=document.createElement("td"),openings=document.createElement("td");
        regionCell.textContent=totals.region;districtCell.textContent=totals.district;posts.textContent=String(totals.posts);openings.textContent=String(totals.openings);
        posts.style.textAlign="right";openings.style.textAlign="right";
        [regionCell,districtCell,posts,openings].forEach(cell=>{cell.style.padding="10px";cell.style.borderTop="1px solid var(--border,rgba(255,255,255,.12))";});
        row.append(regionCell,districtCell,posts,openings);regionRows.append(row);
      });
      if(!regions.size){const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=4;cell.textContent="Hududiy statistika uchun vakansiya topilmadi.";cell.style.padding="10px";row.append(cell);regionRows.append(row);}
    }
  }
  function contactBlock(job){
    if(!job.contact_name&&!job.contact_phone)return null;
    const box=document.createElement("p");box.className="notice";
    const label=document.createElement("strong");label.textContent="Aloqa uchun: ";box.append(label);
    if(job.contact_name){const name=document.createElement("span");name.textContent=job.contact_name;box.append(name);}
    if(job.contact_name&&job.contact_phone){box.append(document.createTextNode(" · "));}
    if(job.contact_phone){
      const phone=document.createElement("a");phone.href="tel:"+String(job.contact_phone).replace(/[^0-9+]/g,"");
      phone.textContent=job.contact_phone;phone.style.color="var(--career-secondary)";phone.style.fontWeight="700";box.append(phone);
    }
    return box;
  }
  function renderJobs(){
    jobList.replaceChildren();
    const q=clean($("jobSearch")?.value).toLocaleLowerCase("uz-UZ");
    const f=clean($("jobFilter")?.value);
    const locationQuery=clean($("jobLocationFilter")?.value).toLocaleLowerCase("uz-UZ");
    const salaryFloor=Number($("jobSalaryFilter")?.value||0);
    const sortMode=$("jobSort")?.value||"default";
    const salaryNumber=job=>{
      const label=clean(job.salary_label).toLocaleLowerCase("uz-UZ");
      const first=label.match(/\d[\d\s.,]*/);if(!first)return 0;
      const raw=first[0].trim().replace(/\s/g,"").replace(/,/g,".");
      const amount=Number(raw);if(!Number.isFinite(amount))return 0;
      if(/mln|million|млн/.test(label))return amount*1000000;
      if(/ming|тыс/.test(label))return amount*1000;
      return amount;
    };
    const visible=jobs.filter(job=>{
      const hay=[job.title,job.company_name,job.region_label,job.district_label,job.location_label,job.description,job.schedule_label,employmentType(job.employment_type),...(job.required_skills||[])].join(" ").toLocaleLowerCase("uz-UZ");
      const location=[job.region_label,job.district_label,job.location_label].map(clean).join(" ").toLocaleLowerCase("uz-UZ");
      const salary=salaryNumber(job);
      return hay.includes(q)&&(!locationQuery||location.includes(locationQuery))&&(!f||employmentType(job.employment_type)===f)&&(!salaryFloor||salary>=salaryFloor);
    });
    if(sortMode==="title")visible.sort((a,b)=>clean(a.title).localeCompare(clean(b.title),"uz"));
    else if(sortMode==="salary")visible.sort((a,b)=>salaryNumber(b)-salaryNumber(a));
    const summary=$("jobResultSummary");
    if(summary)summary.textContent=visible.length+" ta vakansiya ko‘rsatildi. Jami "+jobs.length+" ta faol e’lon yuklandi.";
    updateCounts(visible.length);
    if(!visible.length){empty(jobList,"Tanlangan filtrlar bo‘yicha vakansiya topilmadi. Filtrlarni o‘zgartirib ko‘ring.");return;}
    visible.forEach(job=>{
      const node=card(job.title,[job.company_name,job.description]);
      const paragraphs=node.querySelectorAll("p");if(paragraphs[1])paragraphs[1].className="career-description";
      const meta=document.createElement("div");meta.className="career-meta";
      const chips=[locationLabel(job),employmentType(job.employment_type),job.schedule_label||"",Number(job.openings_count)>1?String(job.openings_count)+" ta ish o‘rni":"1 ta ish o‘rni",job.experience_years_min>0?"Tajriba: "+job.experience_years_min+" yil":"Tajriba shart emas",job.salary_label||"Maosh kelishiladi"];
      chips.filter(Boolean).forEach((label,index)=>{const chip=document.createElement("span");chip.className="career-chip"+(index===5?" career-salary":"");chip.textContent=label;meta.append(chip);});
      const skills=job.required_skills||[];
      if(skills.length){const skillLine=document.createElement("p");skillLine.textContent="Ko‘nikmalar: "+skills.join(", ");node.append(skillLine);}
      node.insertBefore(meta,node.children[1]||null);
      const contact=contactBlock(job);if(contact)node.append(contact);
      const actions=document.createElement("div");actions.className="card-actions";
      const apply=document.createElement("button");apply.className="btn btn-green";apply.type="button";
      const alreadyApplied=appliedJobIds.has(job.id);
      apply.textContent=alreadyApplied?"Avval ariza yuborilgan":userId?"Ariza yuborish":"Kirish orqali ariza yuborish";
      apply.disabled=alreadyApplied;
      apply.setAttribute("aria-label",alreadyApplied?job.title+" vakansiyasiga avval ariza yuborilgan":job.title+" vakansiyasiga ariza yuborish");
      apply.classList.add("career-apply-action");apply.hidden=activeMode==="employer";
      apply.addEventListener("click",()=>{
        if(!userId){location.href="auth.html?next=career.html";return;}
        selectedJob=job;$("ilApplyTitle").textContent=job.title+" — ariza";
        $("ilApplyMessage").value="";applicationPanel.hidden=false;applicationPanel.scrollIntoView({behavior:"smooth",block:"center"});
      });
      actions.append(apply);node.append(actions);jobList.append(node);
    });
    updateCounts();
  }
  function splitTags(value,max){
    return clean(value).split(",").map(x=>x.trim()).filter(Boolean).slice(0,max);
  }
  function fillResume(profile){
    if(!resumeForm||!profile)return;
    $("resumeFullName").value=profile.full_name||"";
    $("resumeCity").value=profile.city||"";
    $("resumeRoles").value=(profile.desired_roles||[]).join(", ");
    $("resumeSkills").value=(profile.skill_tags||[]).join(", ");
    $("resumeYears").value=String(profile.experience_years??0);
    $("resumeExperience").value=profile.experience_summary||"";
    $("resumeEducation").value=profile.education_summary||"";
    $("resumeMinSalary").value=profile.min_salary_uzs??"";
    $("resumeMaxSalary").value=profile.max_salary_uzs??"";
    $("resumeAvailability").value=profile.availability_status||"open";
    const selected=new Set(profile.employment_types||["full_time"]);
    Array.from($("resumeEmploymentTypes").querySelectorAll('input[type="checkbox"]')).forEach(option=>option.checked=selected.has(option.value));
  }
  async function loadResume(){
    if(!resumeForm)return;
    if(!userId){resumeForm.querySelectorAll("input,textarea,select,button").forEach(x=>x.disabled=true);$("resumeSaveStatus").textContent="Rezyumeni yaratish uchun avval IDEA LAB akkauntiga kiring.";return;}
    const r=await data.getMyJobSeekerProfile();
    if(!r.ok){$("resumeSaveStatus").textContent=errorText(r);return;}
    const profile=Array.isArray(r.data)?r.data[0]:r.data;
    if(profile){fillResume(profile);$("resumeSaveStatus").textContent="Saqlangan rezyume yuklandi.";}
    else $("resumeSaveStatus").textContent="Rezyumeni to‘ldirib saqlang — mos vakansiyalar shundan keyin ko‘rinadi.";
  }
  async function saveResume(event){
    event.preventDefault();
    if(!userId){location.href="auth.html?next=career.html";return;}
    const types=Array.from($("resumeEmploymentTypes").querySelectorAll('input[type="checkbox"]:checked')).map(x=>x.value);
    const input={
      fullName:clean($("resumeFullName").value),
      city:clean($("resumeCity").value),
      desiredRoles:splitTags($("resumeRoles").value,8),
      skills:splitTags($("resumeSkills").value,30),
      experienceYears:Number($("resumeYears").value||0),
      experienceSummary:clean($("resumeExperience").value),
      educationSummary:clean($("resumeEducation").value),
      minSalary:$("resumeMinSalary").value,
      maxSalary:$("resumeMaxSalary").value,
      employmentTypes:types.length?types:["full_time"],
      availabilityStatus:$("resumeAvailability").value
    };
    if(!input.desiredRoles.length){$("resumeSaveStatus").textContent="Kamida bitta kasb yoki lavozimni kiriting.";return;}
    const min=Number(input.minSalary||0),max=Number(input.maxSalary||0);
    if(input.minSalary!==""&&input.maxSalary!==""&&min>max){$("resumeSaveStatus").textContent="Maosh oralig‘ida eng kam qiymat yuqori qiymatdan oshmasligi kerak.";return;}
    const button=resumeForm.querySelector('[type="submit"]');button.disabled=true;
    $("resumeSaveStatus").textContent="Rezyume saqlanmoqda…";
    const r=await data.upsertJobSeekerProfile(input);
    button.disabled=false;
    if(!r.ok){$("resumeSaveStatus").textContent=errorText(r);return;}
    $("resumeSaveStatus").textContent="Rezyume muvaffaqiyatli saqlandi.";
    await loadMatches();
  }
  async function loadMatches(){
    if(!matchBox)return;
    matchBox.replaceChildren();
    if(!userId){empty(matchBox,"Mos vakansiyalarni ko‘rish uchun tizimga kiring va rezyume yarating.");return;}
    const r=await data.listMatchingJobs();
    if(!r.ok){empty(matchBox,errorText(r));return;}
    if(!r.data?.length){empty(matchBox,"Hozircha rezyumengizga mos haqiqiy vakansiya topilmadi. Yangi e’lonlar joylashtirilganda shu yerda ko‘rinadi.");return;}
    r.data.forEach(job=>{
      const reasons=Array.isArray(job.match_reasons)?job.match_reasons.join(" • "):"";
      const node=card(job.title,[job.company_name,locationLabel(job),employmentType(job.employment_type),job.schedule_label||"",job.experience_years_min>0?"Eng kam tajriba: "+job.experience_years_min+" yil":"Tajriba shart emas",job.required_skills?.length?"Kerakli ko‘nikmalar: "+job.required_skills.join(", "):"",job.salary_label||"Maosh: kelishiladi",reasons]);
      const contact=contactBlock(job);if(contact)node.append(contact);
      const score=document.createElement("p");score.className="notice";score.textContent="Moslik: "+Number(job.match_score||0)+"% — bu yo‘naltiruvchi baho, ishga qabul qilish kafolati emas.";node.append(score);
      const actions=document.createElement("div");actions.className="card-actions";
      const apply=document.createElement("button");apply.className="btn green career-apply-action";apply.type="button";const alreadyApplied=appliedJobIds.has(job.id);apply.textContent=alreadyApplied?"Ariza yuborilgan":userId?"Ariza yuborish":"Kirish orqali ariza yuborish";apply.disabled=alreadyApplied;apply.hidden=activeMode==="employer";
      apply.addEventListener("click",()=>{if(!userId){location.href="auth.html?next=career.html";return;}selectedJob=job;$("ilApplyTitle").textContent=job.title+" — ariza";$("ilApplyMessage").value="";applicationPanel.hidden=false;applicationPanel.scrollIntoView({behavior:"smooth",block:"center"});});
      actions.append(apply);node.append(actions);matchBox.append(node);
    });
  }
  async function loadModeration(){
    const panel=$("moderationPanel"),orgBox=$("moderationOrganizations"),jobBox=$("moderationJobs");
    if(!panel||!orgBox||!jobBox||!userId)return;
    const access=await data.isJobModerator();
    if(!access.ok||access.data!==true){panel.hidden=true;return;}
    panel.hidden=false;
    const orgResult=await data.listPendingOrganizations();
    orgBox.replaceChildren();
    if(!orgResult.ok)empty(orgBox,errorText(orgResult));
    else if(!orgResult.data?.length)empty(orgBox,"Tekshiruv navbatida tashkilot yo‘q.");
    else orgResult.data.forEach(org=>{
      const node=card(org.name,[org.organization_type,org.location_label||"Hudud ko‘rsatilmagan",org.description,org.website_url||"", "Yuborilgan: "+new Date(org.created_at).toLocaleString("uz-UZ")]);
      const actions=document.createElement("div");actions.className="card-actions";
      const approveButton=document.createElement("button");approveButton.className="btn";approveButton.type="button";approveButton.textContent="Tasdiqlash";
      approveButton.addEventListener("click",async()=>{approveButton.disabled=true;const reviewed=await data.reviewOrganization(org.organization_id,true);if(!reviewed.ok||reviewed.data!==true){alert(errorText(reviewed));approveButton.disabled=false;return;}await loadModeration();await loadOrganizations();});
      actions.append(approveButton);
      node.append(actions);orgBox.append(node);
    });
    const jobResult=await data.listPendingJobPosts();
    jobBox.replaceChildren();
    if(!jobResult.ok)empty(jobBox,errorText(jobResult));
    else if(!jobResult.data?.length)empty(jobBox,"Tekshiruv navbatida vakansiya yo‘q.");
    else jobResult.data.forEach(job=>{
      const node=card(job.title,[job.company_name,job.location_label,employmentType(job.employment_type),job.schedule_label||"",job.experience_years_min>0?"Eng kam tajriba: "+job.experience_years_min+" yil":"Tajriba shart emas",job.required_skills?.length?"Ko‘nikmalar: "+job.required_skills.join(", "):"",job.salary_label||"Maosh: kelishiladi",job.description,"Yuborilgan: "+new Date(job.created_at).toLocaleString("uz-UZ")]);
      const actions=document.createElement("div");actions.className="card-actions";
      [["Vakansiyani tasdiqlash",true],["Rad etish",false]].forEach(([label,approve])=>{
        const button=document.createElement("button");button.className="btn";button.type="button";button.textContent=label;
        button.addEventListener("click",async()=>{button.disabled=true;const reviewed=await data.reviewJobPost(job.job_post_id,approve);if(!reviewed.ok||reviewed.data!==true){alert(errorText(reviewed));button.disabled=false;return;}await loadModeration();await loadJobs();await loadOwnedJobs();});
        actions.append(button);
      });
      node.append(actions);jobBox.append(node);
    });
  }
  async function loadJobs(){
    setStatus("Barcha faol vakansiyalar yuklanmoqda…");
    const pageSize=50;let offset=0,all=[];
    while(true){
      const r=await data.listPublicJobPosts({limit:pageSize,offset});
      if(!r.ok){setStatus(errorText(r),true);jobs=[];renderJobs();return;}
      const page=Array.isArray(r.data)?r.data:[];
      all=all.concat(page);
      if(page.length<pageSize)break;
      offset+=pageSize;
    }
    jobs=all;
    setStatus("Barcha faol vakansiyalar katalogi yangilandi.");
    renderJobs();
  }
  async function loadOrganizations(){
    const select=$("jobOrganization");if(!select)return;
    select.replaceChildren(new Option("Tashkilotni tanlang",""));
    const statusBox=$("employerOrgStatus");if(statusBox)statusBox.replaceChildren();
    const orgHelp=$("jobOrganizationHelp");if(orgHelp){orgHelp.hidden=false;orgHelp.textContent="Vakansiya joylash uchun faol tashkilot kerak. Tashkilot profili avtomatik faollashadi; vakansiya alohida tekshiriladi."; }
    if(!userId){select.disabled=true;if(statusBox)empty(statusBox,"Tashkilot holatini ko‘rish uchun akkauntga kiring.");if(orgHelp)orgHelp.textContent="Avval akkauntga kiring, keyin tashkilot profilini yarating.";return;}
    const r=await data.listMyOrganizations();
    if(!r.ok){select.disabled=true;setStatus(errorText(r),true);if(statusBox)empty(statusBox,errorText(r));return;}
    const all=Array.isArray(r.data)?r.data:[];
    const organizations=all.filter(x=>x.organization_type!=="team"&&x.visibility==="public"&&x.status==="active");
    organizations.forEach(org=>select.add(new Option(org.name,org.id)));
    select.disabled=false;
    if(statusBox){
      if(!all.length)empty(statusBox,"Hali ish beruvchi tashkilot profilingiz yo‘q.");
      all.forEach(org=>{
        const labels={draft:"Qoralama",pending_review:"Tekshiruvda",active:"Faol — avtomatik",rejected:"Rad etilgan",archived:"Arxivlangan"};
        const details=["Holat: "+(labels[org.status]||org.status),org.location_label||"Hudud ko‘rsatilmagan"];
        if(org.status==="active")details.push("Avtomatik faollashtirilgan; bu yuridik tekshiruvdan o‘tganini anglatmaydi.");
        statusBox.append(card(org.name,details));
      });
    }
    if(!organizations.length){
      select.add(new Option("Faol tashkilot yo‘q",""));
      select.disabled=true;
      const message=all.some(x=>x.status==="pending_review")
        ?"Tashkilot profilingiz tekshiruvda. Tashkilot faollashgach vakansiya joylashtirish ochiladi."
         :"Avval tashkilot profilini yarating. U avtomatik faollashadi; faol tashkilotdan joylangan vakansiya darhol e’lon qilinadi.";
      formHint.textContent=message;
      if(orgHelp)orgHelp.textContent=message+" Quyidagi “Tashkilot yaratish” tugmasi orqali davom eting.";
    }else{select.disabled=false;if(orgHelp)orgHelp.textContent="Tashkilotni tanlang, keyin vakansiya ma’lumotlarini to‘ldiring.";}
  }
  async function createEmployerOrganization(event){
    event.preventDefault();
    if(!userId){location.href="auth.html?next=career.html";return;}
    const input={
      name:clean($("employerOrgName").value),
      location:clean($("employerOrgLocation").value),
      description:clean($("employerOrgDescription").value),
      websiteUrl:clean($("employerOrgWebsite").value),
      type:"company",visibility:"public"
    };
    const button=employerOrgForm.querySelector('[type="submit"]');button.disabled=true;
    setStatus("Tashkilot ma’lumotlari saqlanmoqda…");
    const submitted=await data.createActiveOrganization(input);
    button.disabled=false;
    if(!submitted.ok){
      setStatus(errorText(submitted),true);
      await loadOrganizations();return;
    }
    const organizationId=typeof submitted.data==="string"?submitted.data:submitted.data?.id;
    if(!organizationId){
      setStatus("Tashkilot yuborildi, lekin ID qaytmadi. Kabinetdan holatini tekshiring.",true);
      await loadOrganizations();return;
    }
    employerOrgForm.reset();
    setStatus("Tashkilot avtomatik faollashtirildi. Bu yuridik tekshiruvdan o‘tganini anglatmaydi; vakansiyalar alohida tekshiruvdan o‘tadi.");
    await loadOrganizations();
  }
  async function loadMyApplications(){
    const box=$("ilMyJobApplications");box.replaceChildren();
    if(!userId){if($("jobApplicationCount"))$("jobApplicationCount").textContent="0";empty(box,"Arizalaringizni ko‘rish uchun akkauntga kiring.");return;}
    const r=await data.listMyJobApplications();
    if(!r.ok){if($("jobApplicationCount"))$("jobApplicationCount").textContent="0";empty(box,errorText(r));return;}
    appliedJobIds=new Set((Array.isArray(r.data)?r.data:[]).map(item=>item.job_post_id).filter(Boolean));
    renderJobs();
    if($("jobApplicationCount"))$("jobApplicationCount").textContent=String((r.data||[]).length);
    if(!r.data?.length){empty(box,"Hozircha ish vakansiyalariga ariza yubormagansiz.");return;}
    r.data.forEach(item=>{
      const node=card(item.job_title,[item.company_name,"Holat: "+(statusLabels[item.status]||item.status),"Yuborilgan: "+new Date(item.submitted_at).toLocaleString("uz-UZ")]);
      if(item.status==="submitted"){
        const button=document.createElement("button");button.className="btn secondary";button.type="button";button.textContent="Arizani qaytarib olish";
        button.addEventListener("click",async()=>{button.disabled=true;const x=await data.withdrawJobApplication(item.application_id);if(!x.ok||x.data!==true){alert(errorText(x));button.disabled=false;return;}await loadMyApplications();await loadMyActivity();});
        node.append(button);
      }
      const historyButton=document.createElement("button");historyButton.className="btn secondary";historyButton.type="button";historyButton.textContent="Ariza tarixi";
      const historyPanel=document.createElement("div");historyPanel.className="form-panel";historyPanel.hidden=true;
      historyButton.addEventListener("click",async()=>{historyPanel.hidden=!historyPanel.hidden;if(historyPanel.hidden||historyPanel.dataset.loaded==="true")return;historyButton.disabled=true;const h=await data.listJobApplicationStatusHistory(item.application_id);historyButton.disabled=false;if(!h.ok){empty(historyPanel,errorText(h));return;}const entries=Array.isArray(h.data)?h.data:[];if(!entries.length){empty(historyPanel,"Ariza statusi bo‘yicha tarix hali mavjud emas.");historyPanel.dataset.loaded="true";return;}entries.forEach(entry=>historyPanel.append(card("Status o‘zgarishi",[entry.old_status?(statusLabels[entry.old_status]||entry.old_status):"Ariza yaratildi","Yangi: "+(statusLabels[entry.new_status]||entry.new_status),new Date(entry.changed_at).toLocaleString("uz-UZ")])));historyPanel.dataset.loaded="true";});
      node.append(historyButton,historyPanel);
      box.append(node);
    });
  }
  async function loadMyActivity(){
    const box=$("ilMyJobActivity");if(!box)return;
    box.replaceChildren();
    if(!userId){empty(box,"Bildirishnomalarni ko‘rish uchun akkauntga kiring.");return;}
    const r=await data.listMyJobActivity();
    if(!r.ok){empty(box,errorText(r));return;}
    if(!r.data?.length){empty(box,"Hozircha yangi bildirishnoma yo‘q.");return;}
    r.data.forEach(item=>{
      const labels={submitted:"Yangi ariza kelib tushdi",interview:"Suhbatga taklif qilindingiz",accepted:"Arizangiz qabul qilindi",declined:"Arizangiz rad etildi",withdrawn:"Ariza qaytarib olindi"};
      const node=card(item.job_title||"Ish arizasi",[item.company_name||"Ish beruvchi",labels[item.to_status]||"Ariza holati: "+item.to_status,new Date(item.created_at).toLocaleString("uz-UZ"),item.read_at?"O‘qilgan":"Yangi bildirishnoma"]);
      if(!item.read_at){
        const button=document.createElement("button");button.className="btn secondary";button.type="button";button.textContent="O‘qildi deb belgilash";
        button.addEventListener("click",async()=>{button.disabled=true;const x=await data.markJobActivityRead(item.activity_id);if(!x.ok){alert(errorText(x));button.disabled=false;return;}await loadMyActivity();});
        node.append(button);
      }
      box.append(node);
    });
  }
  let centralApplicationsCache=[];
  async function renderEmployerDailyDashboard(){
    const followBox=$("ilEmployerFollowups"),interviewBox=$("ilEmployerInterviewCandidates"),contactedBox=$("ilEmployerContactedCandidates");
    if(!followBox||!interviewBox||!contactedBox)return;
    followBox.replaceChildren();interviewBox.replaceChildren();contactedBox.replaceChildren();
    if(!userId){empty(followBox,"Kunlik nazorat uchun ish beruvchi akkauntiga kiring.");empty(interviewBox,"Suhbatdagi nomzodlar ko‘rinmaydi.");empty(contactedBox,"Bog‘lanilgan nomzodlar ko‘rinmaydi.");return;}
    const interviews=centralApplicationsCache.filter(item=>item.status==="interview");
    if(!interviews.length)empty(interviewBox,"Suhbat bosqichida nomzod yo‘q.");
    interviews.forEach(item=>interviewBox.append(card(item.candidate_name||"Nomzod",[item.job_title||"Vakansiya",item.company_name||"Ish beruvchi","Holat: Suhbatga taklif"])));
    const today=new Date();today.setHours(0,0,0,0);
    const followups=[],contacted=[];
    for(const item of centralApplicationsCache){
      const result=await data.getEmployerApplicationNote(item.application_id);
      if(!result.ok)continue;
      const note=Array.isArray(result.data)?result.data[0]:result.data;
      if(note?.contacted_at){contacted.push({item,note});continue;}
      const date=note?.next_contact_date;
      if(!date)continue;
      const dateKey=String(date).slice(0,10),dateValue=new Date(dateKey+"T00:00:00"),diff=Math.round((dateValue-today)/86400000);
      followups.push({item,note,dateKey,diff});
    }
    followups.sort((a,b)=>a.diff-b.diff);
    const due=followups.filter(x=>x.diff<=0),upcoming=followups.filter(x=>x.diff>0);
    if(!due.length)empty(followBox,"Bugun yoki muddati o‘tgan qayta bog‘lanish vazifasi yo‘q.");
    due.forEach(({item,note,dateKey,diff})=>{
      const label=diff<0?"Muddati o‘tgan: "+Math.abs(diff)+" kun":"Bugun bog‘lanish";
      const node=card(item.candidate_name||"Nomzod",[item.job_title||"Vakansiya",item.company_name||"",label,"Sana: "+dateKey,note?.note||""]);
      const actions=document.createElement("div");actions.className="card-actions";
      const open=document.createElement("button");open.className="btn secondary";open.type="button";open.textContent="Ichki qaydga o‘tish";
      open.addEventListener("click",()=>{const search=$("ilCentralApplicationSearch");if(search){search.value=item.candidate_name||"";renderCentralApplications();$("ilCentralApplications")?.scrollIntoView({behavior:"smooth",block:"center"});}});
      const done=document.createElement("button");done.className="btn green";done.type="button";done.textContent="Bog‘lanildi";
      done.addEventListener("click",async()=>{done.disabled=true;done.textContent="Saqlanmoqda…";const result=await data.markEmployerApplicationContacted(item.application_id);if(!result.ok||result.data!==true){alert(errorText(result));done.disabled=false;done.textContent="Bog‘lanildi";return;}await renderEmployerDailyDashboard();});
      actions.append(open,done);node.append(actions);followBox.append(node);
    });
    if(upcoming.length){const heading=document.createElement("h4");heading.textContent="Kelgusi bog‘lanishlar";followBox.append(heading);upcoming.forEach(({item,note,dateKey,diff})=>followBox.append(card(item.candidate_name||"Nomzod",[item.job_title||"Vakansiya",item.company_name||"","Rejalashtirilgan: "+dateKey,diff+" kun qoldi",note?.note||""])));}
    if(!contacted.length)empty(contactedBox,"Hali bog‘lanilgan deb belgilangan nomzod yo‘q.");
    contacted.forEach(({item,note})=>contactedBox.append(card(item.candidate_name||"Nomzod",[item.job_title||"Vakansiya",item.company_name||"","Bog‘lanilgan: "+new Date(note.contacted_at).toLocaleString("uz-UZ"),note.note||""])));
  }
  function renderCentralApplications(){
    const box=$("ilCentralApplications");if(!box)return;box.replaceChildren();
    const query=clean($("ilCentralApplicationSearch")?.value).toLowerCase();
    const status=clean($("ilCentralApplicationStatus")?.value);
    const rows=centralApplicationsCache.filter(item=>(!status||item.status===status)&&(!query||[item.candidate_name,item.job_title,item.company_name,item.candidate_city].some(value=>String(value||"").toLowerCase().includes(query))));const sortMode=clean($("ilCentralApplicationSort")?.value)||"newest";const statusRank={interview:0,submitted:1,accepted:2,declined:3,withdrawn:4};rows.sort((a,b)=>{if(sortMode==="oldest")return new Date(a.submitted_at||0)-new Date(b.submitted_at||0);if(sortMode==="candidate")return clean(a.candidate_name).localeCompare(clean(b.candidate_name),"uz");if(sortMode==="interview_first")return (statusRank[a.status]??9)-(statusRank[b.status]??9)||new Date(b.submitted_at||0)-new Date(a.submitted_at||0);return new Date(b.submitted_at||0)-new Date(a.submitted_at||0);});
    const counts={submitted:0,interview:0,accepted:0,declined:0,withdrawn:0};centralApplicationsCache.forEach(item=>{if(counts[item.status]!=null)counts[item.status]++;});
    const summary=document.createElement("p");summary.className="notice";summary.textContent="Jami: "+centralApplicationsCache.length+" | Yangi: "+counts.submitted+" | Suhbat: "+counts.interview+" | Qabul: "+counts.accepted+" | Rad: "+counts.declined+" | Qaytarilgan: "+counts.withdrawn;box.append(summary);
    if(!rows.length){empty(box,"Tanlangan filtr bo‘yicha arizalar topilmadi.");return;}
    rows.forEach(item=>{
      const labels={submitted:"Yangi / ko‘rib chiqilmoqda",interview:"Suhbatga taklif",accepted:"Qabul qilindi",declined:"Rad etildi",withdrawn:"Qaytarib olindi"};
      const node=card(item.candidate_name||"Nomzod",[item.job_title||"Vakansiya",item.company_name||"Ish beruvchi",item.candidate_city||"",item.candidate_roles?.length?"Kasblar: "+item.candidate_roles.join(", "):"",item.candidate_skills?.length?"Ko‘nikmalar: "+item.candidate_skills.join(", "):"",item.candidate_experience_years!=null?"Tajriba: "+item.candidate_experience_years+" yil":"",item.candidate_experience_summary||"",item.candidate_education_summary||"", "Holat: "+(labels[item.status]||item.status),item.message||"", "Yuborilgan: "+new Date(item.submitted_at).toLocaleString("uz-UZ")]);
      const noteToggle=document.createElement("button");noteToggle.className="btn secondary";noteToggle.type="button";noteToggle.textContent="Ichki qaydlar";
      const notePanel=document.createElement("div");notePanel.className="form-panel";notePanel.hidden=true;
      notePanel.innerHTML='<h4>Ish beruvchi uchun ichki qayd</h4><div class="field"><label>Qayd (faqat sizga ko‘rinadi)</label><textarea class="ilEmployerCandidateNote" maxlength="3000" rows="4" placeholder="Suhbat natijasi, keyingi qadam, eslatmalar…"></textarea></div><div class="field"><label>Keyingi bog‘lanish sanasi</label><input class="ilEmployerCandidateNextDate" type="date"></div><p class="notice">Bu qayd boshqa ish beruvchilarga yoki nomzodga ko‘rinmaydi.</p><div class="card-actions"><button class="btn green ilSaveEmployerNote" type="button">Qaydni saqlash</button></div>';
      const noteText=notePanel.querySelector(".ilEmployerCandidateNote"),noteDate=notePanel.querySelector(".ilEmployerCandidateNextDate"),noteSave=notePanel.querySelector(".ilSaveEmployerNote");
      noteToggle.addEventListener("click",async()=>{notePanel.hidden=!notePanel.hidden;if(notePanel.hidden||notePanel.dataset.loaded==="true")return;noteToggle.disabled=true;const existing=await data.getEmployerApplicationNote(item.application_id);noteToggle.disabled=false;if(!existing.ok){alert(errorText(existing));return;}const note=Array.isArray(existing.data)?existing.data[0]:existing.data;if(note){noteText.value=note.note||"";noteDate.value=note.next_contact_date||"";}notePanel.dataset.loaded="true";});
      noteSave.addEventListener("click",async()=>{noteSave.disabled=true;noteSave.textContent="Saqlanmoqda…";const saved=await data.saveEmployerApplicationNote({applicationId:item.application_id,note:noteText.value,nextContactDate:noteDate.value});if(!saved.ok||saved.data!==true){alert(errorText(saved));noteSave.disabled=false;noteSave.textContent="Qaydni saqlash";return;}noteSave.textContent="Saqlandi";noteSave.disabled=false;notePanel.dataset.loaded="true";});
      node.append(noteToggle,notePanel);
      const historyToggle=document.createElement("button");historyToggle.className="btn secondary";historyToggle.type="button";historyToggle.textContent="Ariza tarixi";
      const historyPanel=document.createElement("div");historyPanel.className="form-panel";historyPanel.hidden=true;
      historyToggle.addEventListener("click",async()=>{historyPanel.hidden=!historyPanel.hidden;if(historyPanel.hidden||historyPanel.dataset.loaded==="true")return;historyToggle.disabled=true;const h=await data.listJobApplicationStatusHistory(item.application_id);historyToggle.disabled=false;if(!h.ok){empty(historyPanel,errorText(h));return;}const entries=Array.isArray(h.data)?h.data:[];if(!entries.length){empty(historyPanel,"Status o‘zgarishlari tarixi yo‘q.");historyPanel.dataset.loaded="true";return;}entries.forEach(entry=>historyPanel.append(card("Status o‘zgarishi",[entry.old_status?(labels[entry.old_status]||entry.old_status):"Ariza yaratildi","Yangi: "+(labels[entry.new_status]||entry.new_status),new Date(entry.changed_at).toLocaleString("uz-UZ")])));historyPanel.dataset.loaded="true";});
      node.append(historyToggle,historyPanel);
      if(item.status==="submitted"||item.status==="interview"){
        const actions=document.createElement("div");actions.className="card-actions";
        (item.status==="submitted"?[["Suhbatga taklif","interview"],["Qabul qilish","accepted"],["Rad etish","declined"]]:[["Qabul qilish","accepted"],["Rad etish","declined"]]).forEach(([label,nextStatus])=>{
          const button=document.createElement("button");button.className="btn";button.type="button";button.textContent=label;
          button.addEventListener("click",async()=>{button.disabled=true;const result=await data.reviewJobApplication(item.application_id,nextStatus);if(!result.ok||result.data!==true){alert(errorText(result));button.disabled=false;return;}await loadOwnedJobs();});
          actions.append(button);
        });node.append(actions);
      }
      box.append(node);
    });
  }
  $("ilCentralApplicationSearch")?.addEventListener("input",renderCentralApplications);
  $("ilCentralApplicationStatus")?.addEventListener("change",renderCentralApplications);$("ilCentralApplicationSort")?.addEventListener("change",renderCentralApplications);
  async function loadOwnedJobs(){
    const box=$("ilMyJobPosts"),requests=$("ilJobOwnerApplications");box.replaceChildren();requests.replaceChildren();
    if(!userId){empty(box,"Vakansiyalarni boshqarish uchun akkauntga kiring.");empty(requests,"Ish beruvchi kabineti uchun akkauntga kiring.");ownedJobs=[];centralApplicationsCache=[];renderCentralApplications();updateCounts();return;}
    const r=await data.listMyJobPosts();
    if(!r.ok){empty(box,errorText(r));ownedJobs=[];return;}
    ownedJobs=Array.isArray(r.data)?r.data:[];
    centralApplicationsCache=[];
    const appResults=await Promise.all(ownedJobs.filter(job=>job.status==="published"||job.status==="closed").map(async job=>{const apps=await data.listJobPostApplications(job.job_post_id);return apps.ok&&Array.isArray(apps.data)?apps.data.map(item=>({...item,job_title:job.title,company_name:job.company_name})):[]}));
    centralApplicationsCache=appResults.flat();renderCentralApplications();await renderEmployerDailyDashboard();
    if(!ownedJobs.length)empty(box,"Siz hali vakansiya joylashtirmagansiz.");
    for(const job of ownedJobs){
      const labels={pending_review:"Tekshiruvda",published:"Ochiq",closed:"Yopilgan",rejected:"Rad etilgan"};
      const node=card(job.title,[job.company_name,job.location_label,employmentType(job.employment_type),job.schedule_label||"",job.experience_years_min>0?"Eng kam tajriba: "+job.experience_years_min+" yil":"Tajriba shart emas",job.required_skills?.length?"Ko‘nikmalar: "+job.required_skills.join(", "):"","Holat: "+(labels[job.status]||job.status)]);
      const currentContact=contactBlock(job);if(currentContact)node.append(currentContact);
      const contactEditor=document.createElement("div");contactEditor.className="form-panel";contactEditor.hidden=true;
      contactEditor.innerHTML='<h4>Aloqa ma’lumotlarini yangilash</h4><div class="field"><label>Mas’ul shaxs ismi</label><input class="ilEditContactName" required minlength="2" maxlength="120"></div><div class="field"><label>Ish telefoni</label><input class="ilEditContactPhone" type="tel" required maxlength="20" placeholder="+998 90 123 45 67"></div><p class="notice">Saqlangandan keyin ism va telefon ochiq vakansiya e’lonida ko‘rinadi.</p><div class="card-actions"><button class="btn green ilSaveContact" type="button">Saqlash</button><button class="btn secondary ilCancelContact" type="button">Bekor qilish</button></div>';
      contactEditor.querySelector(".ilEditContactName").value=job.contact_name||"";
      contactEditor.querySelector(".ilEditContactPhone").value=job.contact_phone||"";
      const editContact=document.createElement("button");editContact.className="btn secondary";editContact.type="button";editContact.textContent="Aloqa ma’lumotlarini tahrirlash";
      editContact.addEventListener("click",()=>{contactEditor.hidden=!contactEditor.hidden;});
      contactEditor.querySelector(".ilCancelContact").addEventListener("click",()=>{contactEditor.hidden=true;});
      contactEditor.querySelector(".ilSaveContact").addEventListener("click",async()=>{
        const save=contactEditor.querySelector(".ilSaveContact"),name=contactEditor.querySelector(".ilEditContactName").value.trim(),phone=contactEditor.querySelector(".ilEditContactPhone").value.trim();
        save.disabled=true;save.textContent="Saqlanmoqda…";
        const result=await data.updateJobPostContact({jobPostId:job.job_post_id,contactName:name,contactPhone:phone});
        if(!result.ok||result.data!==true){alert(errorText(result));save.disabled=false;save.textContent="Saqlash";return;}
        await loadJobs();await loadOwnedJobs();
      });
      node.append(editContact,contactEditor);
      const actions=document.createElement("div");actions.className="card-actions";
      if(job.status!=="rejected"){
        const toggle=document.createElement("button");toggle.className="btn";toggle.type="button";
        toggle.textContent=job.status==="published"?"Vakansiyani yopish":job.status==="pending_review"?"Darhol e’lon qilish":"Vakansiyani qayta ochish";
        toggle.addEventListener("click",async()=>{
          toggle.disabled=true;
          const nextStatus=job.status==="published"?"closed":"published";
          const x=await data.updateJobPostStatus(job.job_post_id,nextStatus);
          if(!x.ok||x.data!==true){alert(errorText(x));toggle.disabled=false;return;}
          await loadJobs();await loadOwnedJobs();
        });
        actions.append(toggle);
      }
      if(job.status==="published"||job.status==="closed"){
        const view=document.createElement("button");view.className="btn secondary";view.type="button";view.textContent="Arizalarni ko‘rish";
        view.addEventListener("click",async()=>{view.disabled=true;await loadApplicationsFor(job,requests);view.disabled=false;});
        actions.append(view);
      }
      if(actions.childNodes.length)node.append(actions);box.append(node);
    }
    updateCounts();
    if(!ownedJobs.length)empty(requests,"Hozircha ko‘rib chiqiladigan arizalar yo‘q.");
  }
  async function loadApplicationsFor(job,box){
    box.replaceChildren();
    const r=await data.listJobPostApplications(job.job_post_id);
    if(!r.ok){empty(box,errorText(r));return;}
    const applications=Array.isArray(r.data)?r.data:[];
    if(!applications.length){empty(box,"Bu vakansiya uchun hali ariza kelib tushmagan.");return;}
    applications.forEach(item=>{
      const statusLabels={submitted:"Ko‘rib chiqilmoqda",accepted:"Qabul qilindi",declined:"Rad etildi",withdrawn:"Qaytarib olindi"};
      const candidateLines=[
        item.candidate_city||"",
        item.candidate_roles?.length?"Kasblar: "+item.candidate_roles.join(", "):"",
        item.candidate_skills?.length?"Ko‘nikmalar: "+item.candidate_skills.join(", "):"",
        item.candidate_experience_years!=null?"Tajriba: "+item.candidate_experience_years+" yil":"",
        item.candidate_experience_summary||"",
        item.candidate_education_summary||"",
        "Ariza holati: "+(statusLabels[item.status]||item.status),
        "Ariza xabari: "+item.message,
        "Yuborilgan: "+new Date(item.submitted_at).toLocaleString("uz-UZ")
      ];
      const node=card(item.candidate_name||"Nomzod",candidateLines);
      if(item.status==="submitted"||item.status==="interview"){
        const actions=document.createElement("div");actions.className="card-actions";
        (item.status==="submitted"?[["Suhbatga taklif","interview"],["Qabul qilish","accepted"],["Rad etish","declined"]]:[["Qabul qilish","accepted"],["Rad etish","declined"]]).forEach(([label,status])=>{
          const button=document.createElement("button");button.className="btn";button.type="button";button.textContent=label;
          button.addEventListener("click",async()=>{button.disabled=true;const x=await data.reviewJobApplication(item.application_id,status);if(!x.ok||x.data!==true){alert(errorText(x));button.disabled=false;return;}await loadApplicationsFor(job,box);});
          actions.append(button);
        });
        node.append(actions);
      }
      box.append(node);
    });
  }
  async function createJob(event){
    event.preventDefault();
    if(!userId){alert("Vakansiya joylashtirish uchun avval akkauntga kiring.");location.href="auth.html?next=career.html";return;}
    const input={
      organizationId:clean($("jobOrganization")?.value),
      title:clean($("jobTitle")?.value),
      openingsCount:Number($("jobOpenings")?.value||1),
      salary:clean($("jobSalary")?.value),
      location:clean($("jobLocation")?.value),
      region:clean($("jobRegion")?.value),
      district:clean($("jobDistrict")?.value),
      employmentType:({ "To‘liq ish kuni":"full_time","Yarim stavka":"part_time","Masofaviy":"remote","Amaliyot":"internship","Frilans":"freelance" })[clean($("jobType")?.value)]||"full_time",
      requiredSkills:splitTags($("jobSkills")?.value,20),
      experienceYearsMin:Number($("jobExperienceYears")?.value||0),
      schedule:clean($("jobSchedule")?.value),
      description:clean($("jobDescription")?.value),
      contactName:clean($("jobContactName")?.value),
      contactPhone:clean($("jobContactPhone")?.value)
    };
    if(!input.organizationId){alert("Avval o‘zingizga tegishli tashkilotni tanlang.");return;}
    const contactDigits=input.contactPhone.replace(/\D/g,"");
    if(input.contactName.length<2){alert("Aloqa uchun mas’ul shaxs ismini kiriting.");return;}
    if(!/^998[0-9]{9}$/.test(contactDigits)){alert("Telefon raqamini +998 90 123 45 67 formatida kiriting.");return;}
    const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
    setStatus("Vakansiya serverga joylanmoqda…");
    const r=await data.createJobPost(input);
    if(!r.ok){setStatus(errorText(r),true);if(submit)submit.disabled=false;return;}
    form.reset();if($("jobFormPanel"))$("jobFormPanel").hidden=true;if(submit)submit.disabled=false;
    setStatus("Vakansiya muvaffaqiyatli joylandi va ochiq katalogda avtomatik e’lon qilindi.");
    await loadJobs();await loadOwnedJobs();
  }
  document.addEventListener("submit",async event=>{
    if(event.target?.id==="employerOrgForm"){
      event.preventDefault();event.stopImmediatePropagation();
      try{await createEmployerOrganization(event);}
      catch(error){const button=employerOrgForm.querySelector('[type="submit"]');if(button)button.disabled=false;setStatus("Tashkilot yuborilmadi. Internetni tekshirib, qayta urinib ko‘ring.",true);}
      return;
    }
    if(event.target?.id==="jobSeekerResumeForm"){
      event.preventDefault();event.stopImmediatePropagation();
      try{await saveResume(event);}
      catch(error){const button=resumeForm.querySelector('[type="submit"]');if(button)button.disabled=false;$("resumeSaveStatus").textContent="Rezyumeni saqlashda xatolik yuz berdi. Qayta urinib ko‘ring.";}
      return;
    }
    if(event.target?.id==="jobForm"){
      event.preventDefault();event.stopImmediatePropagation();
      try{await createJob(event);}
      catch(error){const button=form.querySelector('[type="submit"]');if(button)button.disabled=false;setStatus("Vakansiya joylanmadi. Internetni tekshirib, qayta urinib ko‘ring.",true);}
      return;
    }
    if(event.target?.id==="ilApplyForm"){
      event.preventDefault();event.stopImmediatePropagation();
      if(!selectedJob)return;
      const message=clean($("ilApplyMessage").value);
      const feedback=$("ilApplyFeedback");feedback.hidden=false;feedback.textContent="";feedback.style.borderColor="";
      const button=event.target.querySelector('[type="submit"]');button.disabled=true;
      const originalText=button.textContent;button.textContent="Yuborilmoqda…";
      try{
        const r=await data.applyJobPost(selectedJob.id,message);
        if(!r.ok){feedback.textContent=errorText(r);feedback.style.borderColor="rgba(255,100,124,.65)";return;}
        feedback.textContent="Arizangiz muvaffaqiyatli yuborildi. Holatini “Mening ish arizalarim” bo‘limidan kuzatishingiz mumkin.";
        feedback.style.borderColor="rgba(22,199,181,.35)";
        selectedJob=null;event.target.reset();await loadMyApplications();await loadMyActivity();await loadMatches();
      }catch(error){
        feedback.textContent="Ariza yuborishda vaqtinchalik xatolik yuz berdi. Internetni tekshirib, qayta urinib ko‘ring.";
        feedback.style.borderColor="rgba(255,100,124,.65)";
      }finally{
        button.disabled=false;button.textContent=originalText;
      }
    }
  },true);
  $("ilRefreshCareerData")?.addEventListener("click",async event=>{
    const button=event.currentTarget;button.disabled=true;button.textContent="Yangilanmoqda…";
    try{await Promise.all([loadJobs(),loadOwnedJobs(),loadMyApplications(),loadMyActivity(),loadMatches()]);}
    finally{button.disabled=false;button.textContent="Ma’lumotlarni yangilash";}
  });
  $("ilApplyCancel").addEventListener("click",()=>{applicationPanel.hidden=true;selectedJob=null;$("ilApplyFeedback").hidden=true;$("ilApplyFeedback").textContent="";});
  $("modeSeeker")?.addEventListener("click",()=>setCareerMode("seeker"));
  $("modeEmployer")?.addEventListener("click",()=>setCareerMode("employer"));
  setCareerMode("seeker");
  $("openEmployerOrg")?.addEventListener("click",()=>{if(!userId){location.href="auth.html?next=career.html";return;}$("employerOrgPanel").hidden=!$("employerOrgPanel").hidden;loadOrganizations();});
  $("cancelEmployerOrg")?.addEventListener("click",()=>{$("employerOrgPanel").hidden=true;});
  $("refreshMatches")?.addEventListener("click",loadMatches);
  document.addEventListener("input",event=>{
    if(["jobSearch","jobLocationFilter","jobSalaryFilter","jobSort"].includes(event.target?.id)){event.stopImmediatePropagation();renderJobs();}
  },true);
  document.addEventListener("change",event=>{
    if(event.target?.id==="jobFilter"){event.stopImmediatePropagation();renderJobs();}
  },true);

  async function start(){
    if(!auth||!data){setStatus("Backend modullari yuklanmagan. Sahifani yangilang.",true);return;}
    const configured=auth.getStatus()?.configured?{ok:true}:auth.configure(window.IDEALAB_CONFIG,window.supabase);
    if(!configured.ok){setStatus("Supabase konfiguratsiyasi yoki SDK yuklanmadi.",true);return;}
    const session=await auth.getSession();
    userId=session.ok?session.data?.session?.user?.id||null:null;
    await loadOrganizations();await loadJobs();await loadOwnedJobs();await loadMyApplications();await loadMyActivity();await loadResume();await loadMatches();await loadModeration();
  }
  start().catch(()=>setStatus("Karyera markazini yuklashda xatolik yuz berdi.",true));
})();
