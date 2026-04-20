/* ================================================================
   PORTAFOLIO DIGITAL — script.js
   Cambios en esta versión:
   - Sección "Proyectos" separada eliminada (van dentro de Actividades)
   - Comentarios abiertos a todos (no solo admin)
   - Rúbrica editable por admin, visible para todos
   - Sistema de calificaciones de visitantes con historial individual
   - Cada visitante solo puede votar una vez (fingerprint por IP/navegador)
   - Contacto: Instagram y Gmail reales, WhatsApp oculto/opcional
   ================================================================ */

/* ── SUPABASE ── */
const SUPABASE_URL = 'https://rufuligjvtareuqigzti.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZnVsaWdqdnRhcmV1cWlnenRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDY2NjYsImV4cCI6MjA5MjEyMjY2Nn0.b7qkuT-0WeMEnhtaJJ2s8In6O5Rkau0HjR9f-B-pARo';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const PORTFOLIO_ID = 1;

/* ── CREDENCIALES ADMIN ── */
const ADMIN_MATRICULA = '2026-1072';
const ADMIN_PASSWORD  = 'Rosanny1009';
const SESSION_KEY     = 'portafolio_admin_session';
/* Clave que guarda en localStorage si el visitante ya votó */
const VOTO_KEY        = 'portafolio_ya_voto';

/* ── ESTADO GLOBAL ── */
const STATE = {
  isAdmin: false,
  config: { nombre:'', matricula:'', asignatura:'', fecha:'', presentacion:'', objetivo:'' },
  fotoPerfil: null,
  actividades: [],
  reflexiones: [],
  comentarios: [],
  votos: [],        /* Historial de calificaciones de visitantes */
  reflexionesFinales: { aprendizajes:'', fortalezas:'', mejorar:'', objetivos:'' },
  rubrica: [
    { key:'contenido',    nombre:'Contenido',             pct:40, descripcion:'Completitud de las tareas, calidad y profundidad de las reflexiones.' },
    { key:'organizacion', nombre:'Organización',          pct:20, descripcion:'Estructura clara, uso adecuado de carpetas y facilidad de navegación.' },
    { key:'reflexion',    nombre:'Reflexión',             pct:20, descripcion:'Evidencia de reflexión, identificación de fortalezas y debilidades.' },
    { key:'herramientas', nombre:'Herramientas Digitales',pct:20, descripcion:'Dominio de la herramienta y presentación clara y profesional.' }
  ]
};

/* ══════════════════════════════════════════════════════════════════
   FINGERPRINT DEL VISITANTE
   Generamos un ID único por navegador para evitar votos dobles.
   Se guarda en localStorage así que persiste entre visitas.
══════════════════════════════════════════════════════════════════ */

/* Genera o recupera el ID único del visitante */
function getVisitorId() {
  const KEY = 'portafolio_visitor_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    /* Generamos un ID aleatorio y lo guardamos */
    id = 'v_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

/* Verifica si este visitante ya votó (según localStorage) */
function yaVoto() {
  return localStorage.getItem(VOTO_KEY) === 'true';
}

/* Marca que este visitante ya votó */
function marcarVoto() {
  localStorage.setItem(VOTO_KEY, 'true');
}

/* ══════════════════════════════════════════════════════════════════
   AUTENTICACIÓN ADMIN
══════════════════════════════════════════════════════════════════ */

function checkSavedSession() {
  if (sessionStorage.getItem(SESSION_KEY) === 'true') STATE.isAdmin = true;
}
function saveSession()  { sessionStorage.setItem(SESSION_KEY, 'true'); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

/* Aplica permisos a toda la interfaz según el rol actual */
function applyRole() {
  const isAdmin = STATE.isAdmin;

  /* Círculo del menú */
  const circle = document.getElementById('authCircleBtn');
  const dot    = document.getElementById('authStatusDot');
  const icon   = document.getElementById('authCircleIcon');
  if (isAdmin) {
    circle.classList.add('is-admin'); dot.classList.add('is-admin');
    icon.className = 'ph-bold ph-shield-check';
    circle.title   = 'Sesión admin activa — clic para opciones';
  } else {
    circle.classList.remove('is-admin'); dot.classList.remove('is-admin');
    icon.className = 'ph-bold ph-user';
    circle.title   = 'Iniciar sesión como administrador';
  }

  /* Mostrar/ocultar elementos exclusivos del admin */
  document.querySelectorAll('.admin-only').forEach(el => { el.style.display = isAdmin ? '' : 'none'; });

  /* Badge de visitante */
  const gb = document.getElementById('guestBadge');
  if (gb) gb.style.display = isAdmin ? 'none' : 'inline-flex';

  /* Bloques editables */
  ['presentacionTexto','objetivoTexto','refAprendizajes','refFortalezas','refMejorar','refObjetivos'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isAdmin) { el.contentEditable='true'; el.classList.remove('read-only'); }
    else         { el.contentEditable='false'; el.classList.add('read-only'); }
  });

  /* Avatar */
  const av = document.getElementById('profileAvatar');
  if (isAdmin) { av.classList.remove('guest-mode'); av.style.cursor='pointer'; }
  else         { av.classList.add('guest-mode');    av.style.cursor='default'; }

  /* Columna editar rúbrica */
  document.querySelectorAll('.col-editar').forEach(el => { el.style.display = isAdmin ? '' : 'none'; });

  /* Descripción de la rúbrica */
  const rd = document.getElementById('rubricaDesc');
  if (rd) rd.textContent = isAdmin
    ? 'Criterios de evaluación. Haz clic en el lápiz ✏️ para editar.'
    : 'Criterios con los que será evaluado este portafolio.';

  /* Foto de perfil: solo admin puede cambiarla */
  const fi = document.getElementById('fotoInput');
  if (!isAdmin) { av.onclick = null; }
  else { av.onclick = () => fi.click(); }

  renderRubrica();
  /* Actualizar visibilidad del formulario de votación */
  actualizarVotoUI();
}

/* Botón del círculo de auth */
document.getElementById('authCircleBtn').addEventListener('click', () => {
  if (STATE.isAdmin) {
    document.getElementById('adminMenuMatricula').textContent = ADMIN_MATRICULA;
    openModal('modalAdminMenu');
  } else {
    document.getElementById('loginMatricula').value = '';
    document.getElementById('loginPassword').value  = '';
    document.getElementById('loginError').style.display = 'none';
    openModal('modalLogin');
    setTimeout(() => document.getElementById('loginMatricula').focus(), 300);
  }
});

function intentarLogin() {
  const mat = document.getElementById('loginMatricula').value.trim();
  const pw  = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  if (mat === ADMIN_MATRICULA && pw === ADMIN_PASSWORD) {
    STATE.isAdmin = true; saveSession(); closeModal('modalLogin'); applyRole();
    showToast('Bienvenida, Administradora. Modo edición activo.');
  } else {
    err.style.display = 'flex';
    const m = document.querySelector('#modalLogin .modal');
    m.style.animation='none'; m.offsetHeight; m.style.animation='shake .4s var(--ease)';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
  }
}

function cerrarSesion() {
  STATE.isAdmin = false; clearSession(); closeModal('modalAdminMenu'); applyRole();
  showToast('Sesión cerrada. Volviste al modo visitante.');
}

document.getElementById('btnLoginSubmit').addEventListener('click', intentarLogin);
['loginMatricula','loginPassword'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => { if(e.key==='Enter') intentarLogin(); });
});
document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
document.getElementById('closeLogin').addEventListener('click',     () => closeModal('modalLogin'));
document.getElementById('closeAdminMenu').addEventListener('click', () => closeModal('modalAdminMenu'));

/* Mostrar/ocultar contraseña */
document.getElementById('btnTogglePw').addEventListener('click', () => {
  const inp = document.getElementById('loginPassword');
  const eye = document.getElementById('eyeIcon');
  if (inp.type === 'password') { inp.type='text';     eye.className='ph-bold ph-eye-slash'; }
  else                         { inp.type='password'; eye.className='ph-bold ph-eye'; }
});

/* ══════════════════════════════════════════════════════════════════
   SUPABASE — GUARDAR Y CARGAR
══════════════════════════════════════════════════════════════════ */

async function saveConfig() {
  if (!STATE.isAdmin) return;
  STATE.config.presentacion             = document.getElementById('presentacionTexto').innerText;
  STATE.config.objetivo                 = document.getElementById('objetivoTexto').innerText;
  STATE.reflexionesFinales.aprendizajes = document.getElementById('refAprendizajes').innerText;
  STATE.reflexionesFinales.fortalezas   = document.getElementById('refFortalezas').innerText;
  STATE.reflexionesFinales.mejorar      = document.getElementById('refMejorar').innerText;
  STATE.reflexionesFinales.objetivos    = document.getElementById('refObjetivos').innerText;
  const { error } = await db.from('config').upsert({
    id:PORTFOLIO_ID, nombre:STATE.config.nombre, matricula:STATE.config.matricula,
    asignatura:STATE.config.asignatura, fecha_inicio:STATE.config.fecha||null,
    presentacion:STATE.config.presentacion, objetivo:STATE.config.objetivo,
    foto_perfil:STATE.fotoPerfil,
    ref_aprendizajes:STATE.reflexionesFinales.aprendizajes, ref_fortalezas:STATE.reflexionesFinales.fortalezas,
    ref_mejorar:STATE.reflexionesFinales.mejorar, ref_objetivos:STATE.reflexionesFinales.objetivos,
    rubrica:STATE.rubrica
  });
  if (error) { console.error('saveConfig:', error.message); showToast('Error al guardar.','error'); }
}

async function saveActividad(act) {
  if (!STATE.isAdmin) return;
  const { error } = await db.from('actividades').insert({
    id:act.id, nombre:act.nombre, tipo:act.tipo, descripcion:act.descripcion,
    fecha_entrega:act.fecha||null, calificacion:act.calificacion!==''?parseFloat(act.calificacion):null,
    reflexion:act.reflexion, enlace:act.enlace, creado_en:act.creadoEn
  });
  if (error) { console.error('saveActividad:', error.message); showToast('Error al guardar actividad.','error'); }
}

async function deleteActividad(id) {
  if (!STATE.isAdmin) return;
  await db.from('actividades').delete().eq('id', id);
}

async function saveReflexion(r) {
  if (!STATE.isAdmin) return;
  const { error } = await db.from('reflexiones').insert({ id:r.id, titulo:r.titulo, contenido:r.contenido, emoji:r.emoji, creado_en:r.creadoEn });
  if (error) { console.error('saveReflexion:', error.message); showToast('Error al guardar reflexión.','error'); }
}
async function deleteReflexion(id) { if (!STATE.isAdmin) return; await db.from('reflexiones').delete().eq('id', id); }

/* Comentarios: cualquier persona puede guardar */
async function saveComentario(c) {
  const { error } = await db.from('comentarios').insert({ id:c.id, autor:c.autor, texto:c.texto, creado_en:c.creadoEn });
  if (error) { console.error('saveComentario:', error.message); showToast('Error al guardar comentario.','error'); }
}

/* Guardar un voto de visitante en Supabase */
async function saveVoto(voto) {
  const { error } = await db.from('votos').insert({
    id:               voto.id,
    visitor_id:       voto.visitorId,   /* ID único del visitante */
    nombre_votante:   voto.nombre,      /* Nombre opcional */
    puntaje_total:    voto.puntajeTotal,
    desglose:         voto.desglose,    /* JSON con calificación por criterio */
    creado_en:        voto.creadoEn
  });
  if (error) { console.error('saveVoto:', error.message); showToast('Error al guardar el voto.','error'); return false; }
  return true;
}

/* Cargar todos los datos al abrir la página */
async function loadAllFromSupabase() {
  mostrarSpinner();
  try {
    const [{ data:cfg },{ data:acts },{ data:refs },{ data:coms },{ data:votos }] = await Promise.all([
      db.from('config').select('*').eq('id', PORTFOLIO_ID).single(),
      db.from('actividades').select('*').order('creado_en', {ascending:true}),
      db.from('reflexiones').select('*').order('creado_en', {ascending:false}),
      db.from('comentarios').select('*').order('creado_en', {ascending:true}),
      db.from('votos').select('*').order('creado_en', {ascending:false})
    ]);
    if (cfg) {
      STATE.config.nombre       = cfg.nombre       || '';
      STATE.config.matricula    = cfg.matricula    || '';
      STATE.config.asignatura   = cfg.asignatura   || '';
      STATE.config.fecha        = cfg.fecha_inicio || '';
      STATE.config.presentacion = cfg.presentacion || '';
      STATE.config.objetivo     = cfg.objetivo     || '';
      STATE.fotoPerfil          = cfg.foto_perfil  || null;
      STATE.reflexionesFinales.aprendizajes = cfg.ref_aprendizajes || '';
      STATE.reflexionesFinales.fortalezas   = cfg.ref_fortalezas   || '';
      STATE.reflexionesFinales.mejorar      = cfg.ref_mejorar      || '';
      STATE.reflexionesFinales.objetivos    = cfg.ref_objetivos    || '';
      if (cfg.rubrica && cfg.rubrica.length) STATE.rubrica = cfg.rubrica;
    }
    if (acts) STATE.actividades = acts.map(a => ({
      id:a.id, nombre:a.nombre, tipo:a.tipo, descripcion:a.descripcion||'',
      fecha:a.fecha_entrega||'', calificacion:a.calificacion!==null?String(a.calificacion):'',
      reflexion:a.reflexion||'', enlace:a.enlace||'', creadoEn:a.creado_en
    }));
    if (refs) STATE.reflexiones = refs.map(r => ({ id:r.id, titulo:r.titulo||'Reflexión', contenido:r.contenido||'', emoji:r.emoji||'💭', creadoEn:r.creado_en }));
    if (coms) STATE.comentarios = coms.map(c => ({ id:c.id, autor:c.autor||'', texto:c.texto, creadoEn:c.creado_en }));
    if (votos) STATE.votos = votos.map(v => ({
      id:v.id, visitorId:v.visitor_id, nombre:v.nombre_votante||'Anónimo',
      puntajeTotal:v.puntaje_total, desglose:v.desglose||{}, creadoEn:v.creado_en
    }));
  } catch(err) {
    console.error('Error cargando datos:', err);
    showToast('No se pudo conectar con la base de datos.','error');
  }
  ocultarSpinner();
}

/* ══════════════════════════════════════════════════════════════════
   SPINNER
══════════════════════════════════════════════════════════════════ */
function crearSpinner() {
  const s = document.createElement('div'); s.id='dbSpinner';
  s.innerHTML = `<div class="spinner-inner"><div class="spinner-ring"></div><p>Cargando portafolio...</p></div>`;
  document.body.appendChild(s);
}
function mostrarSpinner() { const s=document.getElementById('dbSpinner'); if(s) s.style.display='flex'; }
function ocultarSpinner() { const s=document.getElementById('dbSpinner'); if(s) s.style.display='none'; }

/* ══════════════════════════════════════════════════════════════════
   UI GENERAL
══════════════════════════════════════════════════════════════════ */
function hideSplash() { setTimeout(()=>document.getElementById('splash').classList.add('hidden'), 1800); }

/* Cursor */
let mouseX=0,mouseY=0,curX=0,curY=0;
const cursor=document.getElementById('cursor'), cursorDot=document.getElementById('cursorDot');
document.addEventListener('mousemove',e=>{ mouseX=e.clientX;mouseY=e.clientY; cursorDot.style.left=mouseX+'px';cursorDot.style.top=mouseY+'px'; });
function animateCursor(){ curX+=(mouseX-curX)*.12; curY+=(mouseY-curY)*.12; cursor.style.left=curX+'px';cursor.style.top=curY+'px'; requestAnimationFrame(animateCursor); }

/* Navegación */
const navLinks=document.querySelectorAll('.nav-link'), progressBar=document.getElementById('progressBar');
const sidenav=document.getElementById('sidenav'), hamburger=document.getElementById('hamburger');
const backToTop=document.getElementById('backToTop'), navBackdrop=document.getElementById('navBackdrop');
function openNav(){sidenav.classList.add('open');navBackdrop.classList.add('show');hamburger.innerHTML='<i class="ph-bold ph-x"></i>';}
function closeNav(){sidenav.classList.remove('open');navBackdrop.classList.remove('show');hamburger.innerHTML='<i class="ph-bold ph-list"></i>';}
hamburger.addEventListener('click',()=>sidenav.classList.contains('open')?closeNav():openNav());
navBackdrop.addEventListener('click',closeNav);
navLinks.forEach(l=>l.addEventListener('click',closeNav));
backToTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
function onScroll(){
  const st=window.scrollY,dh=document.body.scrollHeight-window.innerHeight;
  progressBar.style.height=dh>0?(st/dh*100)+'%':'0%';
  backToTop.classList.toggle('show',st>300);
  document.querySelectorAll('main .section').forEach(sec=>{
    const r=sec.getBoundingClientRect();
    if(r.top<=120&&r.bottom>=120){ navLinks.forEach(l=>l.classList.remove('active')); const lnk=document.querySelector(`.nav-link[href="#${sec.id}"]`); if(lnk)lnk.classList.add('active'); }
  });
}
window.addEventListener('scroll',onScroll,{passive:true});

/* Reveal al scroll */
const revealObs=new IntersectionObserver((entries)=>{ entries.forEach(e=>{ if(e.isIntersecting)e.target.classList.add('visible'); }); },{threshold:.12,rootMargin:'0px 0px -60px 0px'});
function registerReveal(){ document.querySelectorAll('.reveal').forEach(el=>revealObs.observe(el)); }

/* Partículas */
function createParticles(){
  const c=document.getElementById('particles'); if(!c)return;
  for(let i=0;i<30;i++){const p=document.createElement('div');p.className='particle';const sz=Math.random()*6+3,lft=Math.random()*100,dly=Math.random()*12,dur=Math.random()*10+8;p.style.cssText=`width:${sz}px;height:${sz}px;left:${lft}%;animation-duration:${dur}s;animation-delay:-${dly}s;`;c.appendChild(p);}
}

/* Toast */
const toastEl=document.getElementById('toast'); let toastTimer;
function showToast(msg,tipo='ok'){toastEl.textContent=(tipo==='ok'?'✅ ':'⚠️ ')+msg;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),3500);}

/* Modales */
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
document.getElementById('closeConfig').addEventListener('click',()=>closeModal('modalConfig'));
document.getElementById('closeActividad').addEventListener('click',()=>closeModal('modalActividad'));
document.getElementById('closeReflexion').addEventListener('click',()=>closeModal('modalReflexion'));
document.getElementById('closeDetalle').addEventListener('click',()=>closeModal('modalDetalle'));
document.getElementById('closeRubrica').addEventListener('click',()=>closeModal('modalRubrica'));

/* ══════════════════════════════════════════════════════════════════
   FOTO DE PERFIL
══════════════════════════════════════════════════════════════════ */
const fotoInput=document.getElementById('fotoInput');
fotoInput.addEventListener('change',async e=>{
  if(!STATE.isAdmin) return;
  const file=e.target.files[0]; if(!file) return;
  if(!file.type.startsWith('image/')){showToast('Solo se permiten imágenes.','error');return;}
  const reader=new FileReader();
  reader.onload=async ev=>{ STATE.fotoPerfil=ev.target.result; applyFotoPerfil(STATE.fotoPerfil); await saveConfig(); showToast('Foto guardada.'); };
  reader.readAsDataURL(file);
});
function applyFotoPerfil(b64){
  document.getElementById('avatarInitials').style.display='none';
  const av=document.getElementById('profileAvatar');
  let img=av.querySelector('img');
  if(!img){img=document.createElement('img');av.appendChild(img);}
  img.src=b64; img.alt='Foto de perfil';
}

/* ══════════════════════════════════════════════════════════════════
   CONFIGURACIÓN
══════════════════════════════════════════════════════════════════ */
function openConfigModal(){
  if(!STATE.isAdmin) return;
  document.getElementById('inputNombre').value     = STATE.config.nombre    ||'';
  document.getElementById('inputMatricula').value  = STATE.config.matricula ||'';
  document.getElementById('inputAsignatura').value = STATE.config.asignatura||'';
  document.getElementById('inputFecha').value      = STATE.config.fecha     ||'';
  openModal('modalConfig');
}
async function guardarConfig(){
  if(!STATE.isAdmin) return;
  const nombre=document.getElementById('inputNombre').value.trim();
  if(!nombre){showToast('Por favor ingresa tu nombre.','error');return;}
  STATE.config.nombre     = nombre;
  STATE.config.matricula  = document.getElementById('inputMatricula').value.trim();
  STATE.config.asignatura = document.getElementById('inputAsignatura').value.trim();
  STATE.config.fecha      = document.getElementById('inputFecha').value;
  aplicarConfigUI(); await saveConfig(); closeModal('modalConfig');
  showToast('Configuración guardada.');
}
function aplicarConfigUI(){
  const {nombre,matricula,asignatura,fecha}=STATE.config;
  document.getElementById('metaNombre').innerHTML     = `<i class="ph-bold ph-user"></i> ${nombre||'Nombre del Estudiante'}`;
  document.getElementById('metaAsignatura').innerHTML = `<i class="ph-bold ph-book-open"></i> ${asignatura||'Asignatura'}`;
  document.getElementById('metaFecha').innerHTML      = `<i class="ph-bold ph-calendar"></i> ${fecha?formatDate(fecha):'Fecha de Inicio'}`;
  document.getElementById('profileNombre').textContent     = nombre||'Nombre del Estudiante';
  document.getElementById('profileAsignatura').textContent = asignatura||'—';
  document.getElementById('profileMatricula').innerHTML    = `<i class="ph-bold ph-identification-card"></i> Matrícula: ${matricula||'—'}`;
  if(nombre&&!STATE.fotoPerfil){ const ini=nombre.split(' ').filter(Boolean).map(w=>w[0].toUpperCase()).slice(0,2).join(''); document.getElementById('avatarInitials').textContent=ini||'?'; }
}
document.getElementById('btnConfig').addEventListener('click', openConfigModal);
document.getElementById('btnGuardarConfig').addEventListener('click', guardarConfig);

/* ══════════════════════════════════════════════════════════════════
   ACTIVIDADES (incluye proyectos — tipo "proyecto")
══════════════════════════════════════════════════════════════════ */
function renderActividades(filter='all'){
  const grid=document.getElementById('actividadesGrid'), empty=document.getElementById('emptyActividades');
  grid.querySelectorAll('.actividad-card').forEach(c=>c.remove());
  const lista=filter==='all'?STATE.actividades:STATE.actividades.filter(a=>a.tipo===filter);
  empty.style.display=lista.length===0?'block':'none';
  lista.forEach(act=>grid.appendChild(crearTarjetaActividad(act)));
  updateStats();
}
function crearTarjetaActividad(act){
  const card=document.createElement('div'); card.className='actividad-card'; card.dataset.tipo=act.tipo; card.dataset.id=act.id;
  const info={tarea:{label:'📝 Tarea',badge:'badge-tarea'},evaluacion:{label:'📊 Evaluación',badge:'badge-evaluacion'},proyecto:{label:'🚀 Proyecto',badge:'badge-proyecto'}}[act.tipo]||{label:act.tipo,badge:''};
  const nota=act.calificacion!==''?`<span class="card-nota">${parseFloat(act.calificacion).toFixed(1)}</span>`:`<span style="color:#555">Sin nota</span>`;
  const elimBtn=STATE.isAdmin?`<button class="btn-sm btn-danger" onclick="eliminarActividad('${act.id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>`:'';
  card.innerHTML=`
    <span class="card-tipo-badge ${info.badge}">${info.label}</span>
    <h3 class="card-titulo">${escapeHTML(act.nombre)}</h3>
    <p class="card-desc">${escapeHTML(act.descripcion||'—')}</p>
    <div class="card-footer"><span>${act.fecha?'📅 '+formatDate(act.fecha):''}</span>${nota}</div>
    <div class="card-actions">
      <button class="btn-sm" onclick="verDetalleActividad('${act.id}')"><i class="ph-bold ph-eye"></i> Ver más</button>
      ${elimBtn}
    </div>`;
  return card;
}
function verDetalleActividad(id){
  const act=STATE.actividades.find(a=>a.id===id); if(!act) return;
  document.getElementById('detalleContent').innerHTML=`
    <h2>${escapeHTML(act.nombre)}</h2>
    <p style="color:var(--gold);margin-bottom:1.5rem;text-transform:uppercase;font-size:.85rem">${act.tipo}</p>
    <h4 style="color:#aaa;margin-bottom:.4rem">Descripción</h4><p style="margin-bottom:1.5rem">${escapeHTML(act.descripcion||'—')}</p>
    <h4 style="color:#aaa;margin-bottom:.4rem">Reflexión personal</h4><p style="font-style:italic;color:#ccc;margin-bottom:1.5rem">${escapeHTML(act.reflexion||'—')}</p>
    ${act.calificacion!==''?`<h4 style="color:#aaa;margin-bottom:.4rem">Calificación</h4><p style="font-family:var(--font-disp);font-size:2rem;color:var(--gold)">${parseFloat(act.calificacion).toFixed(1)} / 10</p>`:''}
    ${act.enlace?`<h4 style="color:#aaa;margin-top:1.5rem;margin-bottom:.4rem">Enlace</h4><a href="${act.enlace}" target="_blank" style="color:var(--teal)">${act.enlace}</a>`:''}
    <p style="color:#555;font-size:.8rem;margin-top:2rem">📅 ${act.fecha?formatDate(act.fecha):'Sin fecha'}</p>`;
  openModal('modalDetalle');
}
async function eliminarActividad(id){
  if(!STATE.isAdmin) return;
  if(!confirm('¿Deseas eliminar esta actividad?')) return;
  await deleteActividad(id);
  STATE.actividades=STATE.actividades.filter(a=>a.id!==id);
  renderActividades(); updateGrafico();
  showToast('Actividad eliminada.');
}
async function guardarActividad(){
  if(!STATE.isAdmin) return;
  const nombre=document.getElementById('actNombre').value.trim();
  if(!nombre){showToast('El nombre es obligatorio.','error');return;}
  const a={id:'act_'+Date.now(),nombre,tipo:document.getElementById('actTipo').value,descripcion:document.getElementById('actDescripcion').value.trim(),fecha:document.getElementById('actFecha').value,calificacion:document.getElementById('actCalificacion').value,reflexion:document.getElementById('actReflexion').value.trim(),enlace:document.getElementById('actEnlace').value.trim(),creadoEn:new Date().toISOString()};
  await saveActividad(a); STATE.actividades.push(a); renderActividades(); updateGrafico();
  ['actNombre','actDescripcion','actFecha','actCalificacion','actReflexion','actEnlace'].forEach(id=>document.getElementById(id).value='');
  closeModal('modalActividad'); showToast('¡Actividad guardada!');
}
document.querySelectorAll('.filtro-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.filtro-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderActividades(btn.dataset.filter);});});
document.getElementById('btnAddActividad').addEventListener('click',()=>openModal('modalActividad'));
document.getElementById('btnGuardarActividad').addEventListener('click',guardarActividad);

/* ══════════════════════════════════════════════════════════════════
   REFLEXIONES
══════════════════════════════════════════════════════════════════ */
let selectedEmoji='😊';
function renderReflexiones(){
  const grid=document.getElementById('reflexionesGrid'), empty=document.getElementById('emptyReflexiones');
  grid.querySelectorAll('.reflexion-card').forEach(c=>c.remove());
  empty.style.display=STATE.reflexiones.length===0?'block':'none';
  STATE.reflexiones.forEach(r=>grid.insertBefore(crearTarjetaReflexion(r),empty));
  updateStats();
}
function crearTarjetaReflexion(r){
  const card=document.createElement('div'); card.className='reflexion-card';
  const fecha=r.creadoEn?new Date(r.creadoEn).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'}):'';
  const elimBtn=STATE.isAdmin?`<div class="card-actions" style="margin-top:.75rem"><button class="btn-sm btn-danger" onclick="eliminarReflexion('${r.id}')"><i class="ph-bold ph-trash"></i> Eliminar</button></div>`:'';
  card.innerHTML=`<span class="reflexion-emoji">${r.emoji||'💭'}</span><h4 class="reflexion-titulo">${escapeHTML(r.titulo||'Reflexión')}</h4><p class="reflexion-texto">${escapeHTML(r.contenido||'')}</p><p class="reflexion-fecha">📅 ${fecha}</p>${elimBtn}`;
  return card;
}
async function eliminarReflexion(id){
  if(!STATE.isAdmin) return;
  if(!confirm('¿Deseas eliminar esta reflexión?')) return;
  await deleteReflexion(id); STATE.reflexiones=STATE.reflexiones.filter(r=>r.id!==id); renderReflexiones(); showToast('Reflexión eliminada.');
}
async function guardarReflexion(){
  if(!STATE.isAdmin) return;
  const contenido=document.getElementById('refContenido').value.trim();
  if(!contenido){showToast('Escribe algo antes de guardar.','error');return;}
  const r={id:'ref_'+Date.now(),titulo:document.getElementById('refTitulo').value.trim()||'Reflexión',contenido,emoji:selectedEmoji,creadoEn:new Date().toISOString()};
  await saveReflexion(r); STATE.reflexiones.unshift(r); renderReflexiones();
  document.getElementById('refTitulo').value=''; document.getElementById('refContenido').value='';
  selectedEmoji='😊'; document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('active')); document.querySelector('.emoji-btn').classList.add('active');
  closeModal('modalReflexion'); showToast('¡Reflexión guardada!');
}
document.querySelectorAll('.emoji-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedEmoji=btn.dataset.emoji;});});
document.getElementById('btnAddReflexion').addEventListener('click',()=>openModal('modalReflexion'));
document.getElementById('btnGuardarReflexion').addEventListener('click',guardarReflexion);

/* ══════════════════════════════════════════════════════════════════
   COMENTARIOS — abiertos para TODOS los visitantes
══════════════════════════════════════════════════════════════════ */
function renderComentarios(){
  const lista=document.getElementById('comentariosLista'); lista.innerHTML='';
  if(STATE.comentarios.length===0){lista.innerHTML=`<div class="empty-state"><i class="ph-bold ph-chat-dots"></i><p>Sin comentarios aún. ¡Sé el primero en comentar!</p></div>`;return;}
  STATE.comentarios.forEach(c=>{
    const b=document.createElement('div'); b.className='comentario-burbuja';
    const fecha=c.creadoEn?new Date(c.creadoEn).toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    const autor=c.autor&&c.autor.trim()?c.autor:'Anónimo';
    b.innerHTML=`<div class="comentario-burbuja-autor"><i class="ph-bold ph-user-circle"></i>${escapeHTML(autor)}</div><p>${escapeHTML(c.texto)}</p><small>📅 ${fecha}</small>`;
    lista.appendChild(b);
  });
}
async function agregarComentario(){
  const input=document.getElementById('inputComentario');
  const autorInput=document.getElementById('inputAutorComentario');
  const texto=input.value.trim();
  if(!texto){showToast('Escribe un comentario antes de enviar.','error');return;}
  const c={id:'com_'+Date.now(),autor:autorInput.value.trim(),texto,creadoEn:new Date().toISOString()};
  await saveComentario(c); STATE.comentarios.push(c);
  input.value=''; autorInput.value=''; renderComentarios();
  showToast('¡Comentario enviado!');
}
document.getElementById('btnComentario').addEventListener('click', agregarComentario);
document.getElementById('inputComentario').addEventListener('keydown',e=>{ if(e.key==='Enter') agregarComentario(); });

/* ══════════════════════════════════════════════════════════════════
   GRÁFICO DE CALIFICACIONES
══════════════════════════════════════════════════════════════════ */
function updateGrafico(){
  const cont=document.getElementById('graficoBars'); cont.innerHTML='';
  const calificados=STATE.actividades.filter(a=>a.calificacion!=='').slice(-8);
  if(calificados.length===0){cont.innerHTML='<div class="grafico-empty">Agrega actividades con calificación para ver el gráfico</div>';updatePromedioUI(0,false);return;}
  calificados.forEach(item=>{
    const nota=parseFloat(item.calificacion),pct=(nota/10)*100;
    const color=nota>=7?'var(--gold)':nota>=5?'var(--teal)':'var(--rose)';
    const bi=document.createElement('div'); bi.className='bar-item';
    bi.innerHTML=`<span class="bar-valor">${nota.toFixed(1)}</span><div class="bar-fill" style="height:${pct}%;background:linear-gradient(to top,${color},${color}cc)"></div><span class="bar-label" title="${item.nombre}">${item.nombre.substring(0,10)}${item.nombre.length>10?'…':''}</span>`;
    cont.appendChild(bi);
  });
  const suma=calificados.reduce((a,i)=>a+parseFloat(i.calificacion),0);
  updatePromedioUI(suma/calificados.length,true);
}
function updatePromedioUI(valor=0,hayDatos=false){
  const c=document.getElementById('ringFill'),p=document.getElementById('promedioValor'),l=document.getElementById('promedioLabel');
  if(!hayDatos){p.textContent='—';l.textContent='Sin calificaciones';c.style.strokeDashoffset=326.7;return;}
  c.style.strokeDashoffset=326.7-(valor/10)*326.7; p.textContent=valor.toFixed(1);
  l.textContent=valor>=9?'🌟 Excelente':valor>=7?'✅ Bueno':valor>=5?'⚠️ Regular':'❌ Necesita mejorar';
}

/* ══════════════════════════════════════════════════════════════════
   ESTADÍSTICAS ANIMADAS
══════════════════════════════════════════════════════════════════ */
let prevStats={actividades:0,proyectos:0,reflexiones:0};
function animateCounter(el,target){const start=parseInt(el.textContent)||0,ts0=performance.now();function step(ts){const p=Math.min((ts-ts0)/600,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(start+(target-start)*e);if(p<1)requestAnimationFrame(step);}requestAnimationFrame(step);}
function updateStats(){
  const totalActs=STATE.actividades.length;
  const totalProys=STATE.actividades.filter(a=>a.tipo==='proyecto').length;
  const s={actividades:totalActs,proyectos:totalProys,reflexiones:STATE.reflexiones.length};
  if(s.actividades!==prevStats.actividades) animateCounter(document.getElementById('statActividades'),s.actividades);
  if(s.proyectos!==prevStats.proyectos)     animateCounter(document.getElementById('statProyectos'),s.proyectos);
  if(s.reflexiones!==prevStats.reflexiones) animateCounter(document.getElementById('statReflexiones'),s.reflexiones);
  prevStats={...s};
}

/* ══════════════════════════════════════════════════════════════════
   RÚBRICA EDITABLE
══════════════════════════════════════════════════════════════════ */
function renderRubrica(){
  const tbody=document.getElementById('rubricaBody'); tbody.innerHTML='';
  STATE.rubrica.forEach((crit,idx)=>{
    const tr=document.createElement('tr');
    const editCol=STATE.isAdmin?`<td class="col-editar"><button class="btn-rubrica-edit" onclick="abrirEditarCriterio(${idx})"><i class="ph-bold ph-pencil-simple"></i></button></td>`:'';
    tr.innerHTML=`<td><strong>${escapeHTML(crit.nombre)}</strong></td><td class="hide-xs">${escapeHTML(crit.descripcion)}</td><td><div class="rubrica-bar-wrap"><div class="rubrica-bar" style="--pct:${crit.pct}%">${crit.pct}%</div></div></td>${editCol}`;
    tbody.appendChild(tr);
  });
  actualizarTotalRubrica();
  buildVotoSliders(); /* Actualiza los sliders de votación cuando cambia la rúbrica */
}
function actualizarTotalRubrica(){
  const total=STATE.rubrica.reduce((a,c)=>a+c.pct,0);
  const tEl=document.getElementById('rubricaTotal'),mEl=document.getElementById('rubricaTotalMsg');
  tEl.textContent=total+'%';
  if(total===100){tEl.style.color='var(--teal)';mEl.textContent='✓ La suma es correcta';mEl.className='rubrica-total-msg ok';}
  else{tEl.style.color='var(--rose)';mEl.textContent=`⚠️ La suma debe ser 100%`;mEl.className='rubrica-total-msg';}
}
function abrirEditarCriterio(idx){
  if(!STATE.isAdmin) return;
  const c=STATE.rubrica[idx];
  document.getElementById('rubricaEditIdx').value=idx;
  document.getElementById('rubricaEditNombre').value=c.nombre;
  document.getElementById('rubricaEditDesc').value=c.descripcion;
  document.getElementById('rubricaEditPct').value=c.pct;
  openModal('modalRubrica');
}
async function guardarCriterioRubrica(){
  if(!STATE.isAdmin) return;
  const idx=parseInt(document.getElementById('rubricaEditIdx').value);
  const nombre=document.getElementById('rubricaEditNombre').value.trim();
  const desc=document.getElementById('rubricaEditDesc').value.trim();
  const pct=parseInt(document.getElementById('rubricaEditPct').value);
  if(!nombre){showToast('El nombre es obligatorio.','error');return;}
  if(isNaN(pct)||pct<1||pct>100){showToast('El porcentaje debe ser entre 1 y 100.','error');return;}
  STATE.rubrica[idx].nombre=nombre; STATE.rubrica[idx].descripcion=desc; STATE.rubrica[idx].pct=pct;
  await saveConfig(); renderRubrica(); closeModal('modalRubrica');
  showToast('Criterio guardado.');
}
document.getElementById('btnGuardarRubrica').addEventListener('click',guardarCriterioRubrica);

/* ══════════════════════════════════════════════════════════════════
   SISTEMA DE CALIFICACIONES DE VISITANTES
   - Cualquier persona puede calificar una sola vez
   - Guarda en Supabase tabla "votos"
   - Muestra historial con desglose por criterio
══════════════════════════════════════════════════════════════════ */

/* Genera los sliders del formulario de votación según los criterios actuales */
function buildVotoSliders(){
  const cont=document.getElementById('votoSliders'); if(!cont) return;
  cont.innerHTML='';
  STATE.rubrica.forEach(crit=>{
    const item=document.createElement('div'); item.className='voto-slider-item';
    item.innerHTML=`
      <label>${escapeHTML(crit.nombre)}</label>
      <input type="range" min="1" max="10" step="1" value="5" data-key="${crit.key}" data-peso="${crit.pct}"/>
      <span class="voto-slider-val" id="vslot_${crit.key}">5</span>`;
    cont.appendChild(item);
  });
  cont.querySelectorAll('input[type="range"]').forEach(input=>{
    input.addEventListener('input',()=>{
      const key=input.dataset.key, val=parseInt(input.value);
      document.getElementById(`vslot_${key}`).textContent=val;
      calcularVotoTotal();
    });
  });
  calcularVotoTotal();
}

/* Calcula y muestra el puntaje del voto actual */
function calcularVotoTotal(){
  let total=0;
  STATE.rubrica.forEach(crit=>{
    const input=document.querySelector(`#votoSliders [data-key="${crit.key}"]`);
    const val=input?parseInt(input.value):5;
    total+=(val/10)*crit.pct;
  });
  const el=document.getElementById('votoTotal'); if(el) el.textContent=total.toFixed(1);
  return total;
}

/* Actualiza la UI del panel de votación según si ya votó */
function actualizarVotoUI(){
  const form=document.getElementById('votoForm');
  const yaVotado=document.getElementById('votoYaVotado');
  if(!form||!yaVotado) return;
  if(yaVoto()){
    form.style.display='none'; yaVotado.style.display='flex';
    const miVoto=STATE.votos.find(v=>v.visitorId===getVisitorId());
    const textoEl=document.getElementById('votoYaVotadoTexto');
    if(textoEl&&miVoto) textoEl.textContent=`Ya votaste con un puntaje de ${miVoto.puntajeTotal.toFixed(1)} / 100.`;
  } else {
    form.style.display='block'; yaVotado.style.display='none';
  }
}

/* Enviar el voto */
async function enviarVoto(){
  if(yaVoto()){
    showToast('Ya registraste tu voto para este portafolio.','error'); return;
  }
  /* Recopilar los valores de los sliders */
  const desglose={};
  STATE.rubrica.forEach(crit=>{
    const input=document.querySelector(`#votoSliders [data-key="${crit.key}"]`);
    desglose[crit.key]={nombre:crit.nombre,valor:input?parseInt(input.value):5,peso:crit.pct};
  });
  const puntajeTotal=calcularVotoTotal();
  const nombre=document.getElementById('votoNombre').value.trim()||'Anónimo';
  const voto={
    id:          'voto_'+Date.now(),
    visitorId:   getVisitorId(),
    nombre,
    puntajeTotal,
    desglose,
    creadoEn:    new Date().toISOString()
  };
  const ok=await saveVoto(voto);
  if(ok){
    marcarVoto();               /* Guardar en localStorage que ya votó */
    STATE.votos.unshift(voto);  /* Agregar al inicio del historial */
    actualizarVotoUI();
    renderVotos();
    actualizarPromedioVotos();
    showToast('¡Gracias! Tu calificación fue registrada.');
  }
}

/* Renderiza el historial de votos recibidos */
function renderVotos(){
  const lista=document.getElementById('votosLista'); if(!lista) return;
  lista.innerHTML='';
  if(STATE.votos.length===0){
    lista.innerHTML=`<div class="empty-state" style="padding:2rem"><i class="ph-bold ph-star"></i><p>Aún no hay calificaciones. ¡Sé el primero!</p></div>`;
    return;
  }
  STATE.votos.forEach(v=>{
    const card=document.createElement('div'); card.className='voto-card';
    const fecha=v.creadoEn?new Date(v.creadoEn).toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    /* Construir desglose por criterio */
    let desgloseHTML='<div class="voto-desglose">';
    if(v.desglose&&typeof v.desglose==='object'){
      Object.values(v.desglose).forEach(d=>{
        const pct=(d.valor/10)*100;
        desgloseHTML+=`<div class="voto-desglose-item"><span>${escapeHTML(d.nombre)}</span><div class="voto-mini-bar"><div class="voto-mini-fill" style="width:${pct}%"></div></div><span>${d.valor}/10</span></div>`;
      });
    }
    desgloseHTML+='</div>';
    card.innerHTML=`
      <div class="voto-card-header">
        <span class="voto-card-nombre"><i class="ph-bold ph-user-circle"></i>${escapeHTML(v.nombre||'Anónimo')}</span>
        <span class="voto-card-puntaje">${(v.puntajeTotal||0).toFixed(1)}<small style="font-size:.75rem;color:#888">/100</small></span>
      </div>
      ${desgloseHTML}
      <p class="voto-card-fecha">📅 ${fecha}</p>`;
    lista.appendChild(card);
  });
}

/* Calcula y muestra el promedio global de todos los votos */
function actualizarPromedioVotos(){
  const numEl=document.getElementById('votosPromedioNum');
  const totEl=document.getElementById('votosTotalLabel');
  if(!numEl||!totEl) return;
  if(STATE.votos.length===0){ numEl.textContent='—'; totEl.textContent='0 votos'; return; }
  const suma=STATE.votos.reduce((a,v)=>a+(v.puntajeTotal||0),0);
  numEl.textContent=(suma/STATE.votos.length).toFixed(1);
  totEl.textContent=`${STATE.votos.length} voto${STATE.votos.length!==1?'s':''}`;
}

document.getElementById('btnEnviarVoto').addEventListener('click', enviarVoto);

/* ══════════════════════════════════════════════════════════════════
   CAMPOS EDITABLES (auto-guardan al dejar de escribir)
══════════════════════════════════════════════════════════════════ */
function setupEditables(){
  let editTimer;
  ['presentacionTexto','objetivoTexto','refAprendizajes','refFortalezas','refMejorar','refObjetivos'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('input',()=>{
      if(!STATE.isAdmin) return;
      clearTimeout(editTimer);
      editTimer=setTimeout(()=>saveConfig(),1500);
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   RESTAURAR INTERFAZ CON DATOS CARGADOS
══════════════════════════════════════════════════════════════════ */
function restoreUI(){
  aplicarConfigUI();
  if(STATE.fotoPerfil) applyFotoPerfil(STATE.fotoPerfil);
  if(STATE.config.presentacion) document.getElementById('presentacionTexto').innerText=STATE.config.presentacion;
  if(STATE.config.objetivo)     document.getElementById('objetivoTexto').innerText=STATE.config.objetivo;
  if(STATE.reflexionesFinales.aprendizajes) document.getElementById('refAprendizajes').innerText=STATE.reflexionesFinales.aprendizajes;
  if(STATE.reflexionesFinales.fortalezas)   document.getElementById('refFortalezas').innerText=STATE.reflexionesFinales.fortalezas;
  if(STATE.reflexionesFinales.mejorar)      document.getElementById('refMejorar').innerText=STATE.reflexionesFinales.mejorar;
  if(STATE.reflexionesFinales.objetivos)    document.getElementById('refObjetivos').innerText=STATE.reflexionesFinales.objetivos;
}

/* ══════════════════════════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════════════════════════ */
function formatDate(str){ if(!str) return '—'; return new Date(str+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}); }
function escapeHTML(str){ if(!str) return ''; return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

/* Estilos del spinner y animación shake */
function injectStyles(){
  const style=document.createElement('style');
  style.textContent=`
    @keyframes shake{0%,100%{transform:scale(1) translateY(0)}20%{transform:scale(1) translateX(-8px)}40%{transform:scale(1) translateX(8px)}60%{transform:scale(1) translateX(-5px)}80%{transform:scale(1) translateX(5px)}}
    #dbSpinner{position:fixed;inset:0;background:rgba(10,10,18,.92);z-index:9997;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1.5rem}
    .spinner-inner{display:flex;flex-direction:column;align-items:center;gap:1rem}
    .spinner-ring{width:56px;height:56px;border-radius:50%;border:4px solid rgba(212,168,67,.2);border-top-color:#d4a843;animation:spinRing .8s linear infinite}
    @keyframes spinRing{to{transform:rotate(360deg)}}
    .spinner-inner p{color:#888;font-family:'DM Sans',sans-serif;font-size:.95rem;letter-spacing:.05em}
  `;
  document.head.appendChild(style);
}

/* ══════════════════════════════════════════════════════════════════
   INICIO
══════════════════════════════════════════════════════════════════ */
async function init(){
  injectStyles();
  crearSpinner();
  createParticles();
  animateCursor();
  checkSavedSession();

  await loadAllFromSupabase();

  restoreUI();
  applyRole();
  renderRubrica();         /* También construye los sliders de votación */
  renderActividades();
  renderReflexiones();
  renderComentarios();
  renderVotos();
  actualizarPromedioVotos();
  actualizarVotoUI();
  updateGrafico();
  setupEditables();
  registerReveal();
  onScroll();
  hideSplash();

  console.log('✅ Portafolio listo. Rol:', STATE.isAdmin?'Admin':'Visitante');
}

document.addEventListener('DOMContentLoaded', init);
