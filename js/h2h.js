/**
 * h2h.js — Head-to-Head comparison page
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [playersData, tournaments] = await Promise.all([
            DataStore.getPlayers(),
            DataStore.getAllTournaments()
        ]);

        populateDropdowns(playersData.players);

        const p1 = Common.getParam('p1');
        const p2 = Common.getParam('p2');

        if (p1) document.getElementById('player1Select').value = p1;
        if (p2) document.getElementById('player2Select').value = p2;

        const onChange = () => updateH2H(tournaments);
        document.getElementById('player1Select').addEventListener('change', onChange);
        document.getElementById('player2Select').addEventListener('change', onChange);

        if (p1 && p2) updateH2H(tournaments);
    } catch (err) {
        console.error('Error loading H2H:', err);
    }
});

function populateDropdowns(players) {
    const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));
    const options = sorted.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    document.getElementById('player1Select').innerHTML =
        '<option value="">Select a player...</option>' + options;
    document.getElementById('player2Select').innerHTML =
        '<option value="">Select a player...</option>' + options;
}

async function updateH2H(tournaments) {
    const p1Id = document.getElementById('player1Select').value;
    const p2Id = document.getElementById('player2Select').value;

    if (!p1Id || !p2Id || p1Id === p2Id) {
        document.getElementById('h2hResults').classList.add('d-none');
        document.getElementById('h2hPlaceholder').classList.remove('d-none');
        return;
    }

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('p1', p1Id);
    url.searchParams.set('p2', p2Id);
    window.history.replaceState({}, '', url);

    const matches = Rankings.headToHead(tournaments, p1Id, p2Id);
    const p1Name = await DataStore.getPlayerName(p1Id);
    const p2Name = await DataStore.getPlayerName(p2Id);

    let p1Wins = 0, p2Wins = 0;
    for (const m of matches) {
        if (Rankings.isWinner(m, p1Id)) p1Wins++;
        else p2Wins++;
    }

    document.getElementById('h2hP1Name').textContent = p1Name;
    document.getElementById('h2hP2Name').textContent = p2Name;
    document.getElementById('h2hP1Wins').textContent = p1Wins;
    document.getElementById('h2hP2Wins').textContent = p2Wins;
    document.getElementById('h2hTotal').textContent = matches.length;

    document.getElementById('h2hResults').classList.remove('d-none');
    document.getElementById('h2hPlaceholder').classList.add('d-none');

    // Render match list
    const container = document.getElementById('h2hMatchList');
    if (matches.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">These players haven\'t faced each other yet</p>';
    } else {
        const cards = await Promise.all(
            matches.map(m => Common.renderMatchCard(m, { showTournament: true }))
        );
        container.innerHTML = cards.join('');
    }
}
