/**
 * players-list.js — All Players page with sortable stats table
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [playersData, tournaments] = await Promise.all([
            DataStore.getPlayers(),
            DataStore.getAllTournaments()
        ]);

        const rankings = Rankings.computeRankings(tournaments, playersData.players);
        const playerRows = buildPlayerRows(playersData.players, rankings);

        // Default sort: alphabetical by name
        let currentSort = { key: 'name', asc: true };
        renderTable(playerRows, currentSort);

        // Attach sort handlers
        document.querySelectorAll('.sortable').forEach(th => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                if (currentSort.key === key) {
                    currentSort.asc = !currentSort.asc;
                } else {
                    currentSort = { key, asc: key === 'name' };
                }
                renderTable(playerRows, currentSort);
                updateSortIcons(key, currentSort.asc);
            });
        });

        updateSortIcons('name', true);
    } catch (err) {
        console.error('Error loading players:', err);
        document.getElementById('playersBody').innerHTML =
            '<tr><td colspan="7" class="text-danger text-center">Error loading players</td></tr>';
    }
});

function buildPlayerRows(players, rankings) {
    const rankMap = {};
    rankings.forEach((r, i) => { rankMap[r.id] = { rank: i + 1, ...r }; });

    return players.map(p => {
        const r = rankMap[p.id];
        const wins = r ? r.totalWins : 0;
        const losses = r ? r.totalLosses : 0;
        const played = wins + losses;
        const winpct = played > 0 ? (wins / played) * 100 : 0;
        return {
            id: p.id,
            name: p.name,
            rank: r ? r.rank : 999,
            played,
            won: wins,
            lost: losses,
            winpct,
            points: r ? r.totalPoints : 0
        };
    });
}

function renderTable(rows, sort) {
    const sorted = [...rows].sort((a, b) => {
        let va = a[sort.key], vb = b[sort.key];
        if (typeof va === 'string') {
            va = va.toLowerCase(); vb = vb.toLowerCase();
        }
        if (va < vb) return sort.asc ? -1 : 1;
        if (va > vb) return sort.asc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('playersBody');
    tbody.innerHTML = sorted.map(r => {
        const pctStr = r.played > 0 ? Math.round(r.winpct) + '%' : '-';
        const rankDisplay = r.rank < 999 ? r.rank : '-';
        return `
            <tr onclick="window.location='player.html?id=${r.id}'" style="cursor:pointer">
                <td class="fw-semibold">${r.name}</td>
                <td class="text-center">${rankDisplay}</td>
                <td class="text-center">${r.played}</td>
                <td class="text-center text-success fw-semibold">${r.won}</td>
                <td class="text-center text-danger">${r.lost}</td>
                <td class="text-center">${pctStr}</td>
                <td class="text-center fw-bold">${r.points}</td>
            </tr>`;
    }).join('');
}

function updateSortIcons(activeKey, asc) {
    document.querySelectorAll('.sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (th.dataset.sort === activeKey) {
            icon.className = `bi ms-1 sort-icon ${asc ? 'bi-arrow-up' : 'bi-arrow-down'}`;
            icon.style.opacity = '1';
        } else {
            icon.className = 'bi bi-arrow-down-up ms-1 sort-icon';
            icon.style.opacity = '0.3';
        }
    });
}
