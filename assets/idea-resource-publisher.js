/* IDEA LAB — server resource publishing */
(() => {
  "use strict";
  const data = window.IDEALAB_DATA;
  const auth = window.IDEALAB_AUTH;
  const section = document.querySelector('[aria-labelledby="publicResourceHeading"]');
  if (!section || !data || !auth) return;

  const panel = document.createElement("section");
  panel.className = "op-panel";
  panel.innerHTML = `
    <div class="op-row"><h2>Platformaga resurs taklifini joylash</h2><span class="op-pill">Server orqali</span></div>
    <p class="op-muted">Bu shakl ommaviy katalog uchun e’lon yaratadi. Shaxsiy inventar yozuvlari alohida saqlanadi.</p>
    <form id="serverResourceForm" class="op-form">
      <div class="op-field"><label for="srTitle">Taklif nomi *</label><input id="srTitle" maxlength="160" required></div>
      <div class="op-field"><label for="srCategory">Kategoriya *</label><select id="srCategory" required><option value="equipment">Jihoz</option><option value="materials">Material</option><option value="space">Xona / joy</option><option value="transport">Transport</option><option value="expertise">Mutaxassislik</option><option value="other">Boshqa</option></select></div>
      <div class="op-field"><label for="srQuantity">Miqdor / hajm</label><input id="srQuantity" maxlength="120" placeholder="Masalan: 5 dona"></div>
      <div class="op-field"><label for="srAvailability">Mavjudlik</label><input id="srAvailability" maxlength="120" placeholder="Masalan: hozir mavjud"></div>
      <div class="op-field"><label for="srLocation">Joylashuv</label><input id="srLocation" maxlength="160" placeholder="Shahar yoki hudud"></div>
      <div class="op-field"><label for="srTerms">Foydalanish shartlari</label><input id="srTerms" maxlength="1000"></div>
      <div class="op-field full"><label for="srDescription">Batafsil tavsif</label><textarea id="srDescription" maxlength="3000"></textarea></div>
      <div class="op-field full"><label><input id="srPublish" type="checkbox" style="width:auto;margin-right:7px">E’lonni darhol ommaviy katalogga chiqarish</label></div>
      <div class="op-field full"><button class="op-btn" type="submit">Serverda saqlash</button><p id="srStatus" class="op-muted" role="status" aria-live="polite"></p></div>
    </form>`;
  section.parentNode.insertBefore(panel, section);

  const $ = id => document.getElementById(id);
  const status = $("srStatus");
  function slugify(value) {
    const map = {"o‘":"o","o'":"o","g‘":"g","g'":"g","ў":"o","ғ":"g","қ":"q","ҳ":"h","ё":"yo","ж":"j","ч":"ch","ш":"sh","ц":"ts","ю":"yu","я":"ya"};
    let s = String(value || "").toLowerCase();
    Object.entries(map).forEach(([a,b]) => { s = s.split(a).join(b); });
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90);
  }
  async function refreshAuth() {
    const result = await auth.getSession();
    const form = $("serverResourceForm");
    if (!result.ok || !result.data || !result.data.session) {
      status.textContent = "E’lon joylash uchun avval IDEA LAB akkauntiga kiring.";
      form.querySelector("button[type=submit]").disabled = true;
      return false;
    }
    form.querySelector("button[type=submit]").disabled = false;
    status.textContent = "Akkaunt ulangan. E’lon serverga yuborilishi mumkin.";
    return true;
  }
  $("serverResourceForm").addEventListener("submit", async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector("button[type=submit]");
    if (!await refreshAuth()) return;
    const title = $("srTitle").value.trim();
    const baseSlug = slugify(title);
    const slug = baseSlug ? (baseSlug.slice(0, 78) + "-" + Date.now().toString(36)) : "";
    if (slug.length < 3) { status.textContent = "Nomdan to‘g‘ri e’lon manzili yasab bo‘lmadi."; return; }
    submit.disabled = true;
    status.textContent = "Serverga saqlanmoqda…";
    const result = await data.createResourceOffer({
      slug, title, category: $("srCategory").value,
      quantityLabel: $("srQuantity").value.trim(),
      availabilityLabel: $("srAvailability").value.trim(),
      location: $("srLocation").value.trim(),
      publicTerms: $("srTerms").value.trim(),
      description: $("srDescription").value.trim(),
      status: $("srPublish").checked ? "published" : "draft"
    });
    submit.disabled = false;
    if (!result || !result.ok) {
      status.textContent = result && result.error && result.error.message ? result.error.message : "Saqlash amalga oshmadi. Maydonlarni tekshirib qayta urinib ko‘ring.";
      return;
    }
    const published = $("srPublish").checked;
    event.currentTarget.reset();
    status.textContent = published ? "Resurs taklifi serverda saqlandi. Ommaviy katalog yangilanmoqda." : "Qoralama serverda saqlandi. Uni keyinroq tahrirlash mumkin.";
    if (published) {
      const count = document.getElementById("publicResourceCount");
      if (count) count.textContent = "Yangilanmoqda…";
      window.location.reload();
    }
  });
  refreshAuth();
})();