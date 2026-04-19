/**
 * player.js — Player profile page:
 *   Stats, points breakdown, match history
 */

function placementBadgeClass(placement) {
    const classes = {
        winner: 'bg-warning text-dark',
        runner_up: 'bg-secondary',
        semifinal: 'bg-primary',
        quarterfinal: 'bg-info',
        participant: 'bg-light text-dark'
    };
    return classes[placement] || 'bg-light text-dark';
}

document.addEventListener('DOMContentLoaded', async () => {
    const id = Common.getParam('id');
    if (!id) {
        document.getElementById('playerName').textContent = 'No player selected';
        return;
    }

    try {
        const [player, playersData, tournaments] = await Promise.all([
            DataStore.getPlayer(id),
            DataStore.getPlayers(),
            DataStore.getAllTournaments()
        ]);

        if (!player) {
            document.getElementById('playerName').textContent = 'Player not found';
            return;
        }

        document.title = `${player.name} — EIPL Apila TT League`;
        document.getElementById('playerName').textContent = player.name;

        const tierLabels = { 1: 'Tier 1 (Advanced)', 2: 'Tier 2 (Intermediate)', 3: 'Tier 3 (Beginner)' };
        document.getElementById('playerTier').textContent = tierLabels[player.skillTier] || `Tier ${player.skillTier}`;

        const rankings = Rankings.computeRankings(tournaments, playersData.players);
        const rank = rankings.findIndex(r => r.id === id) + 1;
        const playerRanking = rankings.find(r => r.id === id);

        renderPlayerStats(playerRanking, rank);
        renderPointsBreakdown(tournaments, id);
        await renderMatchHistory(tournaments, id);
    } catch (err) {
        console.error('Error loading player:', err);
        document.getElementById('playerName').textContent = 'Error loading player';
    }
});

function renderPlayerStats(ranking, rank) {
    if (!ranking) {
        document.getElementById('pStatRank').textContent = '-';
        document.getElementById('pStatPoints').textContent = '0';
        document.getElementById('pStatRecord').textContent = '0 / 0';
        document.getElementById('pStatWinPct').textContent = '0%';
        return;
    }

    document.getElementById('pStatRank').textContent = rank > 0 ? `#${rank}` : '-';
    document.getElementById('pStatPoints').textContent = ranking.totalPoints;
    document.getElementById('pStatRecord').textContent = `${ranking.totalWins} / ${ranking.totalLosses}`;
    const total = ranking.totalWins + ranking.totalLosses;
    document.getElementById('pStatWinPct').textContent = Common.winPct(ranking.totalWins, total);
}

function renderPointsBreakdown(tournaments, playerId) {
    const tbody = document.getElementById('pointsBreakdown');
    let html = '';

    for (const t of tournaments) {
        const result = Rankings.tournamentPoints(t, playerId);
        if (result.wins + result.losses === 0) continue;

        html += `
            <tr>
                <td><a href="tournament.html?id=${t.id}" class="text-decoration-none">${t.name}</a></td>
                <td class="text-center">${result.wins + result.losses}</td>
                <td class="text-center text-success">${result.wins}</td>
                <td class="text-center text-danger">${result.losses}</td>
                <td class="text-center">
                    <span class="badge ${placementBadgeClass(result.placement)}">${result.placementLabel}</span>
                </td>
                <td class="text-center fw-bold">${result.total}</td>
            </tr>`;
    }

    if (!html) {
        html = '<tr><td colspan="6" class="text-center text-muted py-3">No tournament data</td></tr>';
    }

    tbody.innerHTML = html;
}

async function renderMatchHistory(tournaments, playerId) {
    const container = document.getElementById('matchHistory');
    const allMatches = [];

    for (const t of tournaments) {
        for (const m of t.matches) {
            if ((m.player1 === playerId || m.player2 === playerId) && !m.bye) {
                allMatches.push({ ...m, tournamentName: t.name, tournamentId: t.id });
            }
        }
    }

    if (allMatches.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">No matches played</p>';
        return;
    }

    // Show most recent first
    allMatches.reverse();

    const cards = await Promise.all(
        allMatches.map(m => Common.renderMatchCard(m, { showTournament: true }))
    );
    container.innerHTML = cards.join('');
}
