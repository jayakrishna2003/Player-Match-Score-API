const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const databasePath = path.join(__dirname, 'cricketMatchDetails.db')

const app = express()

app.use(express.json())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()
const convertplayerDEtailsDbObjectToResponseObject = dbObject => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  }
}

const convertMatchDetailsDbObjectToResponseObject = dbObject => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  }
}

const convertplayerMatchDbObjectToResponseObject = dbObject => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  }
}

app.get('/players/', async (request, response) => {
  try {
    const getPlayersQuery = `
      SELECT
        *
      FROM
        player_details;`
    const playersArray = await database.all(getPlayersQuery)
    const playersResponse = playersArray.map(eachPlayer =>
      convertplayerDEtailsDbObjectToResponseObject(eachPlayer),
    )
    response.send(playersResponse)
  } catch (error) {
    response.status(500).send(error.message)
  }
})

app.get('/players/:playerId/', async (request, response) => {
  try {
    const {playerId} = request.params
    const getplayerQuery = `
      SELECT
        *
      FROM
        player_details
      WHERE
        player_id = ${playerId};`
    const player = await database.get(getplayerQuery)
    response.send(convertplayerDEtailsDbObjectToResponseObject(player))
  } catch (error) {
    response.status(500).send(error.message)
  }
})

app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const {playerName} = request.body
  const updateplayerQuery = `
    UPDATE
      player_details
    SET
      player_name = '${playerName}'
    WHERE
      player_id = ${playerId};`
  try {
    await database.run(updateplayerQuery)
    response.send('Player Details Updated')
  } catch (error) {
    response.status(500).send(error.message)
  }
})

app.get('/matches/:matchId/', async (request, response) => {
  try {
    const {matchId} = request.params
    const getmatchQuery = `
      SELECT
        *
      FROM
        match_details
      WHERE
        match_id = ${matchId};`
    const player = await database.get(getmatchQuery)
    response.send(convertMatchDetailsDbObjectToResponseObject(player))
  } catch (error) {
    response.status(500).send(error.message)
  }
})

app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  const getPlayerMatchQuery = `
    SELECT
      *
    FROM player_match_score
      NATURAL JOIN match_details
    WHERE
      player_id = ${playerId};`

  try {
    const playerMatches = await database.all(getPlayerMatchQuery)
    const formattedMatches = playerMatches.map(eachMatch =>
      convertMatchDetailsDbObjectToResponseObject(eachMatch),
    )
    response.send(formattedMatches)
  } catch (error) {
    response.status(500).send(error.message)
  }
})

app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  const getMatchSpecificPlayersQuery = `
	    SELECT
	      player_details.player_id AS playerId,
	      player_details.player_name AS playerName
	    FROM player_match_score NATURAL JOIN player_details
        WHERE match_id=${matchId};`

  try {
    const playerSpecificMatches = await database.all(
      getMatchSpecificPlayersQuery,
    )
    const playersMatches = playerSpecificMatches.map(eachPlayer =>
      convertplayerDEtailsDbObjectToResponseObject(eachPlayer),
    )
    response.send(playersMatches)
  } catch (error) {
    response.status(500).send(error.message)
  }
})

app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  const getPlayerScoredQuery = `
    SELECT
      player_details.player_id AS playerId,
      player_details.player_name AS playerName,
      SUM(player_match_score.score) AS totalScore,
      SUM(player_match_score.fours) AS totalFours,
      SUM(player_match_score.sixes) AS totalSixes
    FROM 
      player_details
    INNER JOIN 
      player_match_score ON player_details.player_id = player_match_score.player_id
    WHERE 
      player_details.player_id = ${playerId}
    GROUP BY 
      player_details.player_id;`

  try {
    const playerScored = await database.all(getPlayerScoredQuery)
    const playersTotalScore = playerScored.map(eachPlayerScore =>
      convertplayerDEtailsDbObjectToResponseObject(eachPlayerScore),
    )
    response.send(playersTotalScore)
  } catch (error) {
    response.status(500).send(error.message)
  }
})

module.exports = app
