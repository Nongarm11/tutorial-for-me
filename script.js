/* ===== ท่าม่วง Urban Forest — script.js ===== */

const STORAGE_KEY = 'thamuang_trees';
let trees = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let photoData = '';          // Base64 ของรูปที่เลือกอยู่

const $ = (id) => document.getElementById(id);
const treeForm = $('treeForm');
const treeGrid = $('treeGrid');

/* ---------- 1. คำนวณ DBH / มวลชีวภาพ / CO₂ ---------- */
function calcTree(girthCm, heightM) {
  const dbh = girthCm / Math.PI;                    // ซม.
  const bio = 0.0509 * 0.6 * Math.pow(dbh, 2) * heightM; // กก. (Chave 2005, ρ=0.6)
  const co2 = bio * 0.47 * 3.67;                    // กก. CO₂
  return { dbh, bio, co2 };
}

function updateCalcBox() {
  const g = parseFloat(treeForm.girth.value) || 0;
  const h = parseFloat(treeForm.height.value) || 0;
  if (!g || !h) return;
  const { dbh, bio, co2 } = calcTree(g, h);
  $('cDbh').textContent = dbh.toFixed(2) + ' ซม.';
  $('cBio').textContent = bio.toFixed(2) + ' กก.';
  $('cCo2').textContent = co2.toFixed(2) + ' กก.';
}
['girth', 'height'].forEach(n =>
  treeForm[n].addEventListener('input', updateCalcBox)
);

/* ---------- 2. อัปโหลด + ย่อรูป ---------- */
$('treePhoto').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
      else if (height > MAX) { width *= MAX / height; height = MAX; }

      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      photoData = c.toDataURL('image/jpeg', 0.7);

      $('photoPreview').src = photoData;
      $('photoPreview').style.display = 'block';
      $('btnClearPhoto').style.display = 'inline-block';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

function clearPhoto() {
  photoData = '';
  $('treePhoto').value = '';
  $('photoPreview').style.display = 'none';
  $('btnClearPhoto').style.display = 'none';
}
$('btnClearPhoto').addEventListener('click', clearPhoto);

/* ---------- 3. บันทึกข้อมูล ---------- */
treeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = treeForm;
  const girth = parseFloat(f.girth.value);
  const height = parseFloat(f.height.value);
  const { dbh, bio, co2 } = calcTree(girth, height);

  trees.push({
    id: Date.now(),
    name: f.name.value.trim(),
    sci: f.sci.value.trim(),
    type: f.type.value,
    zone: f.zone.value.trim(),
    height, girth,
    health: f.health.value,
    surveyor: f.surveyor.value.trim(),
    note: f.note.value.trim(),
    dbh: +dbh.toFixed(2),
    bio: +bio.toFixed(2),
    co2: +co2.toFixed(2),
    photo: photoData,
    date: new Date().toLocaleDateString('th-TH')
  });

  if (!save()) { trees.pop(); return; }
  f.reset();
  clearPhoto();
  render();
  alert('บันทึกข้อมูลเรียบร้อย ✅');
});

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trees));
    return true;
  } catch (err) {
    alert('พื้นที่เก็บข้อมูลเต็ม ❌ กรุณาส่งออก CSV แล้วลบข้อมูลเก่า หรือใช้รูปที่เล็กลง');
    return false;
  }
}

/* ---------- 4. แสดงการ์ด ---------- */
const HEALTH_TH = { good: 'ดี', fair: 'ปานกลาง', bad: 'ทรุดโทรม' };

function render(list = trees) {
  if (!list.length) {
    treeGrid.innerHTML = '<p style="opacity:.6">ยังไม่มีข้อมูลต้นไม้</p>';
    return;
  }
  treeGrid.innerHTML = list.map(t => `
    <div class="tree-card">
      ${t.photo
        ? `<img src="${t.photo}" class="tree-img" alt="${t.name}">`
        : `<div class="tree-img no-img">🌳</div>`}
      <div class="tree-body">
        <h3>${t.name}</h3>
        <p><i>${t.sci || '-'}</i></p>
        <p>📍 ${t.zone} • ${t.type}</p>
        <p>📏 สูง ${t.height} ม. • DBH ${t.dbh} ซม.</p>
        <p>🌱 CO₂ ${t.co2} กก.</p>
        <p>❤️ สุขภาพ: ${HEALTH_TH[t.health] || t.health}</p>
        <small>ผู้สำรวจ: ${t.surveyor} • ${t.date}</small>
        <button onclick="removeTree(${t.id})">ลบ</button>
      </div>
    </div>`).join('');
}

function removeTree(id) {
  if (!confirm('ยืนยันลบข้อมูลต้นนี้?')) return;
  trees = trees.filter(t => t.id !== id);
  save();
  render();
}

/* ---------- 5. ส่งออก CSV (ไม่รวมรูป) ---------- */
$('btnExport').addEventListener('click', () => {
  if (!trees.length) return alert('ยังไม่มีข้อมูลให้ส่งออก');
  const head = ['ชื่อไทย','ชื่อวิทยาศาสตร์','ประเภท','บริเวณ','ความสูง(ม.)',
                'เส้นรอบวง(ซม.)','DBH(ซม.)','มวลชีวภาพ(กก.)','CO2(กก.)',
                'สุขภาพ','ผู้สำรวจ','มีรูป','บันทึก','วันที่'];
  const rows = trees.map(t => [
    t.name, t.sci, t.type, t.zone, t.height, t.girth,
    t.dbh, t.bio, t.co2, HEALTH_TH[t.health] || t.health,
    t.surveyor, t.photo ? 'มี' : 'ไม่มี', t.note, t.date
  ]);
  const csv = '\uFEFF' + [head, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `ต้นไม้_ท่าม่วง_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});

render();

/* ---------- 6. ค้นหา + กรอง ---------- */
function applyFilter() {
  const q = $('searchBox').value.trim().toLowerCase();
  const ty = $('filterType').value;
  const he = $('filterHealth').value;
  render(trees.filter(t =>
    (!q || `${t.name} ${t.sci} ${t.zone} ${t.surveyor}`.toLowerCase().includes(q)) &&
    (!ty || t.type === ty) &&
    (!he || t.health === he)
  ));
}
['searchBox','filterType','filterHealth'].forEach(id =>
  $(id).addEventListener('input', applyFilter)
);

/* ---------- 7. สรุปผล ---------- */
function updateStats() {
  $('sTotal').textContent   = trees.length;
  $('sSpecies').textContent = new Set(trees.map(t => t.name)).size;
  $('sCo2').textContent     = trees.reduce((s,t) => s + (t.co2||0), 0).toFixed(1);
  $('sRisk').textContent    = trees.filter(t => t.health === 'bad').length;
}

/* ---------- 8. เมนูมือถือ ---------- */
$('burger').addEventListener('click', () => $('nav').classList.toggle('open'));
