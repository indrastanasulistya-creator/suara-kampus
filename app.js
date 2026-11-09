var KEY="pengaduan-v2",S,user=null,screen="qr",tab="harian",flt="Semua",day="",ver=0,searchText="",statusFilter="Semua",categoryFilter="Semua";
var KAT=["Ruang kelas","Laboratorium","Toilet","Parkiran & penerangan","Perpustakaan","Kantin","Jaringan & Wi-Fi","Fasilitas lainnya"];
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function ymd(d){var z=new Date(d);return z.getFullYear()+"-"+String(z.getMonth()+1).padStart(2,"0")+"-"+String(z.getDate()).padStart(2,"0")}
function fmt(d){return new Date(d).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}
function jam(d){return new Date(d).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function toast(t){$("toast").innerHTML="<span>"+esc(t)+"</span>";setTimeout(function(){$("toast").innerHTML=""},2400)}
function ago(n){return new Date(Date.now()-n*864e5).toISOString()}

function exportCSV(){
 var rows=[["ID","Tanggal","Jam","Nama","NIM","Kategori","Judul","Deskripsi","Lokasi","Status","Prioritas AI"]];
 S.laporan.forEach(function(l){
  var a=aiOf(l.id);
  rows.push(["LP-"+String(l.id).padStart(3,"0"),fmt(l.created),jam(l.created),l.nama,l.nim,l.kategori,l.judul,l.isi,l.lokasi||"",l.status,a?a.prioritas:"Belum dinilai"]);
 });
 var csv=rows.map(function(r){return r.map(function(v){return '"'+String(v==null?"":v).replace(/"/g,'""')+'"'}).join(",")}).join("\r\n");
 var blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
 var url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="data-pengaduan-suara-kampus.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
 toast("Data laporan berhasil diekspor");
}
function applySearch(){
 searchText=$("cariLaporan")?$("cariLaporan").value.trim().toLowerCase():"";
 categoryFilter=$("filterKategori")?$("filterKategori").value:"Semua";
 statusFilter=$("filterStatus")?$("filterStatus").value:"Semua";
 render();
}

function seed(){
 var d=[[0,"Ruang kelas","AC ruang B2 mati","AC ruang kuliah B2 mati sejak Senin, kelas sangat panas.","Budi","2101"],
 [0,"Jaringan & Wi-Fi","Wi-Fi gedung A putus","Wi-Fi di gedung A sering putus, mengganggu kuliah daring seluruh kelas.","Sari","2102"],
 [1,"Parkiran & penerangan","Lampu parkiran padam","Lampu parkiran belakang padam, rawan saat malam.","Dewi","2103"],
 [3,"Perpustakaan","Kursi perpustakaan kurang","Kursi di lantai 2 perpustakaan kurang saat jam ramai.","Rian","2104"],
 [9,"Kantin","Kabel listrik terbuka","Kabel listrik terbuka di kantin, bahaya bagi banyak mahasiswa.","Maya","2105"],
 [12,"Toilet","Keran toilet bocor","Keran toilet lantai 2 bocor dan lantai licin.","Tono","2106"]];
 S={laporan:[],batch:[],ai:[],koreksi:[],log:[],n:0};
 d.forEach(function(x){S.n++;S.laporan.push({id:S.n,nim:x[5],nama:x[4],kategori:x[1],judul:x[2],isi:x[3],lokasi:"",status:"Diterima",created:ago(x[0])})});
 runAI(function(l){return Date.now()-new Date(l.created)>2*864e5},true);
}
function load(){try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}if(!S||!S.laporan)seed()}
function score(l,batch){
 var t=(l.judul+" "+l.isi).toLowerCase(),sc=0,why=[];
 if(/listrik|kabel|kebakaran|bahaya|rawan|pelecehan|kekerasan|korban|licin/.test(t)){sc+=40;why.push("ada risiko keselamatan")}
 if(/kuliah|praktikum|ujian|kelas/.test(t)){sc+=25;why.push("mengganggu kegiatan belajar")}
 if(/semua|banyak|seluruh|setiap/.test(t)){sc+=15;why.push("berdampak ke banyak orang")}
 if(l.kategori=="Parkiran & penerangan"){sc+=20;why.push("area umum rawan")}
 var age=Math.min(20,Math.floor((Date.now()-new Date(l.created))/864e5)*2);if(age>=6){sc+=age;why.push("sudah menunggu lama")}
 var sim=batch.filter(function(x){return x.kategori==l.kategori&&x.id!=l.id}).length;if(sim>0){sc+=Math.min(15,sim*5);why.push(sim+" laporan serupa")}
 return{skor:sc,prioritas:sc>=60?"Tinggi":sc>=30?"Sedang":"Rendah",alasan:why.length?why.join(", "):"bersifat saran atau tidak mendesak"};
}
function runAI(fn,quiet){
 var p=S.laporan.filter(function(l){return !S.ai.some(function(a){return a.laporan_id==l.id})&&(!fn||fn(l))});
 if(!p.length){if(!quiet)toast("Tidak ada laporan baru untuk diurutkan");return}
 var b={id:S.batch.length+1,mulai:ymd(p.map(function(l){return l.created}).sort()[0]),selesai:ymd(new Date()),at:new Date().toISOString(),jumlah:p.length};
 S.batch.push(b);
 p.forEach(function(l){var r=score(l,p);S.ai.push({laporan_id:l.id,batch_id:b.id,prioritas:r.prioritas,skor:r.skor,alasan:r.alasan})});
 save();if(!quiet){toast(p.length+" laporan diurutkan AI (batch "+b.id+")");render()}
}
function aiOf(id){var a=S.ai.filter(function(x){return x.laporan_id==id});return a[a.length-1]}
function korOf(id){var a=S.koreksi.filter(function(x){return x.laporan_id==id});return a[a.length-1]}
function finalOf(id){var k=korOf(id);return k?k.prioritas:null}
function setStatus(id,v){var l=S.laporan.filter(function(x){return x.id==id})[0];S.log.push({laporan_id:id,admin:user.nama,lama:l.status,baru:v,at:new Date().toISOString()});l.status=v;save();toast("Status diubah ke "+v);render()}
function setPri(id,v){if(!v||finalOf(id)==v)return;S.koreksi.push({laporan_id:id,admin:user.nama,prioritas:v,at:new Date().toISOString()});save();toast("Penilaian admin disimpan. Saran AI tetap tercatat.");render()}
function go(s){screen=s;render();window.scrollTo(0,0)}
function logout(){user=null;go("qr")}
function qr(){
 var n=21,seedv=11,out="";
 function rnd(){seedv=(seedv*16807)%2147483647;return seedv%100<46}
 function fin(x,y){return(x<7&&y<7)||(x>13&&y<7)||(x<7&&y>13)}
 function on(x,y){var lx=x>13?x-14:x,ly=y>13?y-14:y;var m=Math.max(Math.abs(lx-3),Math.abs(ly-3));return m==3||m<=1}
 for(var y=0;y<n;y++)for(var x=0;x<n;x++){var f=fin(x,y);if(f?on(x,y):rnd())out+='<rect x="'+x+'" y="'+y+'" width="1.02" height="1.02"/>'}
 return '<svg viewBox="0 0 21 21" fill="currentColor" role="img" aria-label="Kode QR pengaduan"><title>Kode QR pengaduan</title>'+out+'</svg>';
}
function vQR(){return '<div class="landing"><section class="hero-panel"><div class="hero-copy"><span class="eyebrow hero-eyebrow">PORTAL ASPIRASI DIGITAL KAMPUS</span><h1>Suaramu membantu kampus <em>jadi lebih baik.</em></h1><p class="hero-lead">Laporkan kerusakan fasilitas dengan mudah. Pantau tindak lanjutnya, dari laporan diterima hingga selesai.</p><div class="hero-actions"><button class="pri hero-cta" onclick="go(\'login\')">Buat laporan <span aria-hidden="true">→</span></button><span class="hero-note">Cepat · Terarah · Transparan</span></div><div class="hero-points"><div><b>01</b><span>Laporkan<br>kendala</span></div><div><b>02</b><span>AI bantu<br>klasifikasi</span></div><div><b>03</b><span>Pantau<br>progres</span></div></div></div><div class="hero-visual"><div class="visual-glow"></div><div class="visual-card"><div class="visual-top"><span class="visual-dot"></span><span>SUARA KAMPUS</span><span class="live-pill">● DEMO</span></div><div class="visual-icon">✳</div><h3>Fasilitas lebih baik,<br>aktivitas lebih nyaman.</h3><p>Saluran resmi untuk menyampaikan kendala fasilitas kampus.</p><div class="visual-divider"></div><div class="visual-foot"><span>✦ Klasifikasi berbasis AI</span><span>✓ Pantau status laporan</span></div></div><div class="floating-chip chip-one">✦ Aspirasi mahasiswa</div><div class="floating-chip chip-two">✓ Tindak lanjut terpantau</div></div></section><section class="landing-bottom"><div><span class="eyebrow">MULAI DARI SINI</span><h2>Ada fasilitas yang perlu diperbaiki?</h2><p class="mut">Masuk menggunakan nama dan NIM untuk mengirim laporan.</p></div><button class="secondary-cta" onclick="go(\'login\')">Masuk ke portal <span>↗</span></button></section><p class="demo-disclaimer">Versi demonstrasi akademik · Kode QR dan autentikasi belum digunakan untuk layanan produksi.</p></div>'}
function vLogin(){return '<div class="login-layout"><section class="login-aside"><span class="eyebrow hero-eyebrow">SUARA KAMPUS</span><div class="login-symbol">✳</div><h2>Satu laporan kecil, perubahan yang berarti.</h2><p>Gunakan portal ini untuk menyampaikan kendala fasilitas kampus dan memantau perkembangannya.</p><div class="login-aside-foot">PORTAL ASPIRASI FASILITAS KAMPUS</div></section><section class="card login-card"><span class="eyebrow">SELAMAT DATANG</span><h2>Masuk ke portal</h2><p class="mut">Gunakan identitas mahasiswa untuk melanjutkan.</p><label for="nm">Nama lengkap</label><input id="nm" autocomplete="name" placeholder="Contoh: Budi Santoso"><label for="nim">Nomor Induk Mahasiswa</label><input id="nim" inputmode="numeric" placeholder="Masukkan NIM"><p class="err" id="le"></p><div class="row login-actions"><button class="pri" onclick="loginM()">Masuk sebagai mahasiswa <span>→</span></button></div><div class="admin-entry"><span>Pengelola kampus?</span><button class="chip" onclick="loginA()">Masuk admin demo</button></div><button class="back-link" onclick="go(\'qr\')">← Kembali ke halaman utama</button></section></div>'}
function loginM(){var n=$("nm").value.trim(),m=$("nim").value.trim();if(!n||!m){$("le").textContent="Isi nama dan NIM dulu.";return}user={role:"mhs",nama:n,nim:m};go("app")}
function loginA(){user={role:"admin",nama:"Admin"};tab="harian";go("app")}
function stepsOf(s){var i=["Diterima","Diproses","Selesai"].indexOf(s);return '<div class="steps" aria-hidden="true"><i class="f"></i><i class="'+(i>=1?"f":"")+'"></i><i class="'+(i>=2?"f":"")+'"></i></div>'}
function vMhs(){
 var mine=S.laporan.filter(function(l){return l.nim==user.nim}).reverse();
 var total=mine.length,done=mine.filter(function(l){return l.status=="Selesai"}).length,progress=mine.filter(function(l){return l.status=="Diproses"}).length;
 var h='<section class="welcome"><div><span class="eyebrow">PORTAL ASPIRASI FASILITAS</span><h2>Halo, '+esc(user.nama)+'</h2><p>Ceritakan kendala fasilitas kampus. Laporan akan tersimpan dan dapat dipantau sampai selesai.</p></div><div class="welcome-mark">SK</div></section>';
 h+='<div class="grid2 summary"><div class="stat"><span>Total laporan</span><b>'+total+'</b></div><div class="stat"><span>Sedang diproses</span><b>'+progress+'</b></div><div class="stat"><span>Selesai</span><b>'+done+'</b></div><div class="stat"><span>Menunggu</span><b>'+(total-progress-done)+'</b></div></div>';
 h+='<form class="card report-form" onsubmit="return sendL(event)"><div class="section-head"><div><span class="eyebrow">FORM PENGADUAN</span><h3>Laporkan fasilitas</h3></div><span class="step-tag">01 / 01</span></div><p class="mut" style="margin-top:4px">Form ini khusus untuk fasilitas kampus. Untuk urusan akademik atau layanan administrasi, hubungi bagian terkait.</p><label for="kt">Jenis fasilitas</label><select id="kt">'+KAT.map(function(k){return"<option>"+k+"</option>"}).join("")+'</select><label for="jd">Judul</label><input id="jd" maxlength="100" placeholder="AC ruang B2 mati"><label for="is">Isi laporan</label><textarea id="is" rows="4" placeholder="Apa yang rusak, sejak kapan, dan siapa yang terdampak?"></textarea><label for="lk">Lokasi fasilitas</label><input id="lk" placeholder="Gedung B, lantai 2"><p class="err" id="fe"></p><div style="margin-top:14px"><button class="pri" type="submit">Kirim laporan</button></div></form>';
 h+='<h3 style="margin:20px 0 10px">Status laporan Anda</h3>';
 if(!mine.length)h+='<div class="card"><p class="mut">Belum ada laporan. Kirim laporan pertama Anda lewat form di atas.</p></div>';
 mine.forEach(function(l){h+='<div class="card"><div class="top"><h3>'+esc(l.judul)+'</h3><span class="bd '+l.status+'">'+l.status+'</span></div><p class="mut">'+esc(l.kategori)+' · '+fmt(l.created)+'</p><p style="margin:8px 0 0;font-size:15px">'+esc(l.isi)+'</p>'+(l.kategori_ai?'<p class="ai-result"><b>Prediksi Naive Bayes:</b> '+esc(l.kategori_ai)+' · keyakinan '+Math.round((l.confidence_ai||0)*100)+'%</p>':'')+stepsOf(l.status)+'</div>'});
 return h;
}
async function sendL(e){e.preventDefault();var j=$("jd").value.trim(),i=$("is").value.trim();if(!j||i.length<10||!$("lk").value.trim()){$("fe").textContent="Isi judul, lokasi, dan uraian minimal 10 karakter.";return false}
 if(/nilai|dosen|beasiswa|krs|ukt|administrasi/i.test(j+" "+i)){$("fe").textContent="Laporan ini tampaknya bukan tentang fasilitas kampus. Form ini hanya untuk fasilitas.";return false}
 var predicted=null,confidence=null;
 try{var response=await fetch("/api/predict",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:j+" "+i})});if(response.ok){var result=await response.json();predicted=result.kategori_prediksi;confidence=result.confidence;}}
 catch(err){console.warn("Model API tidak tersedia",err);}
 S.n++;S.laporan.push({id:S.n,nim:user.nim,nama:user.nama,kategori:$("kt").value,kategori_ai:predicted,confidence_ai:confidence,judul:j,isi:i,lokasi:$("lk").value.trim(),status:"Diterima",created:new Date().toISOString()});save();toast(predicted?"Laporan terkirim. Prediksi AI: "+predicted:"Laporan tersimpan; server AI belum aktif.");render();return false}
function vAdmin(){
 var h='<h2>Dashboard admin</h2><div class="seg" role="tablist"><button class="'+(tab=="harian"?"on":"")+'" onclick="tab=\'harian\';render()">Laporan harian</button><button class="'+(tab=="prioritas"?"on":"")+'" onclick="tab=\'prioritas\';render()">Prioritas AI</button></div>';
 return h+(tab=="harian"?vHarian():vPrioritas());
}
function vHarian(){
 var today=ymd(new Date()),all=S.laporan.slice().reverse();
 var list=day?all.filter(function(l){return ymd(l.created)==day}):all;
 list=list.filter(function(l){
  var hay=(l.judul+" "+l.isi+" "+l.nama+" "+l.nim+" "+(l.lokasi||"")).toLowerCase();
  return (!searchText||hay.indexOf(searchText)>=0)&&(categoryFilter=="Semua"||l.kategori==categoryFilter)&&(statusFilter=="Semua"||l.status==statusFilter);
 });
 var h='<div class="grid2"><div class="stat">Total laporan<b>'+all.length+'</b></div><div class="stat">Masuk hari ini<b>'+all.filter(function(l){return ymd(l.created)==today}).length+'</b></div><div class="stat">Sedang diproses<b>'+all.filter(function(l){return l.status=="Diproses"}).length+'</b></div><div class="stat">Selesai<b>'+all.filter(function(l){return l.status=="Selesai"}).length+'</b></div></div>';
 h+='<div class="card" style="margin-top:12px"><h3>Temukan laporan</h3><label for="cariLaporan">Kata kunci</label><div class="row"><input id="cariLaporan" value="'+esc(searchText)+'" placeholder="Cari judul, nama, NIM, atau lokasi..." style="flex:1;min-width:180px"><button class="pri" onclick="applySearch()">Cari</button><button onclick="searchText=\'\';categoryFilter=\'Semua\';statusFilter=\'Semua\';render()">Reset</button></div><div class="grid2"><div><label for="filterKategori">Kategori</label><select id="filterKategori" onchange="applySearch()"><option>Semua</option>'+KAT.map(function(k){return'<option'+(categoryFilter==k?' selected':'')+'>'+k+'</option>'}).join("")+'</select></div><div><label for="filterStatus">Status</label><select id="filterStatus" onchange="applySearch()">'+["Semua","Diterima","Diproses","Selesai"].map(function(k){return'<option'+(statusFilter==k?' selected':'')+'>'+k+'</option>'}).join("")+'</select></div></div><button style="margin-top:12px" onclick="exportCSV()">Ekspor data CSV</button></div>';
 h+='<div class="row" style="margin:14px 0"><button class="chip '+(day==today?"on":"")+'" onclick="day=\''+today+'\';render()">Hari ini</button><button class="chip '+(day==""?"on":"")+'" onclick="day=\'\';render()">Semua</button><input type="date" value="'+day+'" onchange="day=this.value;render()" style="width:auto" aria-label="Pilih tanggal"></div>';
 h+='<p class="mut" style="margin-bottom:10px">Data mentah, urut berdasarkan waktu masuk.</p>';
 if(!list.length)h+='<div class="card"><p class="mut">Tidak ada laporan pada tanggal ini.</p></div>';
 list.forEach(function(l){var a=aiOf(l.id);h+='<div class="card"><div class="top"><h3>'+esc(l.judul)+'</h3><span class="bd '+(a?"Diproses":"none")+'" style="'+(a?"":"")+'">'+(a?"Ada saran AI":"Belum diurutkan AI")+'</span></div><p class="mut">LP-'+String(l.id).padStart(3,"0")+' · '+esc(l.kategori)+' · '+esc(l.nama)+' ('+esc(l.nim)+') · '+fmt(l.created)+', '+jam(l.created)+'</p><p style="margin:8px 0 12px;font-size:15px">'+esc(l.isi)+'</p>'+(l.kategori_ai?'<p class="mut">Prediksi kategori Naive Bayes: <b>'+esc(l.kategori_ai)+'</b> · keyakinan '+Math.round(l.confidence_ai*100)+'%</p>':'<p class="mut">Prediksi kategori AI belum tersedia. Pastikan server ML berjalan.</p>')+'<div class="row"><label for="s'+l.id+'" style="margin:0">Status</label><select class="sm" id="s'+l.id+'" onchange="setStatus('+l.id+',this.value)">'+["Diterima","Diproses","Selesai"].map(function(s){return"<option"+(s==l.status?" selected":"")+">"+s+"</option>"}).join("")+'</select></div></div>'});
 return h;
}
async function evaluateModel(){
 var el=$("modelEval");if(!el)return;el.textContent="Mengambil hasil evaluasi...";
 try{
  var r=await fetch("/api/evaluate");if(!r.ok)throw new Error("API tidak merespons");var d=await r.json();
  var matrix='<h4 style="margin:12px 0 6px">Confusion matrix</h4><div style="overflow-x:auto"><table class="table"><thead><tr><th>Aktual \\ Prediksi</th>'+d.labels.map(function(x){return'<th>'+esc(x)+'</th>'}).join('')+'</tr></thead><tbody>'+d.confusion_matrix.map(function(row,i){return'<tr><th>'+esc(d.labels[i])+'</th>'+row.map(function(v){return'<td>'+v+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>';
  el.innerHTML='<div class="grid2" style="margin-top:10px"><div class="stat">Akurasi<b>'+Math.round(d.accuracy*100)+'%</b></div><div class="stat">Precision macro<b>'+Math.round(d.macro_precision*100)+'%</b></div><div class="stat">Recall macro<b>'+Math.round(d.macro_recall*100)+'%</b></div><div class="stat">F1-score macro<b>'+Math.round(d.macro_f1*100)+'%</b></div></div><p class="mut" style="margin-top:8px">Data: '+d.dataset_size+' · Latih: '+d.train_size+' · Uji: '+d.test_size+' · Fitur: '+esc(d.features)+'</p>'+matrix+'<p class="mut">'+esc(d.note)+'</p>';
 }catch(e){el.textContent="Server ML belum aktif. Jalankan server.py terlebih dahulu (lihat README).";}
}
function vPrioritas(){
 var lb=S.batch[S.batch.length-1],items=S.laporan.filter(function(l){return aiOf(l.id)}),pend=S.laporan.length-items.length;
 var cnt={Tinggi:0,Sedang:0,Rendah:0,Belum:0};items.forEach(function(l){cnt[finalOf(l.id)||"Belum"]++});
 var h='<div class="card"><div class="top"><div><h3>Model klasifikasi kategori</h3><p class="mut">Multinomial Naive Bayes + TF-IDF</p></div><span class="bd Diproses">Machine Learning</span></div><p class="mut">Model memprediksi kategori fasilitas dari teks laporan. Klik tombol untuk melihat hasil evaluasi pada data uji.</p><button class="pri" onclick="evaluateModel()">Evaluasi model ML</button><div id="modelEval" class="mut" style="margin-top:10px"></div></div>';
 if(lb){var nx=new Date(new Date(lb.at).getTime()+14*864e5);h+='<div class="card" style="background:var(--acbg);border-color:var(--ac)"><h3 style="color:var(--ac)">Batch '+lb.id+' · '+fmt(lb.mulai)+" – "+fmt(lb.selesai)+'</h3><p class="mut" style="color:var(--ac)">AI hanya menyusun urutan saran. Penilaian akhir ditentukan admin. Diproses '+fmt(lb.at)+', siklus berikutnya '+fmt(nx)+'.</p></div>'}
 else h+='<div class="card"><p class="mut">Belum ada siklus AI. Jalankan siklus pertama untuk mendapat urutan saran.</p></div>';
 h+='<div class="grid2"><div class="stat">Dinilai Tinggi<b style="color:var(--hi)">'+cnt.Tinggi+'</b></div><div class="stat">Dinilai Sedang<b style="color:var(--md)">'+cnt.Sedang+'</b></div><div class="stat">Dinilai Rendah<b style="color:var(--lo)">'+cnt.Rendah+'</b></div><div class="stat">Belum dinilai admin<b>'+cnt.Belum+'</b></div></div>';
 if(pend)h+='<p class="mut" style="margin-top:10px">'+pend+' laporan baru menunggu siklus AI berikutnya.</p>';
 h+='<div class="row" style="margin:14px 0">'+[["Semua","Semua"],["Belum","Belum dinilai"],["Tinggi","Tinggi"],["Sedang","Sedang"],["Rendah","Rendah"]].map(function(f){return'<button class="chip '+(flt==f[0]?"on":"")+'" onclick="flt=\''+f[0]+'\';render()">'+f[1]+'</button>'}).join("")+'<span style="flex:1"></span><button class="pri" onclick="runAI()">Jalankan siklus AI</button></div>';
 var list=items.filter(function(l){var f=finalOf(l.id);return flt=="Semua"||(flt=="Belum"?!f:f==flt)}).sort(function(a,b){var ra=finalOf(a.id)?1:0,rb=finalOf(b.id)?1:0;return ra-rb||aiOf(b.id).skor-aiOf(a.id).skor});
 if(!list.length)h+='<div class="card"><p class="mut">Tidak ada laporan di kategori ini.</p></div>';
 list.forEach(function(l){var a=aiOf(l.id),f=finalOf(l.id);
  h+='<div class="card"><div class="top"><h3>'+esc(l.judul)+'</h3>'+(f?'<span class="bd '+f+'">Admin: '+f+'</span>':'<span class="bd none">Belum dinilai admin</span>')+'</div><p class="mut">LP-'+String(l.id).padStart(3,"0")+' · '+esc(l.kategori)+' · '+esc(l.status)+'</p><p style="margin:8px 0 6px;font-size:15px">'+esc(l.isi)+'</p>'
  +'<p class="mut">Saran AI: <span class="bd '+a.prioritas+'">'+a.prioritas+'</span> '+esc(a.alasan)+' (skor '+a.skor+')</p>'
  +(f&&f!=a.prioritas?'<p class="mut" style="margin-top:4px">Admin memutuskan berbeda dari saran AI.</p>':"")
  +'<div class="row" style="margin-top:10px">'+(f?"":'<button class="pri" onclick="setPri('+l.id+',\''+a.prioritas+'\')">Setujui saran: '+a.prioritas+'</button>')+'<label for="p'+l.id+'" style="margin:0">'+(f?"Ubah penilaian":"atau pilih sendiri")+'</label><select class="sm" id="p'+l.id+'" onchange="setPri('+l.id+',this.value)">'+(f?"":'<option value="" disabled selected>Pilih</option>')+["Tinggi","Sedang","Rendah"].map(function(q){return"<option"+(q==f?" selected":"")+">"+q+"</option>"}).join("")+'</select></div></div>'});
 h+='<p class="mut" style="margin-top:8px">Klasifikasi kategori menggunakan Multinomial Naive Bayes yang dilatih dari dataset contoh. Skor prioritas Tinggi/Sedang/Rendah pada demo masih berupa aturan sederhana, bukan keluaran model Naive Bayes. Admin tetap memutuskan penanganan akhir.</p>';
 return h;
}
function render(){
 $("who").innerHTML=user?'<span class="mut" style="margin-right:8px">'+esc(user.nama)+'</span><button class="chip" onclick="logout()">Keluar</button>':"";
 $("app").innerHTML=screen=="qr"?vQR():screen=="login"?vLogin():user.role=="admin"?vAdmin():vMhs();
}
load();render();
