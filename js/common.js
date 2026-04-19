/**
 * common.js — Shared utilities: navigation, formatting, helpers
 */
const Common = (() => {

    /** Populate the tournament dropdown menu in the navbar */
    async function initNav() {
        try {
            const index = await DataStore.getTournamentIndex();
            const menu = document.getElementById('tournamentMenu');
            if (!menu) return;

            menu.innerHTML = '';
            for (const t of index.tournaments) {
                const li = document.createElement('li');
                const isUpcoming = t.status === 'upcoming';
                li.innerHTML = `<a class="dropdown-item ${isUpcoming ? 'text-muted' : ''}" href="tournament.html?id=${t.id}">
                    ${t.name} <small class="ms-1">${t.date}</small>
                    ${isUpcoming ? '<span class="badge bg-warning text-dark ms-2" style="font-size:0.65rem">Upcoming</span>' : ''}
                </a>`;
                menu.appendChild(li);
            }
        } catch (e) {
            console.warn('Could not load tournament index for nav:', e.message);
        }
    }

    /** Get URL query parameter */
    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    /** Format round name for display */
    function formatRound(round) {
        const labels = {
            group: 'Group Stage',
            quarterfinal: 'Quarterfinal',
            semifinal: 'Semifinal',
            final: 'Final'
        };
        return labels[round] || round;
    }

    /** Get round badge color class */
    function roundBadgeClass(round) {
        const classes = {
            group: 'bg-secondary',
            quarterfinal: 'bg-info',
            semifinal: 'bg-primary',
            final: 'bg-warning text-dark'
        };
        return classes[round] || 'bg-secondary';
    }

    /** Format set scores for display, e.g. "(11-7, 9-11, 11-5)" */
    function formatSetScores(setScores) {
        if (!setScores || setScores.length === 0) return '';
        return '(' + setScores.map(s => `${s[0]}-${s[1]}`).join(', ') + ')';
    }

    /** Render a single match card */
    async function renderMatchCard(match, options = {}) {
        const p1Name = await DataStore.getPlayerName(match.player1);
        const p2Name = await DataStore.getPlayerName(match.player2);
        const p1Won = Rankings.isWinner(match, match.player1);

        const roundLabel = options.showRound !== false
            ? `<span class="badge round-badge ${roundBadgeClass(match.round)}">${formatRound(match.round)}</span>` : '';
        const groupLabel = match.group && options.showGroup !== false
            ? `<small class="text-muted ms-2">${match.group}</small>` : '';
        const tournamentLabel = match.tournamentName && options.showTournament
            ? `<small class="text-muted ms-2">${match.tournamentName}</small>` : '';
        const walkover = match.walkover ? '<span class="badge badge-walkover ms-2">W/O</span>' : '';

        const scoreText = match.score ? `${match.score[0]} - ${match.score[1]}` : 'W/O';
        const setScoreText = formatSetScores(match.setScores);

        return `
            <div class="match-card d-flex align-items-center justify-content-between flex-wrap">
                <div class="d-flex align-items-center flex-wrap gap-2">
                    ${roundLabel}${groupLabel}${tournamentLabel}${walkover}
                </div>
                <div class="d-flex align-items-center gap-3 mt-2 mt-md-0">
                    <span class="${p1Won ? 'match-winner' : 'match-loser'}">
                        <a href="player.html?id=${match.player1}" class="text-decoration-none ${p1Won ? 'match-winner' : 'match-loser'}">${p1Name}</a>
                    </span>
                    <span class="match-score">${scoreText}</span>
                    <span class="${!p1Won ? 'match-winner' : 'match-loser'}">
                        <a href="player.html?id=${match.player2}" class="text-decoration-none ${!p1Won ? 'match-winner' : 'match-loser'}">${p2Name}</a>
                    </span>
                </div>
                ${setScoreText ? `<div class="w-100 text-end set-scores mt-1">${setScoreText}</div>` : ''}
            </div>`;
    }

    /** Get initials from a player name */
    function getInitials(name) {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    /** Format win percentage */
    function winPct(wins, total) {
        if (total === 0) return '0%';
        return Math.round((wins / total) * 100) + '%';
    }

    // Initialize nav on every page
    document.addEventListener('DOMContentLoaded', initNav);

    return {
        getParam,
        formatRound,
        roundBadgeClass,
        formatSetScores,
        renderMatchCard,
        getInitials,
        winPct,
        initNav
    };
})();
