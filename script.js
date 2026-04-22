(function () {
    const $ = id => document.getElementById(id);
    const els = {
        radius: $('radiusInput'), length: $('lengthInput'), wall: $('wallInput'),
        level: $('levelInput'), slider: $('levelSlider'), maxDisp: $('maxLevelDisplay'),
        volRaw: $('volRaw'), volCorr: $('volCorr'), volCorrLabel: $('volCorrLabel'), volUnitRaw: $('volUnitRaw'), volUnitCorr: $('volUnitCorr'), volDelta: $('volDelta'),
        density: $('densityInput'), temp: $('tempInput'),
        presets: $('presets'), tank: $('tankCanvas'),
        themeBtn: $('themeBtn'), langSwitch: $('langSwitch'), modeSwitch: $('modeSwitch'),
        techSummary: $('techSummary'),
        tArea: $('tArea'), tRatio: $('tRatio'), tVoid: $('tVoid'), tFill: $('tFill'),
        ctx: $('tankCanvas').getContext('2d')
    };

    const storage = {
        get: (k, def) => { try { return localStorage.getItem(k) || def; } catch (e) { return def; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } }
    };

    const i18n = {
        ru: {
            title: 'Калькулятор топлива', tank: 'Параметры цистерны', r: 'Радиус R (м)', l: 'Длина L (м)',
            inner: 'Внутренний', outer: 'Наружный', wall: 'Стенка', mm: 'мм',
            level: 'Уровень топлива', h: 'Высота жидкости (м)', max: 'Макс. уровень',
            fuel: 'Тип топлива', dens: 'Плотность', alpha: 'Коэф. α',
            temp: 'Температурная коррекция', t: 'Температура (эталон: 20) (°C)', ref: 'Эталон',
            volAtTemp: 'Объём при {temp}°C',
            tech: '📊 Технические данные',
            area: 'Площадь сегмента', areaD: 'Площадь поперечного сечения, занятого жидкостью.',
            ratio: 'Отношение h/D', ratioD: 'Доля заполнения по высоте.',
            void: 'Объём пустот', voidD: 'Свободное пространство над жидкостью.',
            fill: 'Коэф. заполнения', fillD: 'Доля от полного объёма (0.0–1.0).', kg: 'кг', m3: 'м³'
        },
        en: {
            title: 'Fuel Calculator', tank: 'Tank Parameters', r: 'Radius R (m)', l: 'Length L (m)',
            inner: 'Inner', outer: 'Outer', wall: 'Wall', mm: 'mm',
            level: 'Fuel Level', h: 'Liquid Height (m)', max: 'Max Level',
            fuel: 'Fuel Type', dens: 'Density', alpha: 'Coeff α',
            temp: 'Temp Correction', t: 'Temperature (reference: 20) (°C)', ref: 'Reference',
            volAtTemp: 'Volume at {temp}°C',
            tech: '📊 Technical Data',
            area: 'Segment Area', areaD: 'Cross-section area occupied by liquid.',
            ratio: 'Ratio h/D', ratioD: 'Fill fraction by height.',
            void: 'Void Volume', voidD: 'Free space above liquid.',
            fill: 'Fill Coeff', fillD: 'Fraction of total volume (0.0–1.0).', kg: 'kg', m3: 'm³'
        }
    };
    let lang = 'ru';

    let state = { r: 1.2, l: 4.5, level: 1.0, isOuter: false, wall: 4, density: 830, alpha: 0.0008, temp: 20, theme: 'dark', units: { vol: 'm3', mass: 'kg' }, mode: 'simple' };
    let needsUpdate = true;

    function load() {
        const s = storage.get('fuel_v11', null);
        if (s) {
            try { Object.assign(state, JSON.parse(s)); } catch (e) { }
        }
        apply();
    }
    function save() { storage.set('fuel_v11', JSON.stringify(state)); }

    function apply() {
        els.radius.value = state.r; els.length.value = state.l; els.level.value = state.level; els.slider.value = state.level;
        els.density.value = state.density; els.temp.value = state.temp; els.wall.value = state.wall;
        els.wall.disabled = !state.isOuter;
        document.querySelectorAll('input[name="radiusType"]').forEach(r => r.checked = (r.value === (state.isOuter ? 'outer' : 'inner')));

        setMode(state.mode);
        document.querySelectorAll('#langSwitch .pill-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
        setTheme(state.theme);
        translate();
        needsUpdate = true;
    }

    function setMode(mode) {
        state.mode = mode;
        document.body.setAttribute('data-mode', mode);
        document.querySelectorAll('#modeSwitch .pill-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        document.querySelectorAll('.adv').forEach(el => {
            if (mode === 'advanced') {
                if (el.classList.contains('flex-col')) el.style.display = 'flex';
                else if (el.classList.contains('block')) el.style.display = 'block';
                else el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    }

    function setTheme(t) {
        state.theme = t;
        document.documentElement.dataset.theme = t;
        els.themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
        save();
    }
    els.themeBtn.onclick = () => setTheme(state.theme === 'dark' ? 'light' : 'dark');

    function translate() {
        const t = i18n[lang];
        $('appTitle').textContent = t.title;
        $('tTank').textContent = t.tank; $('tR').textContent = t.r; $('tL').textContent = t.l;
        $('tInner').textContent = t.inner; $('tOuter').textContent = t.outer; $('tWall').textContent = t.wall; $('tMM').textContent = t.mm;
        $('tLevel').textContent = t.level; $('tH').textContent = t.h; $('tMax').textContent = t.max;
        if (state.mode === 'advanced') {
            $('tFuel').textContent = t.fuel; $('tDens').textContent = t.dens;
            $('tTemp').textContent = t.temp; $('tTempIn').textContent = t.t;
            $('tTech').textContent = t.tech;
            $('tAreaL').textContent = t.area; $('tAreaD').textContent = t.areaD;
            $('tRatioL').textContent = t.ratio; $('tRatioD').textContent = t.ratioD;
            $('tVoidL').textContent = t.void; $('tVoidD').textContent = t.voidD;
            $('tFillL').textContent = t.fill; $('tFillD').textContent = t.fillD;
        }
    }

    els.langSwitch.onclick = () => {
        lang = lang === 'ru' ? 'en' : 'ru';
        apply();
    };

    els.techSummary.querySelector('.panel-title').addEventListener('click', () => {
        els.techSummary.classList.toggle('open');
    });

    function calc() {
        const R = state.isOuter ? Math.max(0.001, state.r - state.wall / 1000) : state.r;
        const maxH = 2 * R;
        const h = Math.min(state.level, maxH);
        const area = h <= 0 ? 0 : h >= maxH ? Math.PI * R * R : R * R * Math.acos(Math.max(-1, Math.min(1, (R - h) / R))) - (R - h) * Math.sqrt(Math.max(0, R * R - (R - h) * (R - h)));
        const vol = area * state.l;
        const full = Math.PI * R * R * state.l;
        const voidV = full - vol;
        const ratio = maxH > 0 ? h / maxH : 0;
        const volTemp = vol * (1 + state.alpha * (state.temp - 20));
        const delta = vol > 0 ? ((volTemp - vol) / vol) * 100 : 0;
        const mass = vol * state.density;
        return { vol, full, pct: full > 0 ? (vol / full) * 100 : 0, R, h, maxH, area, voidV, ratio, volTemp, delta, mass };
    }

    function draw(R, h, vol, pct, mass) {
        const ctx = els.ctx;
        const w = 300, hc = 225, pad = 20;
        const sc = (Math.min(w, hc) - pad * 2) / (2 * R);
        const cx = w / 2, cy = hc / 2, rPx = R * sc;
        ctx.clearRect(0, 0, w, hc);

        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rPx);
        bg.addColorStop(0, '#1c1c1e'); bg.addColorStop(1, '#0a0a0a');
        ctx.beginPath(); ctx.arc(cx, cy, rPx, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.stroke();

        if (h > 0 && h < 2 * R) {
            const yS = cy + rPx - h * sc;
            const dy = yS - cy;
            ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rPx, 0, Math.PI * 2); ctx.clip();
            const fg = ctx.createLinearGradient(cx, yS, cx, cy + rPx);
            fg.addColorStop(0, '#ff9500'); fg.addColorStop(0.4, '#ff6b00'); fg.addColorStop(1, '#d10000');
            ctx.fillStyle = fg;
            ctx.beginPath();
            const sa = Math.asin(Math.max(-1, Math.min(1, dy / rPx)));
            const ea = Math.PI - sa;
            ctx.moveTo(cx + rPx * Math.cos(sa), cy + rPx * Math.sin(sa));
            ctx.arc(cx, cy, rPx, sa, ea, false);
            const dx = Math.sqrt(Math.max(0, rPx * rPx - dy * dy));
            const t = performance.now() / 600;
            for (let i = 0; i <= 40; i++) {
                const p = i / 40;
                const x = (cx - dx) + p * (2 * dx);
                ctx.lineTo(x, yS + Math.sin(p * 6 * Math.PI + t) * 2);
            }
            ctx.closePath(); ctx.fill(); ctx.restore();
        } else if (h >= 2 * R) {
            ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rPx, 0, Math.PI * 2); ctx.clip();
            const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rPx);
            fg.addColorStop(0, '#ff9500'); fg.addColorStop(1, '#d10000');
            ctx.fillStyle = fg; ctx.fillRect(0, 0, w, hc); ctx.restore();
        }

        const t = i18n[lang];
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 18px -apple-system, sans-serif';
        ctx.fillText(vol.toFixed(2) + ' ' + t.m3, cx, cy - 24);

        ctx.font = '500 14px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(pct.toFixed(1) + '%', cx, cy);

        ctx.font = '400 13px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(Math.round(mass) + ' ' + t.kg, cx, cy + 22);
    }

    function update() {
        if (!needsUpdate) return;
        const d = calc();
        const t = i18n[lang];

        els.volRaw.textContent = d.vol.toFixed(3);
        els.volCorr.textContent = d.volTemp.toFixed(3);
        els.volCorrLabel.textContent = t.volAtTemp.replace('{temp}', state.temp);
        els.volUnitRaw.textContent = t.m3;
        els.volUnitCorr.textContent = t.m3;
        els.volDelta.textContent = `Δ: ${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(2)}%`;
        els.volDelta.style.color = d.delta >= 0 ? '#ff9500' : '#0a84ff';

        els.maxDisp.value = d.maxH.toFixed(3) + ' м';
        els.slider.max = d.maxH.toFixed(2);
        els.level.max = d.maxH.toFixed(2);

        if (state.level > d.maxH) { state.level = d.maxH; els.level.value = state.level.toFixed(2); els.slider.value = state.level; }

        els.tArea.textContent = d.area.toFixed(3) + ' м²';
        els.tRatio.textContent = d.ratio.toFixed(3);
        els.tVoid.textContent = d.voidV.toFixed(3) + ' м³';
        els.tFill.textContent = (d.pct / 100).toFixed(4);

        draw(d.R, d.h, d.vol, d.pct, d.mass);
        needsUpdate = false;
    }

    function mark() { needsUpdate = true; save(); }
    els.radius.oninput = e => { state.r = parseFloat(e.target.value) || 0.1; mark(); };
    els.length.oninput = e => { state.l = parseFloat(e.target.value) || 0.1; mark(); };
    els.level.oninput = e => { state.level = parseFloat(e.target.value) || 0; els.slider.value = state.level; mark(); };
    els.slider.oninput = e => { state.level = parseFloat(e.target.value); els.level.value = state.level.toFixed(2); mark(); };
    els.density.oninput = e => { state.density = parseFloat(e.target.value) || 830; mark(); };
    els.temp.oninput = e => { const value = parseFloat(e.target.value); state.temp = isNaN(value) ? 20 : value; mark(); };
    els.wall.oninput = e => { state.wall = parseInt(e.target.value) || 0; mark(); };
    document.querySelectorAll('input[name="radiusType"]').forEach(r => r.onchange = e => { state.isOuter = e.target.value === 'outer'; els.wall.disabled = !state.isOuter; mark(); });
    document.querySelectorAll('.chip').forEach(b => b.onclick = () => {
        document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.density = parseFloat(b.dataset.density); state.alpha = parseFloat(b.dataset.alpha);
        els.density.value = state.density; mark();
    });

    document.querySelectorAll('#modeSwitch .pill-btn').forEach(b => {
        b.addEventListener('click', () => {
            setMode(b.dataset.mode);
            els.techSummary.classList.remove('open');
            translate();
            mark();
        });
    });

    load();
    let last = 0;
    function loop(t) { if (t - last > 16) { if (needsUpdate) update(); const d = calc(); draw(d.R, d.h, d.vol, d.pct, d.mass); last = t; } requestAnimationFrame(loop); }
    requestAnimationFrame(loop);

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => { });
        });
    }
})();

