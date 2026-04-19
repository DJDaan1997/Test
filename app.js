const secondsFromTime = (value) => {
  const [h = 0, m = 0, s = 0] = value.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

const formatSeconds = (seconds) => {
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const render = async () => {
  const res = await fetch('./athlete-data.json', { cache: 'no-store' });
  const data = await res.json();
  const races = [...data.races].sort((a, b) => new Date(a.date) - new Date(b.date));

  document.getElementById('lastUpdated').textContent = `Laatst geüpdatet: ${new Date(data.updatedAt).toLocaleString('nl-NL')}`;

  const best = races.reduce((acc, race) => {
    if (!acc || secondsFromTime(race.time) < secondsFromTime(acc.time)) return race;
    return acc;
  }, null);

  const avgSeconds = Math.round(races.reduce((sum, r) => sum + secondsFromTime(r.time), 0) / races.length);

  const cards = [
    { title: 'Totaal races', value: races.length },
    { title: 'Persoonlijke beste', value: best?.time ?? '-' },
    { title: 'Gemiddelde tijd', value: formatSeconds(avgSeconds) },
    { title: 'Beste rank', value: `#${Math.min(...races.map((r) => r.rank || 99999))}` },
  ];

  const cardsEl = document.getElementById('summaryCards');
  cards.forEach((card) => {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `<small>${card.title}</small><strong>${card.value}</strong>`;
    cardsEl.appendChild(el);
  });

  const tbody = document.getElementById('resultsBody');
  races.forEach((race) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(race.date).toLocaleDateString('nl-NL')}</td>
      <td>${race.event}</td>
      <td class="${race.time === best.time ? 'fast' : ''}">${race.time}</td>
      <td>${race.rank ? '#' + race.rank : '-'}</td>
      <td>${race.division}</td>
      <td>${race.partner || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  const optionsHtml = races
    .map((r, idx) => `<option value="${idx}">${new Date(r.date).toLocaleDateString('nl-NL')} · ${r.event} (${r.time})</option>`)
    .join('');

  const raceA = document.getElementById('raceA');
  const raceB = document.getElementById('raceB');
  raceA.innerHTML = optionsHtml;
  raceB.innerHTML = optionsHtml;
  raceA.value = String(Math.max(0, races.length - 2));
  raceB.value = String(Math.max(0, races.length - 1));

  const compareResult = document.getElementById('compareResult');
  const updateCompare = () => {
    const a = races[Number(raceA.value)];
    const b = races[Number(raceB.value)];
    if (!a || !b) return;

    const diff = secondsFromTime(b.time) - secondsFromTime(a.time);
    const trend = diff < 0 ? 'sneller' : diff > 0 ? 'langzamer' : 'gelijk';

    compareResult.innerHTML = `
      <strong>${b.event}</strong> vs <strong>${a.event}</strong><br/>
      Verschil: <strong>${formatSeconds(diff)}</strong> (${trend}).<br/>
      Rank verschil: <strong>${(b.rank ?? 0) - (a.rank ?? 0)}</strong> plekken.
    `;
  };

  raceA.addEventListener('change', updateCompare);
  raceB.addEventListener('change', updateCompare);
  updateCompare();

  const ctx = document.getElementById('timeChart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: races.map((r) => `${new Date(r.date).toLocaleDateString('nl-NL')}\n${r.event}`),
      datasets: [{
        label: 'Totale tijd (sec)',
        data: races.map((r) => secondsFromTime(r.time)),
        borderColor: '#4bc5ff',
        pointBackgroundColor: '#95f590',
        tension: 0.2,
      }],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatSeconds(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => formatSeconds(Number(value)),
          },
        },
      },
    },
  });
};

render().catch((error) => {
  console.error(error);
  document.getElementById('lastUpdated').textContent = 'Data laden mislukt';
});
