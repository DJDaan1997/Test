const secondsFromTime = (value) => {
  const [h = 0, m = 0, s = 0] = String(value || '0:0:0').split(':').map(Number);
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

const formatMetric = (metric, value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (metric.type === 'time') return formatSeconds(secondsFromTime(value));
  if (metric.type === 'rank') return `#${value}`;
  return `${value}${metric.unit ? ` ${metric.unit}` : ''}`;
};

const metricDelta = (metric, baseline, second) => {
  if (baseline === null || baseline === undefined || second === null || second === undefined) return null;

  const baselineValue = metric.type === 'time' ? secondsFromTime(baseline) : Number(baseline);
  const secondValue = metric.type === 'time' ? secondsFromTime(second) : Number(second);
  const diff = secondValue - baselineValue;

  const lowerIsBetter = metric.lowerIsBetter !== false;
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const worsened = lowerIsBetter ? diff > 0 : diff < 0;

  return {
    direction: improved ? 'Verbeterd' : worsened ? 'Verslechterd' : 'Gelijk',
    state: improved ? 'improved' : worsened ? 'worsened' : 'equal',
    formatted: metric.type === 'time' ? formatSeconds(diff) : `${diff > 0 ? '+' : ''}${diff}${metric.unit ? ` ${metric.unit}` : ''}`,
  };
};

const renderDetailedComparison = (analysis) => {
  const host = document.getElementById('detailedCompare');
  host.innerHTML = '';

  const categoriesWithData = (analysis.categories || [])
    .map((category) => ({
      ...category,
      metrics: (category.metrics || []).filter((metric) => metric.baseline !== null || metric.second !== null),
    }))
    .filter((category) => category.metrics.length > 0);

  if (categoriesWithData.length === 0) {
    host.innerHTML = '<p class="empty-note">Nog geen verdiepte metrics beschikbaar.</p>';
    return;
  }

  for (const category of categoriesWithData) {
    const section = document.createElement('section');
    section.className = 'detail-category';

    const heading = document.createElement('h3');
    heading.textContent = category.title;
    section.appendChild(heading);

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Onderdeel</th>
          <th>Amsterdam 2026 (baseline)</th>
          <th>Rotterdam 2026</th>
          <th>Delta t.o.v. baseline</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    for (const metric of category.metrics) {
      const delta = metricDelta(metric, metric.baseline, metric.second);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${metric.name}</td>
        <td>${formatMetric(metric, metric.baseline)}</td>
        <td>${formatMetric(metric, metric.second)}</td>
        <td>${delta ? delta.formatted : '-'}</td>
        <td><span class="status ${delta ? delta.state : 'equal'}">${delta ? delta.direction : 'Onbekend'}</span></td>
      `;
      tbody.appendChild(tr);
    }

    section.appendChild(table);
    host.appendChild(section);
  }
};

const renderCategoryChart = (canvasId, category, labelA, labelB) => {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !category) return;

  const timeMetrics = (category.metrics || []).filter((metric) => metric.type === 'time' && metric.baseline && metric.second);
  if (timeMetrics.length === 0) return;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: timeMetrics.map((metric) => metric.name),
      datasets: [
        {
          label: labelA,
          data: timeMetrics.map((metric) => secondsFromTime(metric.baseline)),
          backgroundColor: '#4bc5ff',
        },
        {
          label: labelB,
          data: timeMetrics.map((metric) => secondsFromTime(metric.second)),
          backgroundColor: '#95f590',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatSeconds(ctx.parsed.y)}`,
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

const render = async () => {
  const res = await fetch('./athlete-data.json', { cache: 'no-store' });
  const data = await res.json();
  const races = [...data.races].sort((a, b) => new Date(a.date) - new Date(b.date));

  document.getElementById('lastUpdated').textContent = `Laatst geüpdatet: ${new Date(data.updatedAt).toLocaleString('nl-NL')}`;

  const best = races.reduce((acc, race) => {
    if (!acc || secondsFromTime(race.time) < secondsFromTime(acc.time)) return race;
    return acc;
  }, null);

  const avgSeconds = Math.round(races.reduce((sum, race) => sum + secondsFromTime(race.time), 0) / races.length);
  const cards = [
    { title: 'Totaal races', value: races.length },
    { title: 'Persoonlijke beste', value: best?.time ?? '-' },
    { title: 'Gemiddelde tijd', value: formatSeconds(avgSeconds) },
    { title: 'Beste rank', value: `#${Math.min(...races.map((race) => race.rank || 99999))}` },
  ];

  const cardsEl = document.getElementById('summaryCards');
  cardsEl.innerHTML = '';
  cards.forEach((card) => {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `<small>${card.title}</small><strong>${card.value}</strong>`;
    cardsEl.appendChild(el);
  });

  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
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
    .map((race, idx) => `<option value="${idx}">${new Date(race.date).toLocaleDateString('nl-NL')} · ${race.event} (${race.time})</option>`)
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

  const baselineRace = races.find((race) => race.id === data.analysis?.baselineRaceId) || races[0];
  const secondRace = races.find((race) => race.id === data.analysis?.compareRaceId) || races[1];

  if (baselineRace && secondRace) {
    const summaryDiff = secondsFromTime(secondRace.time) - secondsFromTime(baselineRace.time);
    const summaryTrend = summaryDiff < 0 ? 'verbeterd' : summaryDiff > 0 ? 'verslechterd' : 'gelijk gebleven';
    document.getElementById('baselineSummary').innerHTML = `
      Baseline: <strong>${baselineRace.event}</strong> (${baselineRace.time}, #${baselineRace.rank ?? '-'})<br/>
      Tweede poging: <strong>${secondRace.event}</strong> (${secondRace.time}, #${secondRace.rank ?? '-'})<br/>
      Resultaat t.o.v. eerste race: <strong>${formatSeconds(summaryDiff)}</strong> (${summaryTrend}).
    `;
  }

  const analysis = data.analysis || { categories: [] };
  renderDetailedComparison(analysis);

  const categories = Object.fromEntries((analysis.categories || []).map((category) => [category.id, category]));
  renderCategoryChart('runsChart', categories.runs, 'Amsterdam 2026', 'Rotterdam 2026');
  renderCategoryChart('workoutsChart', categories.workouts, 'Amsterdam 2026', 'Rotterdam 2026');
  renderCategoryChart('splitsChart', categories.splits, 'Amsterdam 2026', 'Rotterdam 2026');

  const ctx = document.getElementById('timeChart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: races.map((race) => `${new Date(race.date).toLocaleDateString('nl-NL')}\n${race.event}`),
      datasets: [{
        label: 'Totale tijd (sec)',
        data: races.map((race) => secondsFromTime(race.time)),
        borderColor: '#4bc5ff',
        pointBackgroundColor: '#95f590',
        tension: 0.2,
      }],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx2) => ` ${formatSeconds(ctx2.parsed.y)}`,
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
