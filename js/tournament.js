/**
 * tournament.js — Tournament detail page:
 *   Group stage tables, knockout bracket, all matches list
 */
document.addEventListener('DOMContentLoaded', async () => {
    const id = Common.getParam('id');
    if (!id) {
        document.getElementById('tournamentTitle').textContent = 'No tournament selected';
        return;
    }

    try {
        const [tournament, playersData] = await Promise.all([
            DataStore.getTournament(id),
            DataStore.getPlayers()
        ]);

        document.title = `${tournament.name} — EIPL Apila TT League`;
        document.getElementById('tournamentTitle').textContent = tournament.name;
        document.getElementById('tournamentDate').textContent = tournament.date;

        // Render tournament notes if present
        if (tournament.notes) {
            const notesEl = document.getElementById('tournamentNotes');
            if (notesEl) {
                notesEl.innerHTML = `<i class="bi bi-info-circle me-2"></i>${tournament.notes}`;
                notesEl.style.display = 'block';
            }
        }

        await Promise.all([
            renderGroupStage(tournament, playersData),
            renderKnockout(tournament, playersData),
            renderAllMatches(tournament)
        ]);
    } catch (err) {
        console.error('Error loading tournament:', err);
        document.getElementById('tournamentTitle').textContent = 'Error loading tournament';
    }
});

async function renderGroupStage(tournament, playersData) {
    const container = document.getElementById('groupTables');
    if (!tournament.groups || tournament.groups.length === 0) {
        if (tournament.seedings && tournament.seedings.length > 0) {
            let html = '<div class="col-12"><div class="card"><div class="card-header bg-dark text-white"><h6 class="mb-0">Seedings</h6></div>';
            html += '<div class="card-body p-0"><div class="table-responsive"><table class="table table-hover mb-0">';
            html += '<thead class="table-light"><tr><th class="text-center" style="width:60px">Seed</th><th>Player</th><th class="text-center">Points</th></tr></thead><tbody>';
            for (const s of tournament.seedings) {
                const name = await DataStore.getPlayerName(s.playerId);
                html += `<tr><td class="text-center fw-bold">${s.seed}</td><td><a href="player.html?id=${s.playerId}" class="text-decoration-none">${name}</a></td><td class="text-center">${s.points}</td></tr>`;
            }
            html += '</tbody></table></div></div></div></div>';
            html += '<div class="col-12"><p class="text-muted text-center mt-3"><i class="bi bi-info-circle me-1"></i>Groups will be announced before the tournament</p></div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="text-muted text-center py-4"><i class="bi bi-clock me-2"></i>Groups will be announced before the tournament</p>';
        }
        return;
    }

    let html = '';
    for (const group of tournament.groups) {
        const standings = Rankings.groupStandings(tournament, group.name);
        const playerNames = {};
        for (const s of standings) {
            playerNames[s.id] = await DataStore.getPlayerName(s.id);
        }

        // Group matches
        const groupMatches = tournament.matches.filter(
            m => m.round === 'group' && m.group === group.name && !m.bye
        );

        html += `
            <div class="col-12 col-md-6">
                <div class="card group-card mb-4">
                    <div class="card-header">
                        <h6 class="mb-0">${group.name}</h6>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                        <table class="table table-sm table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th style="width:30px">#</th>
                                    <th>Player</th>
                                    <th class="text-center">P</th>
                                    <th class="text-center">W</th>
                                    <th class="text-center">L</th>
                                    <th class="text-center">Sets</th>
                                    <th class="text-center">Pts</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${standings.map((s, i) => {
                                    const qualified = !s.withdrawn && i < 2;
                                    const rowClass = s.withdrawn ? 'opacity-50' : qualified ? 'table-success' : '';
                                    return `
                                    <tr class="${rowClass}">
                                        <td>${i + 1}</td>
                                        <td>
                                            <a href="player.html?id=${s.id}" class="text-decoration-none">${playerNames[s.id]}</a>
                                            ${qualified ? '<i class="bi bi-check-circle-fill text-success ms-1" title="Qualified"></i>' : ''}
                                            ${s.withdrawn ? '<span class="badge bg-danger ms-1" style="font-size:0.65rem">W/D</span>' : ''}
                                        </td>
                                        <td class="text-center">${s.played}</td>
                                        <td class="text-center">${s.wins}</td>
                                        <td class="text-center">${s.losses}</td>
                                        <td class="text-center">${s.setsWon}-${s.setsLost}</td>
                                        <td class="text-center fw-bold">${s.points}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>

                <!-- Group match results -->
                <div class="mb-4">
                    ${(await Promise.all(groupMatches.map(m =>
                        Common.renderMatchCard(m, { showRound: false, showGroup: false })
                    ))).join('')}
                </div>
            </div>`;
    }

    container.innerHTML = html;
}

async function renderKnockout(tournament, playersData) {
    const container = document.getElementById('knockoutBracket');
    const rounds = ['quarterfinal', 'semifinal', 'final'];
    const roundLabels = { quarterfinal: 'Quarterfinals', semifinal: 'Semifinals', final: 'Final' };

    const knockoutMatches = tournament.matches.filter(m => rounds.includes(m.round));
    if (knockoutMatches.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4"><i class="bi bi-clock me-2"></i>Knockout bracket will be available after the group stage</p>';
        return;
    }

    // Sort matches by ID within each round to maintain bracket order
    const qfMatches = knockoutMatches.filter(m => m.round === 'quarterfinal').sort((a, b) => a.id.localeCompare(b.id));
    const sfMatches = knockoutMatches.filter(m => m.round === 'semifinal');
    const finalMatches = knockoutMatches.filter(m => m.round === 'final');

    // Build advancement mapping: QF winners → SF slots, SF winners → Final slots
    // QF1 winner + QF2 winner → SF1 (top half), QF3 winner + QF4 winner → SF2 (bottom half)
    function getWinner(match) {
        return Rankings.isWinner(match, match.player1) ? match.player1 : match.player2;
    }

    // Order SF matches so SF1 contains QF1/QF2 winners, SF2 contains QF3/QF4 winners
    const orderedSF = [];
    if (qfMatches.length >= 4 && sfMatches.length >= 2) {
        const qf1Winner = getWinner(qfMatches[0]);
        const qf2Winner = getWinner(qfMatches[1]);
        const qf3Winner = getWinner(qfMatches[2]);
        const qf4Winner = getWinner(qfMatches[3]);

        for (const sf of sfMatches) {
            const hasTopHalf = [sf.player1, sf.player2].some(p => p === qf1Winner || p === qf2Winner);
            if (hasTopHalf) orderedSF[0] = sf;
            else orderedSF[1] = sf;
        }

        // Within each SF, ensure the earlier QF winner is player1 (top slot)
        for (let i = 0; i < orderedSF.length; i++) {
            const sf = orderedSF[i];
            if (!sf) continue;
            const earlyWinner = i === 0 ? qf1Winner : qf3Winner;
            if (sf.player2 === earlyWinner) {
                // Swap display order
                orderedSF[i] = { ...sf, _displayP1: sf.player2, _displayP2: sf.player1 };
            } else {
                orderedSF[i] = { ...sf, _displayP1: sf.player1, _displayP2: sf.player2 };
            }
        }
    } else {
        sfMatches.forEach((sf, i) => { orderedSF[i] = { ...sf, _displayP1: sf.player1, _displayP2: sf.player2 }; });
    }

    // Order Final so SF1 winner is top slot, SF2 winner is bottom slot
    const orderedFinal = [];
    if (orderedSF.length >= 2 && finalMatches.length >= 1) {
        const sf1Winner = getWinner(orderedSF[0]);
        const f = finalMatches[0];
        if (f.player2 === sf1Winner) {
            orderedFinal[0] = { ...f, _displayP1: f.player2, _displayP2: f.player1 };
        } else {
            orderedFinal[0] = { ...f, _displayP1: f.player1, _displayP2: f.player2 };
        }
    } else {
        finalMatches.forEach((f, i) => { orderedFinal[i] = { ...f, _displayP1: f.player1, _displayP2: f.player2 }; });
    }

    // Render helper
    async function renderMatch(match) {
        const p1 = match._displayP1 || match.player1;
        const p2 = match._displayP2 || match.player2;
        const p1Name = await DataStore.getPlayerName(p1);
        const p2Name = await DataStore.getPlayerName(p2);
        const p1Won = Rankings.isWinner(match, p1);
        const scoreP1 = match.score ? (p1 === match.player1 ? match.score[0] : match.score[1]) : (match.walkover ? 'W/O' : '-');
        const scoreP2 = match.score ? (p2 === match.player1 ? match.score[0] : match.score[1]) : (match.walkover ? 'W/O' : '-');

        return `
            <div class="bracket-match">
                <div class="bracket-player ${p1Won ? 'winner' : ''}">
                    <a href="player.html?id=${p1}" class="text-decoration-none ${p1Won ? 'text-dark' : 'text-muted'}">${p1Name}</a>
                    <span class="bracket-player-score">${scoreP1}</span>
                </div>
                <div class="bracket-player ${!p1Won ? 'winner' : ''}">
                    <a href="player.html?id=${p2}" class="text-decoration-none ${!p1Won ? 'text-dark' : 'text-muted'}">${p2Name}</a>
                    <span class="bracket-player-score">${scoreP2}</span>
                </div>
            </div>`;
    }

    // Build bracket HTML
    const allRounds = [
        { label: 'Quarterfinals', matches: qfMatches.map(m => ({ ...m, _displayP1: m.player1, _displayP2: m.player2 })) },
        { label: 'Semifinals', matches: orderedSF.filter(Boolean) },
        { label: 'Final', matches: orderedFinal.filter(Boolean) }
    ];

    let html = '<div class="bracket-flex">';
    for (const round of allRounds) {
        if (round.matches.length === 0) continue;
        const matchHtml = await Promise.all(round.matches.map(m => renderMatch(m)));
        html += `<div class="bracket-round">
            <div class="bracket-round-title">${round.label}</div>
            <div class="bracket-matches">${matchHtml.join('')}</div>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

async function renderAllMatches(tournament) {
    const container = document.getElementById('matchList');
    const matches = tournament.matches.filter(m => !m.bye);

    if (matches.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4"><i class="bi bi-clock me-2"></i>No matches played yet</p>';
        return;
    }

    const cards = await Promise.all(matches.map(m => Common.renderMatchCard(m)));
    container.innerHTML = cards.join('');
}
