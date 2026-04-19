/* ================================================================
   PORTAFOLIO DIGITAL — script.js
   Sistema de autenticación: Admin vs Invitado
   Base de datos: Supabase
   ================================================================ */


/* ── 1. CONEXIÓN A SUPABASE ── */
const SUPABASE_URL = 'https://rufuligjvtareuqigzti.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZnVsaWdqdnRhcmV1cWlnenRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDY2NjYsImV4cCI6MjA5MjEyMjY2Nn0.b7qkuT-0WeMEnhtaJJ2s8In6O5Rkau0HjR9f-B-pARo';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const PORTFOLIO_ID = 1;


/* ── 2. CREDENCIALES DE ADMINISTRADOR ────────────────────────────
   La matrícula y contraseña del admin.
   Si quieres cambiarlas en el futuro, solo cambia estos dos valores. */
const ADMIN_MATRICULA = '2026-1072';
const ADMIN_PASSWORD  = 'Rosanny1009';

/* Clave con la que guardamos la sesión en el navegador.
   Así el admin no tiene que iniciar sesión cada vez que abre la página. */
const SESSION_KEY = 'portafolio_admin_session';


/* ── 3. ESTADO GLOBAL ── */
const STATE = {
  /* Si la sesión actual es del admin (true) o invitado (false) */
  isAdmin: false,

  config: { nombre:'', matricula:'', asignatura:'', fecha:'', presentacion:'', objetivo:'' },
  fotoPerfil: null,
  actividades: [],
  proyectos: [],
  reflexiones: [],
  comentarios: [],
  reflexionesFinales: { aprendizajes:'', fortalezas:'', mejorar:'', objetivos:'' },
  autoevaluacion: { enviada:false, valores:{} },
  rubrica: [
    { key:'contenido',    nombre:'Contenido',             pct:40, descripcion:'Completitud de las tareas, calidad de las respuestas y profundidad de las reflexiones.' },
    { key:'organizacion', nombre:'Organización',          pct:20, descripcion:'Estructura clara del portafolio, uso adecuado de carpetas y facilidad de navegación.' },
    { key:'reflexion',    nombre:'Reflexión',             pct:20, descripcion:'Evidencia de reflexión sobre el aprendizaje, identificación de fortalezas y debilidades.' },
    { key:'herramientas', nombre:'Herramientas Digitales',pct:20, descripcion:'Dominio de la herramienta seleccionada, presentación clara y profesional.' }
  ]
};


/* ══════════════════════════════════════════════════════════════════
   SISTEMA DE AUTENTICACIÓN
   ══════════════════════════════════════════════════════════════════ */

/* ── 4. VERIFICAR SI YA HAY UNA SESIÓN GUARDADA ─────────────────
   Cuando el admin inicia sesión, guardamos una marca en el navegador.
   Así, si cierra y vuelve a abrir la página, sigue como admin. */
function checkSavedSession() {
  const saved = sessionStorage.getItem(SESSION_KEY);
  /* sessionStorage dura hasta que se cierra el navegador,
     igual que una sesión normal de cualquier web */
  if (saved === 'true') {
    STATE.isAdmin = true;
  }
}

/* Guarda la sesión de admin en el navegador */
function saveSession() {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

/* Borra la sesión de admin (cerrar sesión) */
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/* ── 5. APLICAR EL ROL A TODA LA INTERFAZ ────────────────────────
   Esta función muestra u oculta elementos según el rol.
   Se llama cada vez que el rol cambia (login / logout). */
function applyRole() {
  const isAdmin = STATE.isAdmin;

  /* ── Botón del círculo de auth ── */
  const circle  = document.getElementById('authCircleBtn');
  const dot     = document.getElementById('authStatusDot');
  const icon    = document.getElementById('authCircleIcon');

  if (isAdmin) {
    /* Admin: círculo dorado, ícono de escudo, punto dorado */
    circle.classList.add('is-admin');
    dot.classList.add('is-admin');
    icon.className = 'ph-bold ph-shield-check';
    circle.title   = 'Sesión admin activa — clic para opciones';
  } else {
    /* Invitado: círculo gris, ícono de usuario, punto gris */
    circle.classList.remove('is-admin');
    dot.classList.remove('is-admin');
    icon.className = 'ph-bold ph-user';
    circle.title   = 'Iniciar sesión como administrador';
  }

  /* ── Todos los elementos con clase .admin-only ──
     El admin los ve; el invitado no los ve. */
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  /* ── La etiqueta "Modo visitante" ──
     El invitado la ve; el admin no. */
  const guestBadge = document.getElementById('guestBadge');
  if (guestBadge) guestBadge.style.display = isAdmin ? 'none' : 'inline-flex';

  /* ── Bloques de texto editables ──
     Admin: puede editar. Invitado: solo puede leer. */
  const editables = ['presentacionTexto','objetivoTexto','refAprendizajes','refFortalezas','refMejorar','refObjetivos'];
  editables.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isAdmin) {
      el.contentEditable = 'true';
      el.classList.remove('read-only');
    } else {
      el.contentEditable = 'false';
      el.classList.add('read-only');
    }
  });

  /* ── Avatar de perfil ──
     Admin: cursor de mano (puede cambiar foto).
     Invitado: cursor normal, sin capa de cámara. */
  const avatar = document.getElementById('profileAvatar');
  if (isAdmin) {
    avatar.classList.remove('guest-mode');
    avatar.style.cursor = 'pointer';
  } else {
    avatar.classList.add('guest-mode');
    avatar.style.cursor = 'default';
  }

  /* ── Columna "Editar" de la rúbrica ──
     Admin: visible. Invitado: oculta. */
  document.querySelectorAll('.col-editar').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  /* ── Descripción de la rúbrica ──
     Para el admin le recordamos que puede editar. */
  const rubDesc = document.getElementById('rubricaDesc');
  if (rubDesc) {
    rubDesc.textContent = isAdmin
      ? 'Criterios de evaluación. Haz clic en el lápiz ✏️ para editar cualquier criterio.'
      : 'Criterios con los que será evaluado este portafolio.';
  }

  /* ── Botón de foto ──
     Solo el admin puede hacer clic en el avatar para cambiar la foto */
  const fotoInput = document.getElementById('fotoInput');
  if (!isAdmin && fotoInput) {
    /* Desconectamos el evento de clic en el avatar para invitados */
    document.getElementById('profileAvatar').onclick = null;
  } else if (isAdmin && fotoInput) {
    document.getElementById('profileAvatar').onclick = () => fotoInput.click();
  }

  /* Volvemos a dibujar la rúbrica para mostrar/ocultar la columna de editar */
  renderRubrica();
}

/* ── 6. BOTÓN DEL CÍRCULO DE AUTH ────────────────────────────────
   Si el usuario es invitado → abre el modal de login.
   Si ya es admin → abre el menú de sesión activa. */
document.getElementById('authCircleBtn').addEventListener('click', () => {
  if (STATE.isAdmin) {
    /* Ya está logueado: mostrar opciones de admin */
    document.getElementById('adminMenuMatricula').textContent = ADMIN_MATRICULA;
    openModal('modalAdminMenu');
  } else {
    /* No está logueado: abrir formulario de login */
    document.getElementById('loginMatricula').value = '';
    document.getElementById('loginPassword').value  = '';
    document.getElementById('loginError').style.display = 'none';
    openModal('modalLogin');
    /* Enfocar el campo de matrícula automáticamente */
    setTimeout(() => document.getElementById('loginMatricula').focus(), 300);
  }
});

/* ── 7. INICIAR SESIÓN ───────────────────────────────────────────
   Verifica la matrícula y contraseña.
   Si son correctas, activa el modo admin. */
function intentarLogin() {
  const matricula = document.getElementById('loginMatricula').value.trim();
  const password  = document.getElementById('loginPassword').value;
  const errorEl   = document.getElementById('loginError');

  /* Comparamos exactamente con las credenciales definidas arriba */
  if (matricula === ADMIN_MATRICULA && password === ADMIN_PASSWORD) {
    /* ✅ Credenciales correctas */
    STATE.isAdmin = true;
    saveSession();        /* Guardar sesión para que persista */
    closeModal('modalLogin');
    applyRole();          /* Actualizar toda la interfaz */
    showToast('Bienvenida, Administradora. Modo edición activo.');
  } else {
    /* ❌ Credenciales incorrectas */
    errorEl.style.display = 'flex';
    /* Sacudir el modal para indicar error */
    const modal = document.querySelector('#modalLogin .modal');
    modal.style.animation = 'none';
    modal.offsetHeight;    /* Forzar reflow para reiniciar la animación */
    modal.style.animation = 'shake .4s var(--ease)';
    /* Limpiar el campo de contraseña */
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
  }
}

/* ── 8. CERRAR SESIÓN ────────────────────────────────────────────
   Vuelve al modo invitado */
function cerrarSesion() {
  STATE.isAdmin = false;
  clearSession();
  closeModal('modalAdminMenu');
  applyRole();
  showToast('Sesión cerrada. Volviste al modo visitante.');
}

/* Botón de login dentro del modal */
document.getElementById('btnLoginSubmit').addEventListener('click', intentarLogin);

/* También iniciar sesión con Enter en cualquier campo del formulario */
['loginMatricula','loginPassword'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') intentarLogin();
  });
});

/* Botón de cerrar sesión del modal de admin */
document.getElementById('btnLogout').addEventListener('click', cerrarSesion);

/* Cerrar modales de auth */
document.getElementById('closeLogin').addEventListener('click',     () => closeModal('modalLogin'));
document.getElementById('closeAdminMenu').addEventListener('click', () => closeModal('modalAdminMenu'));

/* ── 9. BOTÓN PARA MOSTRAR/OCULTAR CONTRASEÑA ─────────────────── */
document.getElementById('btnTogglePw').addEventListener('click', () => {
  const input   = document.getElementById('loginPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  if (input.type === 'password') {
    input.type         = 'text';
    eyeIcon.className  = 'ph-bold ph-eye-slash';
  } else {
    input.type         = 'password';
    eyeIcon.className  = 'ph-bold ph-eye';
  }
});

/* Inyectamos la animación de sacudida (shake) para cuando falla el login */
function injectAuthStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100% { transform:scale(1) translateY(0); }
      20%      { transform:scale(1) translateX(-8px); }
      40%      { transform:scale(1) translateX(8px); }
      60%      { transform:scale(1) translateX(-5px); }
      80%      { transform:scale(1) translateX(5px); }
    }
    /* Spinner de carga */
    #dbSpinner { position:fixed; inset:0; background:rgba(10,10,18,.92); z-index:9997; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:1.5rem; }
    .spinner-inner { display:flex; flex-direction:column; align-items:center; gap:1rem; }
    .spinner-ring { width:56px; height:56px; border-radius:50%; border:4px solid rgba(212,168,67,.2); border-top-color:#d4a843; animation:spinRing .8s linear infinite; }
    @keyframes spinRing { to { transform:rotate(360deg); } }
    .spinner-inner p { color:#888; font-family:'DM Sans',sans-serif; font-size:.95rem; letter-spacing:.05em; }
  `;
  document.head.appendChild(style);
}


/* ══════════════════════════════════════════════════════════════════
   SUPABASE — GUARDAR Y CARGAR DATOS
   ══════════════════════════════════════════════════════════════════ */

/* ── 10. GUARDAR CONFIGURACIÓN EN SUPABASE ── */
async function saveConfig() {
  /* Solo el admin puede guardar */
  if (!STATE.isAdmin) return;

  STATE.config.presentacion             = document.getElementById('presentacionTexto').innerText;
  STATE.config.objetivo                 = document.getElementById('objetivoTexto').innerText;
  STATE.reflexionesFinales.aprendizajes = document.getElementById('refAprendizajes').innerText;
  STATE.reflexionesFinales.fortalezas   = document.getElementById('refFortalezas').innerText;
  STATE.reflexionesFinales.mejorar      = document.getElementById('refMejorar').innerText;
  STATE.reflexionesFinales.objetivos    = document.getElementById('refObjetivos').innerText;

  const { error } = await db.from('config').upsert({
    id:               PORTFOLIO_ID,
    nombre:           STATE.config.nombre,
    matricula:        STATE.config.matricula,
    asignatura:       STATE.config.asignatura,
    fecha_inicio:     STATE.config.fecha || null,
    presentacion:     STATE.config.presentacion,
    objetivo:         STATE.config.objetivo,
    foto_perfil:      STATE.fotoPerfil,
    ref_aprendizajes: STATE.reflexionesFinales.aprendizajes,
    ref_fortalezas:   STATE.reflexionesFinales.fortalezas,
    ref_mejorar:      STATE.reflexionesFinales.mejorar,
    ref_objetivos:    STATE.reflexionesFinales.objetivos,
    auto_enviada:     STATE.autoevaluacion.enviada,
    auto_valores:     STATE.autoevaluacion.valores,
    rubrica:          STATE.rubrica
  });
  if (error) { console.error('Error guardando config:', error.message); showToast('Error al guardar.', 'error'); }
}

async function saveActividad(act) {
  if (!STATE.isAdmin) return;
  const { error } = await db.from('actividades').insert({ id:act.id, nombre:act.nombre, tipo:act.tipo, descripcion:act.descripcion, fecha_entrega:act.fecha||null, calificacion:act.calificacion!==''?parseFloat(act.calificacion):null, reflexion:act.reflexion, enlace:act.enlace, creado_en:act.creadoEn });
  if (error) { console.error('Error guardando actividad:', error.message); showToast('Error al guardar actividad.', 'error'); }
}
async function deleteActividad(id) {
  if (!STATE.isAdmin) return;
  const { error } = await db.from('actividades').delete().eq('id', id);
  if (error) console.error('Error eliminando actividad:', error.message);
}
async function saveProyecto(p) {
  if (!STATE.isAdmin) return;
  const { error } = await db.from('proyectos').insert({ id:p.id, nombre:p.nombre, descripcion:p.descripcion, fases:p.fases, resultados:p.resultados, reflexion:p.reflexion, calificacion:p.calificacion!==''?parseFloat(p.calificacion):null, creado_en:p.creadoEn });
  if (error) { console.error('Error guardando proyecto:', error.message); showToast('Error al guardar proyecto.', 'error'); }
}
async function deleteProyecto(id) {
  if (!STATE.isAdmin) return;
  const { error } = await db.from('proyectos').delete().eq('id', id);
  if (error) console.error('Error eliminando proyecto:', error.message);
}
async function saveReflexion(r) {
  if (!STATE.isAdmin) return;
  const { error } = await db.from('reflexiones').insert({ id:r.id, titulo:r.titulo, contenido:r.contenido, emoji:r.emoji, creado_en:r.creadoEn });
  if (error) { console.error('Error guardando reflexión:', error.message); showToast('Error al guardar reflexión.', 'error'); }
}
async function deleteReflexion(id) {
  if (!STATE.isAdmin) return;
  const { error } = await db.from('reflexiones').delete().eq('id', id);
  if (error) console.error('Error eliminando reflexión:', error.message);
}
async function saveComentario(c) {
  if (!STATE.isAdmin) return;
  const { error } = await db.from('comentarios').insert({ id:c.id, texto:c.texto, creado_en:c.creadoEn });
  if (error) { console.error('Error guardando comentario:', error.message); showToast('Error al guardar comentario.', 'error'); }
}

/* ── 11. CARGAR TODOS LOS DATOS DESDE SUPABASE ── */
async function loadAllFromSupabase() {
  mostrarSpinner();
  try {
    const [{ data:cfg }, { data:acts }, { data:proys }, { data:refs }, { data:coms }] = await Promise.all([
      db.from('config').select('*').eq('id', PORTFOLIO_ID).single(),
      db.from('actividades').select('*').order('creado_en', { ascending:true }),
      db.from('proyectos').select('*').order('creado_en', { ascending:true }),
      db.from('reflexiones').select('*').order('creado_en', { ascending:false }),
      db.from('comentarios').select('*').order('creado_en', { ascending:true })
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
      STATE.autoevaluacion.enviada = cfg.auto_enviada || false;
      STATE.autoevaluacion.valores = cfg.auto_valores || {};
      if (cfg.rubrica && cfg.rubrica.length) STATE.rubrica = cfg.rubrica;
    }
    if (acts) STATE.actividades = acts.map(a => ({ id:a.id, nombre:a.nombre, tipo:a.tipo, descripcion:a.descripcion||'', fecha:a.fecha_entrega||'', calificacion:a.calificacion!==null?String(a.calificacion):'', reflexion:a.reflexion||'', enlace:a.enlace||'', creadoEn:a.creado_en }));
    if (proys) STATE.proyectos = proys.map(p => ({ id:p.id, nombre:p.nombre, descripcion:p.descripcion||'', fases:p.fases||'', resultados:p.resultados||'', reflexion:p.reflexion||'', calificacion:p.calificacion!==null?String(p.calificacion):'', creadoEn:p.creado_en }));
    if (refs) STATE.reflexiones = refs.map(r => ({ id:r.id, titulo:r.titulo||'Reflexión', contenido:r.contenido||'', emoji:r.emoji||'💭', creadoEn:r.creado_en }));
    if (coms) STATE.comentarios = coms.map(c => ({ id:c.id, texto:c.texto, creadoEn:c.creado_en }));
  } catch (err) {
    console.error('Error cargando datos:', err);
    showToast('No se pudo conectar con la base de datos.', 'error');
  }
  ocultarSpinner();
}


/* ══════════════════════════════════════════════════════════════════
   SPINNER DE CARGA
   ══════════════════════════════════════════════════════════════════ */

function crearSpinner() {
  const s = document.createElement('div');
  s.id = 'dbSpinner';
  s.innerHTML = `<div class="spinner-inner"><div class="spinner-ring"></div><p>Cargando portafolio...</p></div>`;
  document.body.appendChild(s);
}
function mostrarSpinner() { const s=document.getElementById('dbSpinner'); if(s) s.style.display='flex'; }
function ocultarSpinner() { const s=document.getElementById('dbSpinner'); if(s) s.style.display='none'; }


/* ══════════════════════════════════════════════════════════════════
   UI GENERAL
   ══════════════════════════════════════════════════════════════════ */

/* ── 12. SPLASH ── */
function hideSplash() {
  setTimeout(() => document.getElementById('splash').classList.add('hidden'), 1800);
}

/* ── 13. CURSOR ── */
let mouseX=0, mouseY=0, curX=0, curY=0;
const cursor    = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
document.addEventListener('mousemove', e => {
  mouseX=e.clientX; mouseY=e.clientY;
  cursorDot.style.left=mouseX+'px'; cursorDot.style.top=mouseY+'px';
});
function animateCursor() {
  curX+=(mouseX-curX)*.12; curY+=(mouseY-curY)*.12;
  cursor.style.left=curX+'px'; cursor.style.top=curY+'px';
  requestAnimationFrame(animateCursor);
}

/* ── 14. NAVEGACIÓN ── */
const navLinks    = document.querySelectorAll('.nav-link');
const progressBar = document.getElementById('progressBar');
const sidenav     = document.getElementById('sidenav');
const hamburger   = document.getElementById('hamburger');
const backToTop   = document.getElementById('backToTop');
const navBackdrop = document.getElementById('navBackdrop');

function openNav()  { sidenav.classList.add('open'); navBackdrop.classList.add('show'); hamburger.innerHTML='<i class="ph-bold ph-x"></i>'; }
function closeNav() { sidenav.classList.remove('open'); navBackdrop.classList.remove('show'); hamburger.innerHTML='<i class="ph-bold ph-list"></i>'; }

hamburger.addEventListener('click', () => sidenav.classList.contains('open') ? closeNav() : openNav());
navBackdrop.addEventListener('click', closeNav);
navLinks.forEach(link => link.addEventListener('click', closeNav));
backToTop.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));

function onScroll() {
  const st=window.scrollY, dh=document.body.scrollHeight-window.innerHeight;
  progressBar.style.height = dh>0?(st/dh*100)+'%':'0%';
  backToTop.classList.toggle('show', st>300);
  document.querySelectorAll('main .section').forEach(sec => {
    const r=sec.getBoundingClientRect();
    if (r.top<=120&&r.bottom>=120) {
      navLinks.forEach(l=>l.classList.remove('active'));
      const lnk=document.querySelector(`.nav-link[href="#${sec.id}"]`);
      if(lnk) lnk.classList.add('active');
    }
  });
}
window.addEventListener('scroll', onScroll, {passive:true});

/* ── 15. REVEAL AL HACER SCROLL ── */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
}, {threshold:.12, rootMargin:'0px 0px -60px 0px'});
function registerReveal() { document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el)); }

/* ── 16. PARTÍCULAS ── */
function createParticles() {
  const c = document.getElementById('particles'); if(!c) return;
  for(let i=0;i<30;i++) {
    const p=document.createElement('div'); p.className='particle';
    const sz=Math.random()*6+3, lft=Math.random()*100, dly=Math.random()*12, dur=Math.random()*10+8;
    p.style.cssText=`width:${sz}px;height:${sz}px;left:${lft}%;animation-duration:${dur}s;animation-delay:-${dly}s;`;
    c.appendChild(p);
  }
}

/* ── 17. TOAST ── */
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, tipo='ok') {
  toastEl.textContent=(tipo==='ok'?'✅ ':'⚠️ ')+msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toastEl.classList.remove('show'),3500);
}

/* ── 18. MODALES ── */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if(e.target===o) o.classList.remove('open'); });
});
document.getElementById('closeConfig').addEventListener('click',    ()=>closeModal('modalConfig'));
document.getElementById('closeActividad').addEventListener('click', ()=>closeModal('modalActividad'));
document.getElementById('closeProyecto').addEventListener('click',  ()=>closeModal('modalProyecto'));
document.getElementById('closeReflexion').addEventListener('click', ()=>closeModal('modalReflexion'));
document.getElementById('closeDetalle').addEventListener('click',   ()=>closeModal('modalDetalle'));
document.getElementById('closeRubrica').addEventListener('click',   ()=>closeModal('modalRubrica'));


/* ── 19. FOTO DE PERFIL ── */
const fotoInput = document.getElementById('fotoInput');
fotoInput.addEventListener('change', async e => {
  /* Solo el admin puede cambiar la foto */
  if (!STATE.isAdmin) return;
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes.','error'); return; }
  if (file.size > 2*1024*1024) showToast('Imagen grande, puede tardar...','ok');
  const reader = new FileReader();
  reader.onload = async ev => {
    STATE.fotoPerfil = ev.target.result;
    applyFotoPerfil(STATE.fotoPerfil);
    await saveConfig();
    showToast('Foto de perfil guardada.');
  };
  reader.readAsDataURL(file);
});

function applyFotoPerfil(base64) {
  document.getElementById('avatarInitials').style.display='none';
  const av = document.getElementById('profileAvatar');
  let img = av.querySelector('img');
  if (!img) { img=document.createElement('img'); av.appendChild(img); }
  img.src=base64; img.alt='Foto de perfil';
}

/* ── 20. CONFIGURACIÓN DEL PORTAFOLIO ── */
function openConfigModal() {
  if (!STATE.isAdmin) return;
  document.getElementById('inputNombre').value     = STATE.config.nombre    ||'';
  document.getElementById('inputMatricula').value  = STATE.config.matricula ||'';
  document.getElementById('inputAsignatura').value = STATE.config.asignatura||'';
  document.getElementById('inputFecha').value      = STATE.config.fecha     ||'';
  openModal('modalConfig');
}

async function guardarConfig() {
  if (!STATE.isAdmin) return;
  const nombre=document.getElementById('inputNombre').value.trim();
  if (!nombre) { showToast('Por favor ingresa tu nombre.','error'); return; }
  STATE.config.nombre     = nombre;
  STATE.config.matricula  = document.getElementById('inputMatricula').value.trim();
  STATE.config.asignatura = document.getElementById('inputAsignatura').value.trim();
  STATE.config.fecha      = document.getElementById('inputFecha').value;
  aplicarConfigUI();
  await saveConfig();
  closeModal('modalConfig');
  showToast('Configuración guardada en la nube.');
}

function aplicarConfigUI() {
  const {nombre,matricula,asignatura,fecha} = STATE.config;
  document.getElementById('metaNombre').innerHTML     = `<i class="ph-bold ph-user"></i> ${nombre||'Nombre del Estudiante'}`;
  document.getElementById('metaAsignatura').innerHTML = `<i class="ph-bold ph-book-open"></i> ${asignatura||'Asignatura'}`;
  document.getElementById('metaFecha').innerHTML      = `<i class="ph-bold ph-calendar"></i> ${fecha?formatDate(fecha):'Fecha de Inicio'}`;
  document.getElementById('profileNombre').textContent     = nombre||'Nombre del Estudiante';
  document.getElementById('profileAsignatura').textContent = asignatura||'—';
  document.getElementById('profileMatricula').innerHTML    = `<i class="ph-bold ph-identification-card"></i> Matrícula: ${matricula||'—'}`;
  if (nombre && !STATE.fotoPerfil) {
    const ini=nombre.split(' ').filter(Boolean).map(w=>w[0].toUpperCase()).slice(0,2).join('');
    document.getElementById('avatarInitials').textContent=ini||'?';
  }
}

document.getElementById('btnConfig').addEventListener('click', openConfigModal);
document.getElementById('btnGuardarConfig').addEventListener('click', guardarConfig);

/* ── 21. ACTIVIDADES ── */
function renderActividades(filter='all') {
  const grid=document.getElementById('actividadesGrid');
  const empty=document.getElementById('emptyActividades');
  grid.querySelectorAll('.actividad-card').forEach(c=>c.remove());
  const lista=filter==='all'?STATE.actividades:STATE.actividades.filter(a=>a.tipo===filter);
  empty.style.display=lista.length===0?'block':'none';
  lista.forEach(act=>grid.appendChild(crearTarjetaActividad(act)));
  updateStats();
}

function crearTarjetaActividad(act) {
  const card=document.createElement('div');
  card.className='actividad-card'; card.dataset.tipo=act.tipo; card.dataset.id=act.id;
  const info={tarea:{label:'📝 Tarea',badge:'badge-tarea'},evaluacion:{label:'📊 Evaluación',badge:'badge-evaluacion'},proyecto:{label:'🚀 Proyecto',badge:'badge-proyecto'}}[act.tipo]||{label:act.tipo,badge:''};
  const notaHTML=act.calificacion!==''?`<span class="card-nota">${parseFloat(act.calificacion).toFixed(1)}</span>`:`<span style="color:#555">Sin nota</span>`;
  /* El botón eliminar solo aparece si es admin */
  const elimBtn=STATE.isAdmin?`<button class="btn-sm btn-danger" onclick="eliminarActividad('${act.id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>`:'';
  card.innerHTML=`
    <span class="card-tipo-badge ${info.badge}">${info.label}</span>
    <h3 class="card-titulo">${escapeHTML(act.nombre)}</h3>
    <p class="card-desc">${escapeHTML(act.descripcion||'—')}</p>
    <div class="card-footer"><span>${act.fecha?'📅 '+formatDate(act.fecha):''}</span>${notaHTML}</div>
    <div class="card-actions">
      <button class="btn-sm" onclick="verDetalleActividad('${act.id}')"><i class="ph-bold ph-eye"></i> Ver más</button>
      ${elimBtn}
    </div>`;
  return card;
}

function verDetalleActividad(id) {
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

async function eliminarActividad(id) {
  if (!STATE.isAdmin) return;
  if (!confirm('¿Deseas eliminar esta actividad?')) return;
  await deleteActividad(id);
  STATE.actividades=STATE.actividades.filter(a=>a.id!==id);
  renderActividades(); updateGrafico();
  showToast('Actividad eliminada.');
}

async function guardarActividad() {
  if (!STATE.isAdmin) return;
  const nombre=document.getElementById('actNombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio.','error'); return; }
  const a={ id:'act_'+Date.now(), nombre, tipo:document.getElementById('actTipo').value, descripcion:document.getElementById('actDescripcion').value.trim(), fecha:document.getElementById('actFecha').value, calificacion:document.getElementById('actCalificacion').value, reflexion:document.getElementById('actReflexion').value.trim(), enlace:document.getElementById('actEnlace').value.trim(), creadoEn:new Date().toISOString() };
  await saveActividad(a);
  STATE.actividades.push(a);
  renderActividades(); updateGrafico();
  ['actNombre','actDescripcion','actFecha','actCalificacion','actReflexion','actEnlace'].forEach(id=>document.getElementById(id).value='');
  closeModal('modalActividad');
  showToast('¡Actividad guardada en la nube!');
}

document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click',()=>{ document.querySelectorAll('.filtro-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderActividades(btn.dataset.filter); });
});
document.getElementById('btnAddActividad').addEventListener('click',    ()=>openModal('modalActividad'));
document.getElementById('btnGuardarActividad').addEventListener('click', guardarActividad);

/* ── 22. PROYECTOS ── */
function renderProyectos() {
  const grid=document.getElementById('proyectosGrid'), empty=document.getElementById('emptyProyectos');
  grid.querySelectorAll('.actividad-card').forEach(c=>c.remove());
  empty.style.display=STATE.proyectos.length===0?'block':'none';
  STATE.proyectos.forEach(p=>grid.appendChild(crearTarjetaProyecto(p)));
  updateStats();
}
function crearTarjetaProyecto(p) {
  const card=document.createElement('div'); card.className='actividad-card'; card.dataset.tipo='proyecto'; card.dataset.id=p.id;
  const nota=p.calificacion!==''?`<span class="card-nota">${parseFloat(p.calificacion).toFixed(1)}</span>`:`<span style="color:#555">Sin nota</span>`;
  const elimBtn=STATE.isAdmin?`<button class="btn-sm btn-danger" onclick="eliminarProyecto('${p.id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>`:'';
  card.innerHTML=`
    <span class="card-tipo-badge badge-proyecto">🚀 Proyecto</span>
    <h3 class="card-titulo">${escapeHTML(p.nombre)}</h3>
    <p class="card-desc">${escapeHTML(p.descripcion||'—')}</p>
    <div class="card-footer"><span>🏁 Fases: ${(p.fases||'').split('\n').filter(Boolean).length}</span>${nota}</div>
    <div class="card-actions">
      <button class="btn-sm" onclick="verDetalleProyecto('${p.id}')"><i class="ph-bold ph-eye"></i> Ver más</button>
      ${elimBtn}
    </div>`;
  return card;
}
function verDetalleProyecto(id) {
  const p=STATE.proyectos.find(x=>x.id===id); if(!p) return;
  const fases=(p.fases||'').split('\n').filter(Boolean).map(f=>`<li>${escapeHTML(f)}</li>`).join('');
  document.getElementById('detalleContent').innerHTML=`
    <h2>${escapeHTML(p.nombre)}</h2>
    <p style="color:var(--rose);margin-bottom:1.5rem;text-transform:uppercase;font-size:.85rem">PROYECTO</p>
    <h4 style="color:#aaa;margin-bottom:.4rem">Descripción</h4><p style="margin-bottom:1.5rem">${escapeHTML(p.descripcion||'—')}</p>
    ${fases?`<h4 style="color:#aaa;margin-bottom:.4rem">Fases</h4><ol style="margin-left:1.5rem;margin-bottom:1.5rem;color:#ccc;line-height:2">${fases}</ol>`:''}
    <h4 style="color:#aaa;margin-bottom:.4rem">Resultados</h4><p style="margin-bottom:1.5rem">${escapeHTML(p.resultados||'—')}</p>
    <h4 style="color:#aaa;margin-bottom:.4rem">Reflexión</h4><p style="font-style:italic;color:#ccc">${escapeHTML(p.reflexion||'—')}</p>
    ${p.calificacion!==''?`<h4 style="color:#aaa;margin-top:1.5rem;margin-bottom:.4rem">Calificación</h4><p style="font-family:var(--font-disp);font-size:2rem;color:var(--gold)">${parseFloat(p.calificacion).toFixed(1)} / 10</p>`:''}`;
  openModal('modalDetalle');
}
async function eliminarProyecto(id) {
  if(!STATE.isAdmin) return;
  if(!confirm('¿Deseas eliminar este proyecto?')) return;
  await deleteProyecto(id);
  STATE.proyectos=STATE.proyectos.filter(p=>p.id!==id);
  renderProyectos(); updateGrafico();
  showToast('Proyecto eliminado.');
}
async function guardarProyecto() {
  if(!STATE.isAdmin) return;
  const nombre=document.getElementById('proyNombre').value.trim();
  if(!nombre){showToast('El nombre es obligatorio.','error');return;}
  const p={id:'proy_'+Date.now(),nombre,descripcion:document.getElementById('proyDescripcion').value.trim(),fases:document.getElementById('proyFases').value.trim(),resultados:document.getElementById('proyResultados').value.trim(),reflexion:document.getElementById('proyReflexion').value.trim(),calificacion:document.getElementById('proyCalificacion').value,creadoEn:new Date().toISOString()};
  await saveProyecto(p);
  STATE.proyectos.push(p);
  renderProyectos(); updateGrafico();
  ['proyNombre','proyDescripcion','proyFases','proyResultados','proyReflexion','proyCalificacion'].forEach(id=>document.getElementById(id).value='');
  closeModal('modalProyecto');
  showToast('¡Proyecto guardado en la nube!');
}
document.getElementById('btnAddProyecto').addEventListener('click',    ()=>openModal('modalProyecto'));
document.getElementById('btnGuardarProyecto').addEventListener('click', guardarProyecto);

/* ── 23. REFLEXIONES ── */
let selectedEmoji='😊';
function renderReflexiones() {
  const grid=document.getElementById('reflexionesGrid'), empty=document.getElementById('emptyReflexiones');
  grid.querySelectorAll('.reflexion-card').forEach(c=>c.remove());
  empty.style.display=STATE.reflexiones.length===0?'block':'none';
  STATE.reflexiones.forEach(r=>grid.insertBefore(crearTarjetaReflexion(r),empty));
  updateStats();
}
function crearTarjetaReflexion(r) {
  const card=document.createElement('div'); card.className='reflexion-card';
  const fecha=r.creadoEn?new Date(r.creadoEn).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'}):'';
  const elimBtn=STATE.isAdmin?`<button class="btn-sm btn-danger" onclick="eliminarReflexion('${r.id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>`:'';
  card.innerHTML=`<span class="reflexion-emoji">${r.emoji||'💭'}</span><h4 class="reflexion-titulo">${escapeHTML(r.titulo||'Reflexión')}</h4><p class="reflexion-texto">${escapeHTML(r.contenido||'')}</p><p class="reflexion-fecha">📅 ${fecha}</p>${elimBtn?`<div class="card-actions" style="margin-top:.75rem">${elimBtn}</div>`:''}`;
  return card;
}
async function eliminarReflexion(id) {
  if(!STATE.isAdmin) return;
  if(!confirm('¿Deseas eliminar esta reflexión?')) return;
  await deleteReflexion(id);
  STATE.reflexiones=STATE.reflexiones.filter(r=>r.id!==id);
  renderReflexiones();
  showToast('Reflexión eliminada.');
}
async function guardarReflexion() {
  if(!STATE.isAdmin) return;
  const contenido=document.getElementById('refContenido').value.trim();
  if(!contenido){showToast('Escribe algo antes de guardar.','error');return;}
  const r={id:'ref_'+Date.now(),titulo:document.getElementById('refTitulo').value.trim()||'Reflexión',contenido,emoji:selectedEmoji,creadoEn:new Date().toISOString()};
  await saveReflexion(r);
  STATE.reflexiones.unshift(r);
  renderReflexiones();
  document.getElementById('refTitulo').value=''; document.getElementById('refContenido').value='';
  selectedEmoji='😊';
  document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.emoji-btn').classList.add('active');
  closeModal('modalReflexion');
  showToast('¡Reflexión guardada!');
}
document.querySelectorAll('.emoji-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedEmoji=btn.dataset.emoji;});});
document.getElementById('btnAddReflexion').addEventListener('click',    ()=>openModal('modalReflexion'));
document.getElementById('btnGuardarReflexion').addEventListener('click', guardarReflexion);

/* ── 24. COMENTARIOS ── */
function renderComentarios() {
  const lista=document.getElementById('comentariosLista'); lista.innerHTML='';
  if(STATE.comentarios.length===0){lista.innerHTML=`<div class="empty-state"><i class="ph-bold ph-chat-dots"></i><p>Sin comentarios aún.</p></div>`;return;}
  STATE.comentarios.forEach(c=>{
    const b=document.createElement('div'); b.className='comentario-burbuja';
    const fecha=c.creadoEn?new Date(c.creadoEn).toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    b.innerHTML=`<p>${escapeHTML(c.texto)}</p><small>📅 ${fecha}</small>`;
    lista.appendChild(b);
  });
}
async function agregarComentario() {
  if(!STATE.isAdmin) return;
  const input=document.getElementById('inputComentario');
  const texto=input.value.trim();
  if(!texto){showToast('Escribe un comentario antes de enviar.','error');return;}
  const c={id:'com_'+Date.now(),texto,creadoEn:new Date().toISOString()};
  await saveComentario(c);
  STATE.comentarios.push(c);
  input.value=''; renderComentarios();
  showToast('Comentario enviado.');
}
document.getElementById('btnComentario').addEventListener('click', agregarComentario);
document.getElementById('inputComentario').addEventListener('keydown',e=>{if(e.key==='Enter')agregarComentario();});

/* ── 25. GRÁFICO DE CALIFICACIONES ── */
function updateGrafico() {
  const cont=document.getElementById('graficoBars'); cont.innerHTML='';
  const calificados=[...STATE.actividades.filter(a=>a.calificacion!==''),...STATE.proyectos.filter(p=>p.calificacion!=='')].slice(-8);
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
function updatePromedioUI(valor=0,hayDatos=false) {
  const c=document.getElementById('ringFill'),p=document.getElementById('promedioValor'),l=document.getElementById('promedioLabel');
  if(!hayDatos){p.textContent='—';l.textContent='Sin calificaciones';c.style.strokeDashoffset=326.7;return;}
  c.style.strokeDashoffset=326.7-(valor/10)*326.7; p.textContent=valor.toFixed(1);
  l.textContent=valor>=9?'🌟 Excelente':valor>=7?'✅ Bueno':valor>=5?'⚠️ Regular':'❌ Necesita mejorar';
}

/* ── 26. ESTADÍSTICAS ── */
let prevStats={actividades:0,proyectos:0,reflexiones:0};
function animateCounter(el,target) {
  const start=parseInt(el.textContent)||0,ts0=performance.now();
  function step(ts){const p=Math.min((ts-ts0)/600,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(start+(target-start)*e);if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}
function updateStats() {
  const s={actividades:STATE.actividades.length,proyectos:STATE.proyectos.length,reflexiones:STATE.reflexiones.length};
  if(s.actividades!==prevStats.actividades) animateCounter(document.getElementById('statActividades'),s.actividades);
  if(s.proyectos!==prevStats.proyectos)     animateCounter(document.getElementById('statProyectos'),s.proyectos);
  if(s.reflexiones!==prevStats.reflexiones) animateCounter(document.getElementById('statReflexiones'),s.reflexiones);
  prevStats={...s};
}

/* ── 27. RÚBRICA ── */
function renderRubrica() {
  const tbody=document.getElementById('rubricaBody'); tbody.innerHTML='';
  const mostrarEditar=STATE.isAdmin;
  STATE.rubrica.forEach((crit,idx)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><strong>${escapeHTML(crit.nombre)}</strong></td>
      <td class="hide-xs">${escapeHTML(crit.descripcion)}</td>
      <td><div class="rubrica-bar-wrap"><div class="rubrica-bar" style="--pct:${crit.pct}%">${crit.pct}%</div></div></td>
      ${mostrarEditar?`<td class="col-editar"><button class="btn-rubrica-edit" onclick="abrirEditarCriterio(${idx})"><i class="ph-bold ph-pencil-simple"></i></button></td>`:''}`;
    tbody.appendChild(tr);
  });
  actualizarTotalRubrica();
  buildAutoSliders();
}
function actualizarTotalRubrica() {
  const total=STATE.rubrica.reduce((a,c)=>a+c.pct,0);
  const tEl=document.getElementById('rubricaTotal'),mEl=document.getElementById('rubricaTotalMsg');
  tEl.textContent=total+'%';
  if(total===100){tEl.style.color='var(--teal)';mEl.textContent='✓ La suma es correcta';mEl.className='rubrica-total-msg ok';}
  else{tEl.style.color='var(--rose)';mEl.textContent=`⚠️ La suma debe ser 100%`;mEl.className='rubrica-total-msg';}
}
function abrirEditarCriterio(idx) {
  if(!STATE.isAdmin) return;
  const c=STATE.rubrica[idx];
  document.getElementById('rubricaEditIdx').value=idx;
  document.getElementById('rubricaEditNombre').value=c.nombre;
  document.getElementById('rubricaEditDesc').value=c.descripcion;
  document.getElementById('rubricaEditPct').value=c.pct;
  openModal('modalRubrica');
}
async function guardarCriterioRubrica() {
  if(!STATE.isAdmin) return;
  const idx=parseInt(document.getElementById('rubricaEditIdx').value);
  const nombre=document.getElementById('rubricaEditNombre').value.trim();
  const desc=document.getElementById('rubricaEditDesc').value.trim();
  const pct=parseInt(document.getElementById('rubricaEditPct').value);
  if(!nombre){showToast('El nombre es obligatorio.','error');return;}
  if(isNaN(pct)||pct<1||pct>100){showToast('El porcentaje debe ser entre 1 y 100.','error');return;}
  STATE.rubrica[idx].nombre=nombre; STATE.rubrica[idx].descripcion=desc; STATE.rubrica[idx].pct=pct;
  await saveConfig();
  renderRubrica(); closeModal('modalRubrica');
  showToast('Criterio guardado en la nube.');
}
document.getElementById('btnGuardarRubrica').addEventListener('click', guardarCriterioRubrica);

/* ── 28. AUTOEVALUACIÓN ── */
function buildAutoSliders() {
  const cont=document.getElementById('autoSliders'); cont.innerHTML='';
  STATE.rubrica.forEach(crit=>{
    const val=STATE.autoevaluacion.valores[crit.key]||5;
    const item=document.createElement('div'); item.className='slider-item';
    /* Los sliders solo son movibles por el admin */
    const disabled=STATE.isAdmin?'':' disabled style="opacity:.5;cursor:not-allowed"';
    item.innerHTML=`<label>${escapeHTML(crit.nombre)}</label><input type="range" min="1" max="10" step="1" value="${val}" data-key="${crit.key}"${disabled}/><span class="slider-value" id="val_${crit.key}">${val}</span>`;
    cont.appendChild(item);
  });
  cont.querySelectorAll('input[type="range"]').forEach(input=>{
    input.addEventListener('input',()=>{
      if(!STATE.isAdmin) return;
      const key=input.dataset.key,val=parseInt(input.value);
      document.getElementById(`val_${key}`).textContent=val;
      STATE.autoevaluacion.valores[key]=val;
      calcularPuntajeAuto();
      if(STATE.autoevaluacion.enviada){STATE.autoevaluacion.enviada=false;document.getElementById('autoResultado').style.display='none';}
    });
  });
  calcularPuntajeAuto();
  if(STATE.autoevaluacion.enviada) mostrarResultadoAuto();
}
function calcularPuntajeAuto() {
  let total=0;
  STATE.rubrica.forEach(c=>{total+=((STATE.autoevaluacion.valores[c.key]||5)/10)*c.pct;});
  document.getElementById('autoTotal').textContent=total.toFixed(1);
  return total;
}
function mostrarResultadoAuto() {
  const total=calcularPuntajeAuto();
  const texto=total>=90?'¡Excelente desempeño!':total>=70?'Buen trabajo.':total>=50?'Rendimiento regular.':'Necesita mejorar.';
  document.getElementById('autoResultadoTexto').textContent=`Puntaje: ${total.toFixed(1)} / 100 — ${texto}`;
  document.getElementById('autoResultado').style.display='flex';
}
document.getElementById('btnEnviarAuto').addEventListener('click',async()=>{
  if(!STATE.isAdmin) return;
  STATE.autoevaluacion.enviada=true;
  await saveConfig();
  mostrarResultadoAuto();
  showToast('Autoevaluación enviada y guardada en la nube.');
});

/* ── 29. CAMPOS EDITABLES ── */
function setupEditables() {
  let editTimer;
  ['presentacionTexto','objetivoTexto','refAprendizajes','refFortalezas','refMejorar','refObjetivos'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('input',()=>{
      /* Solo guardar si es el admin */
      if(!STATE.isAdmin) return;
      clearTimeout(editTimer);
      editTimer=setTimeout(()=>saveConfig(),1500);
    });
  });
}

/* ── 30. RESTAURAR INTERFAZ ── */
function restoreUI() {
  aplicarConfigUI();
  if(STATE.fotoPerfil) applyFotoPerfil(STATE.fotoPerfil);
  if(STATE.config.presentacion) document.getElementById('presentacionTexto').innerText=STATE.config.presentacion;
  if(STATE.config.objetivo)     document.getElementById('objetivoTexto').innerText=STATE.config.objetivo;
  if(STATE.reflexionesFinales.aprendizajes) document.getElementById('refAprendizajes').innerText=STATE.reflexionesFinales.aprendizajes;
  if(STATE.reflexionesFinales.fortalezas)   document.getElementById('refFortalezas').innerText=STATE.reflexionesFinales.fortalezas;
  if(STATE.reflexionesFinales.mejorar)      document.getElementById('refMejorar').innerText=STATE.reflexionesFinales.mejorar;
  if(STATE.reflexionesFinales.objetivos)    document.getElementById('refObjetivos').innerText=STATE.reflexionesFinales.objetivos;
}

/* ── 31. UTILIDADES ── */
function formatDate(str) {
  if(!str) return '—';
  return new Date(str+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});
}
function escapeHTML(str) {
  if(!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}


/* ══════════════════════════════════════════════════════════════════
   INICIO
   ══════════════════════════════════════════════════════════════════ */
async function init() {
  injectAuthStyles();         /* 1. Estilos del shake y spinner */
  crearSpinner();             /* 2. Spinner de carga */
  createParticles();          /* 3. Partículas de fondo */
  animateCursor();            /* 4. Cursor personalizado */

  checkSavedSession();        /* 5. ¿Ya hay una sesión de admin guardada? */

  await loadAllFromSupabase(); /* 6. Cargar datos del servidor */

  restoreUI();                /* 7. Mostrar datos en pantalla */
  applyRole();                /* 8. Aplicar permisos según el rol */
  renderRubrica();            /* 9. Tabla de rúbrica */
  renderActividades();        /* 10. Actividades */
  renderProyectos();          /* 11. Proyectos */
  renderReflexiones();        /* 12. Reflexiones */
  renderComentarios();        /* 13. Comentarios */
  updateGrafico();            /* 14. Gráfico de calificaciones */
  setupEditables();           /* 15. Texto editable auto-guardado */
  registerReveal();           /* 16. Animaciones de scroll */
  onScroll();                 /* 17. Estado inicial barra de progreso */
  hideSplash();               /* 18. Ocultar splash */

  console.log('✅ Portafolio cargado. Rol:', STATE.isAdmin ? 'Admin' : 'Invitado');
}

document.addEventListener('DOMContentLoaded', init);