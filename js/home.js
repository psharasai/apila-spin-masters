/**
 * home.js — Home page: Hero stats, Podium, Rankings leaderboard, Tournament history
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [playersData, allTournaments] = await Promise.all([
            DataStore.getPlayers(),
            DataStore.getAllTournaments()
        ]);

        // Only completed tournaments (with matches) for rankings/stats
        const tournaments = allTournaments.filter(t => t.matches && t.matches.length > 0);

        const rankings = Rankings.computeRankings(tournaments, playersData.players);

        renderStats(tournaments, playersData.players, rankings);
        renderMarquee(tournaments, allTournaments);
        renderPodium(rankings, tournaments);
        renderRankings(rankings);
        renderTournamentHistory(allTournaments);
    } catch (err) {
        console.error('Error loading home page:', err);
        document.getElementById('rankingsBody').innerHTML =
            `<tr><td colspan="7" class="text-center text-danger py-4">Error loading data. Make sure data files exist.</td></tr>`;
    }
});

function renderStats(tournaments, players, rankings) {
    document.getElementById('statTournaments').textContent = tournaments.length;
    document.getElementById('statPlayers').textContent = players.length;

    const totalMatches = tournaments.reduce((sum, t) =>
        sum + (t.matches ? t.matches.filter(m => !m.bye).length : 0), 0);
    document.getElementById('statMatches').textContent = totalMatches;
}

async function renderMarquee(completedTournaments, allTournaments) {
    const banner = document.getElementById('marqueeBanner');
    if (!banner || completedTournaments.length === 0) return;

    const latest = completedTournaments[completedTournaments.length - 1];
    const champId = Rankings.getChampion(latest);
    const champName = champId ? await DataStore.getPlayerName(champId) : null;

    // Find next upcoming tournament from data
    const nextTournament = allTournaments.find(t => !t.matches || t.matches.length === 0);

    let html = '';
    if (champName) {
        html += `
            <div class="marquee-congrats">
                <span class="trophy-icon">🏆</span>
                <div class="congrats-text">
                    Congratulations <span class="congrats-name">${champName}</span>
                    <br>Winner — ${latest.name}
                </div>
            </div>`;
    }
    if (nextTournament) {
        html += `
            <div class="marquee-next">
                <div class="next-label">Next Tournament</div>
                <div class="next-date">${nextTournament.name} — ${nextTournament.date}</div>
            </div>`;
    }

    banner.innerHTML = html;
    banner.style.display = 'flex';
}

function renderPodium(rankings, tournaments) {
    const container = document.getElementById('podiumSection');
    const label = document.getElementById('podiumLabel');
    if (!container || rankings.length < 3 || tournaments.length === 0) return;

    const latest = tournaments[tournaments.length - 1];
    label.textContent = `🏆 ${latest.name} — Top 3`;

    // Podium is based on most recent tournament placement, not overall ranking
    const top3 = [];
    const placements = ['winner', 'runner_up', 'semifinal'];
    const medalInfo = [
        { css: 'podium-gold',   medal: '🥇', label: '1st' },
        { css: 'podium-silver', medal: '🥈', label: '2nd' },
        { css: 'podium-bronze', medal: '🥉', label: '3rd' }
    ];

    for (const p of rankings) {
        const tr = p.perTournament[latest.id];
        if (!tr) continue;
        if (tr.placement === 'winner') top3[0] = p;
        else if (tr.placement === 'runner_up') top3[1] = p;
        else if (tr.placement === 'semifinal' && !top3[2]) top3[2] = p;
    }

    if (top3.filter(Boolean).length < 3) return;

    container.innerHTML = top3.map((r, i) => {
        const m = medalInfo[i];
        const tr = r.perTournament[latest.id];
        return `
            <a href="player.html?id=${r.id}" class="podium-card ${m.css}">
                <span class="podium-medal">${m.medal}</span>
                <span class="podium-rank">${m.label}</span>
                <div class="podium-name">${r.name}</div>
                <div class="podium-points">${tr.total} pts</div>
                <div class="podium-record">${tr.placementLabel}</div>
            </a>`;
    }).join('');
}

function renderRankings(rankings) {
    const tbody = document.getElementById('rankingsBody');

    if (rankings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No data yet</td></tr>';
        return;
    }

    tbody.innerHTML = rankings.map((r, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-default';
        const rowClass = rank === 1 ? 'rank-row-gold' : rank === 2 ? 'rank-row-silver' : rank === 3 ? 'rank-row-bronze' : '';

        return `
            <tr class="${rowClass}" onclick="window.location='player.html?id=${r.id}'" style="cursor:pointer">
                <td class="text-center"><span class="rank-badge ${rankClass}">${rank}</span></td>
                <td class="fw-semibold">${r.name}</td>
                <td class="text-center">${r.tournamentsPlayed}</td>
                <td class="text-center fw-bold">${r.totalPoints}</td>
            </tr>`;
    }).join('');
}

function renderTournamentHistory(tournaments) {
    const container = document.getElementById('tournamentHistory');

    if (tournaments.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">No tournaments yet</p>';
        return;
    }

    // Sort: upcoming first (by date ascending), then completed (by date descending)
    const upcoming = tournaments.filter(t => !t.matches || t.matches.length === 0)
        .sort((a, b) => a.date.localeCompare(b.date));
    const completed = tournaments.filter(t => t.matches && t.matches.length > 0)
        .sort((a, b) => b.date.localeCompare(a.date));
    const sorted = [...upcoming, ...completed];

    container.innerHTML = sorted.map(t => {
        const isUpcoming = !t.matches || t.matches.length === 0;

        if (isUpcoming) {
            const seedingsNote = t.seedings && t.seedings.length > 0
                ? '<small class="text-success d-block mt-1"><i class="bi bi-check-circle me-1"></i>Seedings announced</small>' : '';
            return `
            <div class="card mb-3 tournament-card" onclick="window.location='tournament.html?id=${t.id}'">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1">${t.name}</h5>
                        <small class="text-muted"><i class="bi bi-calendar-event me-1"></i>${t.date}</small>
                        ${seedingsNote}
                    </div>
                    <div class="text-end">
                        <span class="badge bg-warning text-dark">
                            <i class="bi bi-clock me-1"></i>Upcoming
                        </span>
                    </div>
                </div>
            </div>`;
        }

        const matchCount = t.matches.filter(m => !m.bye).length;
        const playerCount = new Set(
            t.matches.flatMap(m => [m.player1, m.player2])
        ).size;

        return `
            <div class="card mb-3 tournament-card" onclick="window.location='tournament.html?id=${t.id}'">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1">${t.name}</h5>
                        <small class="text-muted">${t.date} · ${playerCount} players · ${matchCount} matches</small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-warning text-dark" id="champ-${t.id}">
                            <i class="bi bi-trophy-fill me-1"></i>Loading...
                        </span>
                    </div>
                </div>
            </div>`;
    }).join('');

    for (const t of completed) {
        const champId = Rankings.getChampion(t);
        if (champId) {
            DataStore.getPlayerName(champId).then(name => {
                const el = document.getElementById(`champ-${t.id}`);
                if (el) el.innerHTML = `<i class="bi bi-trophy-fill me-1"></i>${name}`;
            });
        }
    }
}
