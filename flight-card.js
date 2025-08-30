// components/flight-card.js
const htmlURL = new URL('./flight-card.html', import.meta.url);

export class FlightCard extends HTMLElement{
  static get observedAttributes(){ return ['mode']; }

  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this.model = null;
    this.tpl = null;
  }

  async connectedCallback(){
    await this.#ensureTemplate();
    this.shadowRoot.appendChild(this.tpl.content.cloneNode(true));
    // Logo por defecto (puedes cambiarlo vía model.brandLogo)
    this.$('logo-m').src = 'https://cdn.theorg.com/5a5ab266-2e99-4c2f-9c04-fe46304ee4fc_thumb.jpg';
    if (this.model) this.render(this.model);
  }

  attributeChangedCallback(){
    // opcional: si quieres re-pintar al cambiar atributos
    if(this.model) this.render(this.model);
  }

  async #ensureTemplate(){
    if(this.tpl) return;
    const res = await fetch(htmlURL, {cache:'no-store'});
    const txt = await res.text();
    const t = document.createElement('template');
    t.innerHTML = txt;
    this.tpl = t.content.querySelector('#tpl-flight-card');
    if(!this.tpl){
      // Fallback por si el HTML cambia
      const tf = document.createElement('template');
      tf.innerHTML = txt;
      this.tpl = tf;
    }
  }

  /** Utils */
  $(dataId){
    return this.shadowRoot.querySelector(`[data-id="${dataId}"]`);
  }
  _clear(el){ if(!el) return; while(el.firstChild) el.removeChild(el.firstChild); }

  /** API pública */
  render(model){
    // Espera una estructura:
    // {
    //   i18n:{ sub, title, dates, prevTitle, newTitle, labels:{pen,fee,fare,pp,tot}, modeBadge, sealText },
    //   brandLogo, watermarkOn, locBadges:[...strings],
    //   legs:{ oo:{...}, or:{...}, no:{...}, nr:{...} },
    //   prices:{pen,fee,fare,pp,tot}, notes
    // }
    this.model = model;

    // Header
    this.$('hdr-sub').textContent   = model.i18n.sub;
    this.$('hdr-title').textContent = model.i18n.title;
    this.$('hdr-dates').textContent = model.i18n.dates;
    this._clear(this.$('loc-badges'));
    (model.locBadges||[]).forEach(b=>{
      const span = document.createElement('span');
      span.className='badge';
      span.textContent=b;
      this.$('loc-badges').appendChild(span);
    });
    this.$('mode-badge').textContent = model.i18n.modeBadge;
    if(model.brandLogo) this.$('logo-m').src = model.brandLogo;

    // Watermark (confirmación)
    const wm = this.shadowRoot.querySelector('.wm');
    if (model.watermarkOn){
      wm.dataset.text = model.i18n.sealText || 'CONFIRMADO';
      wm.classList.add('show');
    } else {
      wm.classList.remove('show');
      wm.dataset.text = '';
    }

    // Col titles
    this.$('prev-title').textContent = model.i18n.prevTitle;
    this.$('new-title').textContent  = model.i18n.newTitle;

    // Legs
    this._renderLeg('leg-oo', model.legs?.oo);
    this._renderLeg('leg-or', model.legs?.or);
    this._renderLeg('leg-no', model.legs?.no);
    this._renderLeg('leg-nr', model.legs?.nr);

    // Prices labels
    this.$('pen-label').textContent  = model.i18n.labels.pen;
    this.$('fee-label').textContent  = model.i18n.labels.fee;
    this.$('fare-label').textContent = model.i18n.labels.fare;
    this.$('pp-label').textContent   = model.i18n.labels.pp;
    this.$('tot-label').textContent  = model.i18n.labels.tot;

    // Prices values
    this.$('pen-val').textContent = model.prices.pen;
    this.$('fee-val').textContent = model.prices.fee;
    this.$('fare-val').textContent= model.prices.fare;
    this.$('pp-val').textContent  = model.prices.pp;
    this.$('tot-val').textContent = model.prices.tot;

    // Notes
    this.$('notes').textContent = model.notes || 'Notas / Notes…';
  }

  _renderLeg(targetId, leg){
    const host = this.$(targetId);
    this._clear(host);
    if(!leg){ host.style.display='none'; return; }
    host.style.display='block';

    // Cabecera
    const head = document.createElement('div');
    head.className='legHead';
    const left = document.createElement('div');
    const codes = document.createElement('div'); codes.className='codes'; codes.textContent = `${leg.from} → ${leg.to}`;
    const cities= document.createElement('div'); cities.className='tiny';  cities.textContent = `${leg.cityFrom} → ${leg.cityTo}`;
    left.appendChild(codes); left.appendChild(cities);

    const logoBox = document.createElement('div'); logoBox.className='airLogoBox';
    const img = document.createElement('img'); img.alt='airline';
    if(leg.logo){ img.src = leg.logo; }
    logoBox.appendChild(img);

    head.appendChild(left); head.appendChild(logoBox);
    host.appendChild(head);

    // Meta + badges
    const meta = document.createElement('div'); meta.className='meta';
    const span = document.createElement('span'); span.textContent = `${leg.flight||''} · ${leg.airline||'—'} · ${leg.dateText||'—'}`;
    meta.appendChild(span);
    const badges = document.createElement('div'); badges.className='badges';
    (leg.badges||[]).forEach(t=>{
      const b=document.createElement('span'); b.className='badge'; b.textContent=t; badges.appendChild(b);
    });
    meta.appendChild(badges);
    host.appendChild(meta);

    // Times
    const times = document.createElement('div'); 
    times.className = 'times' + (leg.stop ? ' stop' : '');
    function cell(lbl,val){
      const w=document.createElement('div');
      const l=document.createElement('div'); l.className='tiny'; l.textContent=lbl;
      const v=document.createElement('div'); v.className='big';  v.textContent=val || '--:--';
      w.appendChild(l); w.appendChild(v); return w;
    }
    if(leg.stop){
      times.appendChild(cell(leg.lblDep, leg.dep));
      times.appendChild(cell(leg.lblArrStop, leg.stopArr));
      times.appendChild(cell(leg.lblDepStop, leg.stopDep));
      times.appendChild(cell(leg.lblArr, leg.arr));
    }else{
      times.appendChild(cell(leg.lblDep, leg.dep));
      times.appendChild(cell(leg.lblArr, leg.arr));
    }
    host.appendChild(times);

    // Duración
    const dim = document.createElement('div'); dim.className='dim';
    dim.textContent = `${leg.lblDuration}: ${leg.duration}` + (leg.layover? ` · ${leg.lblLayover}: ${leg.layover}`:'');
    host.appendChild(dim);

    // Animación de entrada
    host.animate([{opacity:.0, transform:'translateY(6px)'},{opacity:1, transform:'translateY(0)'}], {duration:240, easing:'ease-out'});
  }
}

customElements.define('flight-card', FlightCard);
