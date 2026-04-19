/**
 * data.js — Data loading utilities for EIPL Apila TT League
 * Fetches and caches players.json and tournament JSON files.
 */
const DataStore = (() => {
    let _players = null;
    let _tournaments = {};
    let _tournamentIndex = null;

    const BASE = getBasePath();

    function getBasePath() {
        // Works both locally (file://) and on GitHub Pages
        const path = window.location.pathname;
        const dir = path.substring(0, path.lastIndexOf('/') + 1);
        return dir;
    }

    async function fetchJSON(url) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to load ${url}: ${resp.status}`);
        return resp.json();
    }

    /** Load player registry */
    async function getPlayers() {
        if (!_players) {
            _players = await fetchJSON(`${BASE}data/players.json`);
        }
        return _players;
    }

    /** Get player by ID */
    async function getPlayer(id) {
        const data = await getPlayers();
        return data.players.find(p => p.id === id) || null;
    }

    /** Get player name by ID */
    async function getPlayerName(id) {
        const player = await getPlayer(id);
        return player ? player.name : id;
    }

    /** Load tournament index (list of all tournaments) */
    async function getTournamentIndex() {
        if (!_tournamentIndex) {
            _tournamentIndex = await fetchJSON(`${BASE}data/tournaments/index.json`);
        }
        return _tournamentIndex;
    }

    /** Load a specific tournament */
    async function getTournament(id) {
        if (!_tournaments[id]) {
            _tournaments[id] = await fetchJSON(`${BASE}data/tournaments/${id}.json`);
        }
        return _tournaments[id];
    }

    /** Load all tournaments */
    async function getAllTournaments() {
        const index = await getTournamentIndex();
        const promises = index.tournaments.map(t => getTournament(t.id));
        return Promise.all(promises);
    }

    return {
        getPlayers,
        getPlayer,
        getPlayerName,
        getTournamentIndex,
        getTournament,
        getAllTournaments
    };
})();
