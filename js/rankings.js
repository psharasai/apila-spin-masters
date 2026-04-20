/**
 * rankings.js — Ranking points calculation engine
 *
 * Placement-based points (per tournament):
 *   Winner:      500 pts
 *   Runner-up:   300 pts
 *   Semifinalist: 180 pts  (lost in SF)
 *   Quarterfinalist: 90 pts  (lost in QF)
 *   Participant:  45 pts  (played but eliminated in group stage)
 */
const Rankings = (() => {

    const PLACEMENT_POINTS = {
        winner:     500,
        runner_up:  300,
        semifinal:  200,
        quarterfinal: 100,
        participant: 50
    };

    // Simple match points for group stage standings display only
    const GROUP_MATCH_POINTS = { win: 2, loss: 0 };

    /** Determine if player won the match */
    function isWinner(match, playerId) {
        if (match.walkover && match.walkoverId) {
            return playerId !== match.walkoverId;
        }
        if (!match.score) return false;
        if (match.player1 === playerId) return match.score[0] > match.score[1];
        if (match.player2 === playerId) return match.score[1] > match.score[0];
        return false;
    }

    /** Determine a player's placement in a tournament */
    function getPlacement(tournament, playerId) {
        const roundOrder = ['group', 'quarterfinal', 'semifinal', 'final'];
        let bestRound = null;
        let wonBestRound = false;
        let matchesPlayed = 0;

        for (const match of tournament.matches) {
            if (match.player1 !== playerId && match.player2 !== playerId) continue;
            if (match.bye) continue;
            matchesPlayed++;

            const round = match.round || 'group';
            const roundIdx = roundOrder.indexOf(round);
            const bestIdx = bestRound ? roundOrder.indexOf(bestRound) : -1;

            if (roundIdx > bestIdx) {
                bestRound = round;
                wonBestRound = isWinner(match, playerId);
            } else if (roundIdx === bestIdx) {
                wonBestRound = isWinner(match, playerId);
            }
        }

        if (matchesPlayed === 0) return { placement: null, label: 'Did not play', bestRound: null };

        if (bestRound === 'final') {
            return wonBestRound
                ? { placement: 'winner', label: 'Winner', bestRound }
                : { placement: 'runner_up', label: 'Runner-up', bestRound };
        }
        if (bestRound === 'semifinal') {
            return { placement: 'semifinal', label: 'Semifinalist', bestRound };
        }
        if (bestRound === 'quarterfinal') {
            return { placement: 'quarterfinal', label: 'Quarterfinalist', bestRound };
        }
        return { placement: 'participant', label: 'Participant', bestRound: bestRound || 'group' };
    }

    /** Calculate points for a player in a single tournament */
    function tournamentPoints(tournament, playerId) {
        let wins = 0;
        let losses = 0;

        for (const match of tournament.matches) {
            if (match.player1 !== playerId && match.player2 !== playerId) continue;
            if (match.bye) continue;
            if (isWinner(match, playerId)) wins++; else losses++;
        }

        const { placement, label, bestRound } = getPlacement(tournament, playerId);
        const total = placement ? PLACEMENT_POINTS[placement] : 0;

        return { total, wins, losses, bestRound, placement, placementLabel: label };
    }

    /** Calculate cumulative rankings across all tournaments */
    function computeRankings(tournaments, players) {
        const rankings = {};

        for (const p of players) {
            rankings[p.id] = {
                id: p.id,
                name: p.name,
                totalPoints: 0,
                totalWins: 0,
                totalLosses: 0,
                tournamentsPlayed: 0,
                perTournament: {}
            };
        }

        for (const t of tournaments) {
            for (const p of players) {
                const result = tournamentPoints(t, p.id);
                if (result.wins + result.losses > 0) {
                    rankings[p.id].totalPoints += result.total;
                    rankings[p.id].totalWins += result.wins;
                    rankings[p.id].totalLosses += result.losses;
                    rankings[p.id].tournamentsPlayed++;
                    rankings[p.id].perTournament[t.id] = result;
                }
            }
        }

        return Object.values(rankings)
            .filter(r => r.tournamentsPlayed > 0)
            .sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
                return a.totalLosses - b.totalLosses;
            });
    }

    /** Get all matches between two players across all tournaments */
    function headToHead(tournaments, player1Id, player2Id) {
        const matches = [];
        for (const t of tournaments) {
            for (const m of t.matches) {
                const hasP1 = m.player1 === player1Id || m.player2 === player1Id;
                const hasP2 = m.player1 === player2Id || m.player2 === player2Id;
                if (hasP1 && hasP2 && !m.bye) {
                    matches.push({ ...m, tournamentId: t.id, tournamentName: t.name });
                }
            }
        }
        return matches;
    }

    /** Get group standings for a tournament */
    function groupStandings(tournament, groupName) {
        const group = tournament.groups.find(g => g.name === groupName);
        if (!group) return [];

        const withdrawals = tournament.withdrawals || [];

        const standings = {};
        for (const pid of group.players) {
            standings[pid] = {
                id: pid, played: 0, wins: 0, losses: 0, points: 0,
                setsWon: 0, setsLost: 0,
                pointsScored: 0, pointsConceded: 0,
                withdrawn: withdrawals.includes(pid)
            };
        }

        // Collect group matches for H2H lookup
        const groupMatches = tournament.matches.filter(
            m => m.round === 'group' && m.group === groupName && !m.bye
        );

        for (const match of groupMatches) {
            const p1 = match.player1;
            const p2 = match.player2;
            if (!standings[p1] || !standings[p2]) continue;

            standings[p1].played++;
            standings[p2].played++;

            if (match.score) {
                standings[p1].setsWon += match.score[0];
                standings[p1].setsLost += match.score[1];
                standings[p2].setsWon += match.score[1];
                standings[p2].setsLost += match.score[0];
            }

            // Accumulate individual points from set scores
            if (match.setScores) {
                for (const set of match.setScores) {
                    standings[p1].pointsScored += set[0];
                    standings[p1].pointsConceded += set[1];
                    standings[p2].pointsScored += set[1];
                    standings[p2].pointsConceded += set[0];
                }
            }

            if (isWinner(match, p1)) {
                standings[p1].wins++;
                standings[p1].points += GROUP_MATCH_POINTS.win;
                standings[p2].losses++;
                standings[p2].points += GROUP_MATCH_POINTS.loss;
            } else {
                standings[p2].wins++;
                standings[p2].points += GROUP_MATCH_POINTS.win;
                standings[p1].losses++;
                standings[p1].points += GROUP_MATCH_POINTS.loss;
            }
        }

        /** Head-to-head: did playerA beat playerB in group matches? Returns 1 (A won), -1 (B won), 0 (no match/tie) */
        function h2hResult(a, b) {
            for (const m of groupMatches) {
                const hasA = m.player1 === a || m.player2 === a;
                const hasB = m.player1 === b || m.player2 === b;
                if (hasA && hasB) {
                    return isWinner(m, a) ? 1 : -1;
                }
            }
            return 0;
        }

        return Object.values(standings).sort((a, b) => {
            // Withdrawn players always at the bottom
            if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
            // Players who played rank above those who didn't
            if (b.played !== a.played && (a.played === 0 || b.played === 0)) return b.played - a.played;
            // 1. Match wins (points)
            if (b.points !== a.points) return b.points - a.points;
            // 2. Head-to-head
            const h2h = h2hResult(a.id, b.id);
            if (h2h !== 0) return -h2h; // positive = a won, so a ranks higher (return negative)
            // 3. Set win percentage
            const aPctSets = a.setsWon + a.setsLost > 0 ? a.setsWon / (a.setsWon + a.setsLost) : 0;
            const bPctSets = b.setsWon + b.setsLost > 0 ? b.setsWon / (b.setsWon + b.setsLost) : 0;
            if (bPctSets !== aPctSets) return bPctSets - aPctSets;
            // 4. Points win percentage
            const aPctPts = a.pointsScored + a.pointsConceded > 0 ? a.pointsScored / (a.pointsScored + a.pointsConceded) : 0;
            const bPctPts = b.pointsScored + b.pointsConceded > 0 ? b.pointsScored / (b.pointsScored + b.pointsConceded) : 0;
            return bPctPts - aPctPts;
        });
    }

    /** Get the champion (final winner) of a tournament */
    function getChampion(tournament) {
        const finalMatch = tournament.matches.find(m => m.round === 'final');
        if (!finalMatch) return null;
        return isWinner(finalMatch, finalMatch.player1) ? finalMatch.player1 : finalMatch.player2;
    }

    return {
        PLACEMENT_POINTS,
        isWinner,
        getPlacement,
        tournamentPoints,
        computeRankings,
        headToHead,
        groupStandings,
        getChampion
    };
})();
