// components/flight-card.js
// Web Component <flight-card>: presenta la tarjeta usando el template #tpl-flight-card.
// No accede a airports.json. Recibe un "model" desde el index y pinta.

class FlightCard extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this.model = null;
  }

  // ===== Helpers =====
  $(sel){ return this.shadowRoot.querySelector(sel); }
  $id(id){ return this.shadowRoot.querySelector(`[data-id="${id}"]`); }
  _clear(node){ if(!node) return; while(node.firstChild) node.removeChild(node.firstChild); }

  async connectedCallback(){
    const tpl = await ensureFlightCardTemplate();
    const clone = tpl.content.cloneNode(true);
    this.shadowRoot.appendChild(clone);

    // Logo por defecto
    const logo = this.$id('logo-m');
    if (logo) logo.src = 'https://cdn.theorg.com/5a5ab266-2e99-4c2f-9c04-fe46304ee4fc_thumb.jpg';

    // Si ya teníamos un modelo antes de conectar, repinta
    if (this.model) this.render(this.model);
  }

  // API pública: recibe un modelo y pinta
  render(model){
    if (!this.shadowRoot) { this.model = model; return; }
    this.model = model || {};

    // Header
    safeText(this.$id('hdr-sub'),   model?.i18n?.sub ?? '—');
    safeText(this.$id('hdr-title'), model?.i18n?.title ?? '—');
    safeText(this.$id('hdr-dates'), model?.i18n?.dates ?? '—');

    // Badges superiores (PNR, Maarlab, Hotel…)
    const loc = this.$id('loc-badges');
    this._clear(loc);
    (model?.locBadges || []).forEach(txt=>{
      const s=document.createElement('span');
      s.className='badge';
      s.textContent = String(txt);
      loc.appendChild(s);
    });

    // Modo (Cotización/Confirmación)
    safeText(this.$id('mode-badge'), model?.i18n?.modeBadge ?? '—');

    // Marca/Logo
    const logo = this.$id('logo-m');
    if (logo && model?.brandLogo) logo.src = model.brandLogo;

    // Sello watermark
    const wm = this.shadowRoot.querySelector('.wm');
    if (wm){
      const on = !!model?.watermarkOn;
      wm.classList.toggle('show', on);
      wm.setAttribute('data-text', on ? (model?.i18n?.sealText || 'CONFIRMADO') : '');
    }

    // Títulos de columnas
    safeText(this.$id('prev-title'), model?.i18n?.prevTitle ?? 'Vuelos anteriores');
    safeText(this.$id('new-title'),  model?.i18n?.newTitle  ?? 'Vuelos nuevos');

    // Piernas / tramos
    this._renderLeg('leg-oo', model?.legs?.oo);
    this._renderLeg('leg-or', model?.legs?.or);
    this._renderLeg('leg-no', model?.legs?.no);
    this._renderLeg('leg-nr', model?.legs?.nr);

    // Precios (etiquetas)
    safeText(this.$id('pen-label'),  model?.i18n?.labels?.pen  ?? 'Penalización');
    safeText(this.$id('fee-label'),  model?.i18n?.labels?.fee  ?? 'Fee servicio');
    safeText(this.$id('fare-label'), model?.i18n?.labels?.fare ?? 'Diferencia de tarifa');
    safeText(this.$id('pp-label'),   model?.i18n?.labels?.pp   ?? 'Total por pax');
    safeText(this.$id('tot-label'),  model?.i18n?.labels?.tot  ?? 'Total a pagar');

    // Precios (valores)
    safeText(this.$id('pen-val'),  model?.prices?.pen  ?? '€0,00');
    safeText(this.$id('fee-val'),  model?.prices?.fee  ?? '€0,00');
    safeText(this.$id('fare-val'), model?.prices?.fare ?? '€0,00');
    safeText(this.$id('pp-val'),   model?.prices?.pp   ?? '€0,00');
    safeText(this.$id('tot-val'),  model?.prices?.tot  ?? '€0,00');

    // Notas
    safeText(this.$id('notes'), model?.notes ?? 'Notas / Notes…');

    // Micro-animación de aparición
    const card = this.shadowRoot.querySelector('.card');
    if(card){
      card.animate([{opacity:.0, transform:'translateY(6px)'},{opacity:1, transform:'translateY(0)'}],
                   {duration:220, easing:'ease-out'});
    }
  }

  _renderLeg(targetId, leg){
    const host = this.$id(targetId);
    if (!host) return;
    this._clear(host);

    if (!leg){
      host.style.display='none';
      return;
    }
    host.style.display='block';

    // Head
    const head = el('div','legHead');
    const left = document.createElement('div');

    const codes = el('div','codes', `${safe(leg.from,'XXX')} → ${safe(leg.to,'XXX')}`);
    const cities= el('div','tiny',  `${safe(leg.cityFrom,'—')} → ${safe(leg.cityTo,'—')}`);
    left.appendChild(codes); left.appendChild(cities);

    const logoBox = el('div','airLogoBox');
    const img = document.createElement('img');
    img.alt = 'airline';
    if (leg.logo) img.src = leg.logo;
    logoBox.appendChild(img);

    head.appendChild(left); head.appendChild(logoBox);
    host.appendChild(head);

    // Meta + badges
    const meta = el('div','meta');
    const sp = document.createElement('span');
    sp.textContent = `${safe(leg.flight,'')} · ${safe(leg.airline,'—')} · ${safe(leg.dateText,'—')}`;
    meta.appendChild(sp);

    const badges = el('div','badges');
    (leg.badges || []).forEach(t=>{
      const b = el('span','badge', String(t));
      badges.appendChild(b);
    });
    meta.appendChild(badges);
    host.appendChild(meta);

    // Times
    const times = el('div', 'times' + (leg.stop ? ' stop' : ''));
    const cell = (lbl, val)=>{
      const w = document.createElement('div');
      const l = el('div','tiny', lbl || '');
      const v = el('div','big',  val || '--:--');
      w.appendChild(l); w.appendChild(v);
      return w;
    };
    if(leg.stop){
      times.appendChild(cell(leg.lblDep     , leg.dep));
      times.appendChild(cell(leg.lblArrStop , leg.stopArr));
      times.appendChild(cell(leg.lblDepStop , leg.stopDep));
      times.appendChild(cell(leg.lblArr     , leg.arr));
    }else{
      times.appendChild(cell(leg.lblDep, leg.dep));
      times.appendChild(cell(leg.lblArr, leg.arr));
    }
    host.appendChild(times);

    // Duración
    const dim = el('div','dim',
      `${safe(leg.lblDuration,'Duración')}: ${safe(leg.duration,'—')}` +
      (leg.layover ? ` · ${safe(leg.lblLayover,'Escala')}: ${safe(leg.layover,'—')}` : '')
    );
    host.appendChild(dim);

    // Micro-animación de cada leg
    host.animate([{opacity:.0, transform:'translateY(6px)'},{opacity:1, transform:'translateY(0)'}],
                 {duration:200, easing:'ease-out'});
  }
}

// ===== Registro del custom element =====
customElements.define('flight-card', FlightCard);

// ===== Utilidades =====
function el(tag, cls, txt){
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt!=null) n.textContent = String(txt);
  return n;
}
function safe(v, def){ return (v==null || v===undefined) ? def : v; }
function safeText(node, txt){ if(node) node.textContent = String(txt ?? ''); }

// Localiza el template en el documento. Si no existe, lo trae de ./components/flight-card.html
let _flightCardTemplatePromise;
async function ensureFlightCardTemplate(){
  if (_flightCardTemplatePromise) return _flightCardTemplatePromise;

  _flightCardTemplatePromise = new Promise(async (resolve)=>{
    // ¿Ya está inline?
    let tpl = document.getElementById('tpl-flight-card');
    if (tpl instanceof HTMLTemplateElement){
      resolve(tpl);
      return;
    }

    // Lo traemos por fetch y lo insertamos en el DOM para reuso
    try{
      const url = new URL('./components/flight-card.html', document.baseURI).toString();
      const res = await fetch(`${url}?v=${Date.now()}`, {cache:'no-store'});
      const html = await res.text();
      const div = document.createElement('div');
      div.innerHTML = html;
      tpl = div.querySelector('#tpl-flight-card');
      if (!(tpl instanceof HTMLTemplateElement)) throw new Error('Template no encontrado en flight-card.html');
      document.body.appendChild(tpl); // lo dejamos disponible globalmente
      resolve(tpl);
    }catch(err){
      console.error('No se pudo cargar components/flight-card.html:', err);
      // Fallback: creamos un template mínimo para no romper la app
      const fallback = document.createElement('template');
      fallback.id = 'tpl-flight-card';
      fallback.innerHTML = `
        <style>:host{display:block}.card{border:1px solid #ccd; border-radius:12px; padding:12px; background:#fff}</style>
        <div class="card"><div data-id="hdr-title">Tarjeta</div></div>
      `;
      document.body.appendChild(fallback);
      resolve(fallback);
    }
  });

  return _flightCardTemplatePromise;
}

export { FlightCard };
