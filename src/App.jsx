import { useEffect, useMemo, useState } from 'react'

const MODES = ['Card Value', 'Running Count', 'True Count', 'Game Mode']
const DECK_OPTIONS = [1, 2, 6, 8]
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SCORE_STORAGE_KEY = 'countTrainerTopScores'
const PLAYER_STORAGE_KEY = 'countTrainerPlayerName'

function createShoe(deckCount) {
  const cards = []

  for (let deck = 0; deck < deckCount; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${deck}-${suit}-${rank}`,
          rank,
          suit,
          value: getHiLoValue(rank),
        })
      }
    }
  }

  return shuffle(cards)
}

function shuffle(cards) {
  const shuffled = [...cards]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }

  return shuffled
}

function getHiLoValue(rank) {
  if (['2', '3', '4', '5', '6'].includes(rank)) return 1
  if (['7', '8', '9'].includes(rank)) return 0
  return -1
}

function getSuitSymbol(suit) {
  const symbols = {
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
  }

  return symbols[suit]
}

function getNewTrueCountQuestion() {
  const runningCount = Math.floor(Math.random() * 41) - 20
  const deckChoices = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8]
  const decksRemaining = deckChoices[Math.floor(Math.random() * deckChoices.length)]

  return {
    runningCount,
    decksRemaining,
    answer: Math.trunc(runningCount / decksRemaining),
  }
}

function getBlackjackCardValue(rank) {
  if (rank === 'A') return 11
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 10
  return Number(rank)
}

function getHandValue(hand) {
  let total = 0
  let aces = 0

  for (const card of hand) {
    total += getBlackjackCardValue(card.rank)
    if (card.rank === 'A') aces += 1
  }

  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }

  return total
}

function getCardLabel(card) {
  if (!card) return ''
  return `${card.rank}${getSuitSymbol(card.suit)}`
}

function getAccuracy(correct, wrong) {
  const total = correct + wrong

  if (total === 0) return 0

  return Math.round((correct / total) * 100)
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function getSavedScores() {
  try {
    const savedScores = window.localStorage.getItem(SCORE_STORAGE_KEY)

    return savedScores ? JSON.parse(savedScores) : []
  } catch {
    return []
  }
}

function getSavedPlayerName() {
  try {
    return window.localStorage.getItem(PLAYER_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function rankScores(scores) {
  return [...scores]
    .sort((firstScore, secondScore) => {
      if (secondScore.accuracy !== firstScore.accuracy) {
        return secondScore.accuracy - firstScore.accuracy
      }

      return firstScore.timeSeconds - secondScore.timeSeconds
    })
    .slice(0, 5)
}

function App() {
  const [mode, setMode] = useState('Card Value')
  const [deckCount, setDeckCount] = useState(1)
  const [shoe, setShoe] = useState(() => createShoe(1))
  const [cardIndex, setCardIndex] = useState(0)
  const [runningCount, setRunningCount] = useState(0)
  const [guess, setGuess] = useState('')
  const [feedback, setFeedback] = useState('Choose an answer to begin.')
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [playerName, setPlayerName] = useState(() => getSavedPlayerName())
  const [topScores, setTopScores] = useState(() => getSavedScores())
  const [showHelp, setShowHelp] = useState(false)
  const [randomChecksEnabled, setRandomChecksEnabled] = useState(false)
  const [runningCheckDue, setRunningCheckDue] = useState(false)
  const [finalRunningChecked, setFinalRunningChecked] = useState(false)
  const [timerStarted, setTimerStarted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [trueCountQuestion, setTrueCountQuestion] = useState(() => getNewTrueCountQuestion())
  const [gameShoe, setGameShoe] = useState(() => createShoe(1))
  const [gameCardIndex, setGameCardIndex] = useState(0)
  const [playerHand, setPlayerHand] = useState([])
  const [dealerHand, setDealerHand] = useState([])
  const [gamePhase, setGamePhase] = useState('ready')
  const [gameMessage, setGameMessage] = useState('Start a hand when you are ready.')
  const [gameRecord, setGameRecord] = useState({ wins: 0, losses: 0, pushes: 0 })
  const [gameCountGuess, setGameCountGuess] = useState('')
  const [gameCountChecked, setGameCountChecked] = useState(false)
  const [gameCountStats, setGameCountStats] = useState({ correct: 0, wrong: 0 })

  const currentCard = shoe[cardIndex]
  const shoeComplete = cardIndex >= shoe.length
  const accuracy = getAccuracy(stats.correct, stats.wrong)
  const cardsRemaining = Math.max(shoe.length - cardIndex, 0)
  const gamePlayerTotal = getHandValue(playerHand)
  const gameDealerTotal = getHandValue(dealerHand)
  const gameCardsRemaining = Math.max(gameShoe.length - gameCardIndex, 0)
  const gameRunningCountAnswer = gameShoe
    .slice(0, gameCardIndex)
    .reduce((total, card) => total + card.value, 0)

  const cardLabel = useMemo(() => {
    if (!currentCard) return 'Done'
    return `${currentCard.rank}${getSuitSymbol(currentCard.suit)}`
  }, [currentCard])

  const runningCountAnswer = useMemo(() => {
    return shoe.slice(0, cardIndex + 1).reduce((total, card) => total + card.value, 0)
  }, [shoe, cardIndex])

  const timerLabel = useMemo(() => {
    return formatTime(elapsedSeconds)
  }, [elapsedSeconds])

  function startTimer() {
    setTimerStarted(true)
  }

  function resetDrill(nextDeckCount = deckCount, nextMode = mode) {
    setDeckCount(nextDeckCount)
    setMode(nextMode)
    setShoe(createShoe(nextDeckCount))
    setCardIndex(0)
    setRunningCount(0)
    setGuess('')
    setStats({ correct: 0, wrong: 0 })
    setRunningCheckDue(false)
    setFinalRunningChecked(false)
    setTimerStarted(false)
    setElapsedSeconds(0)
    setTrueCountQuestion(getNewTrueCountQuestion())
    resetGame(nextDeckCount)
    setFeedback('Fresh shoe. Ready when you are.')
  }

  function resetGame(nextDeckCount = deckCount) {
    setGameShoe(createShoe(nextDeckCount))
    setGameCardIndex(0)
    setPlayerHand([])
    setDealerHand([])
    setGamePhase('ready')
    setGameMessage('Start a hand when you are ready.')
    setGameCountGuess('')
    setGameCountChecked(false)
    setGameCountStats({ correct: 0, wrong: 0 })
  }

  function startGameHand() {
    if (gamePhase === 'complete' && !gameCountChecked) {
      setGameMessage('Check the running count before starting the next hand.')
      return
    }

    const needsNewShoe = gameCardIndex + 10 >= gameShoe.length
    const nextShoe = needsNewShoe ? createShoe(deckCount) : gameShoe
    const startIndex = needsNewShoe ? 0 : gameCardIndex
    const nextPlayerHand = [nextShoe[startIndex], nextShoe[startIndex + 2]]
    const nextDealerHand = [nextShoe[startIndex + 1], nextShoe[startIndex + 3]]

    setGameShoe(nextShoe)
    setGameCardIndex(startIndex + 4)
    setPlayerHand(nextPlayerHand)
    setDealerHand(nextDealerHand)
    setGameCountGuess('')
    setGameCountChecked(false)
    if (getHandValue(nextPlayerHand) === 21 || getHandValue(nextDealerHand) === 21) {
      const playerTotal = getHandValue(nextPlayerHand)
      const dealerTotal = getHandValue(nextDealerHand)

      setGamePhase('complete')

      if (playerTotal === 21 && dealerTotal === 21) {
        recordGameResult('pushes')
        setGameMessage('Both hands have blackjack. Push.')
      } else if (playerTotal === 21) {
        recordGameResult('wins')
        setGameMessage('Blackjack. You win.')
      } else {
        recordGameResult('losses')
        setGameMessage('Dealer has blackjack.')
      }
    } else {
      setGamePhase('player')
      setGameMessage('Your move. Hit or stand.')
    }
    startTimer()
  }

  function recordGameResult(result) {
    setGameRecord((currentRecord) => ({
      ...currentRecord,
      [result]: currentRecord[result] + 1,
    }))
  }

  function finishGame(nextPlayerHand, nextDealerHand, nextCardIndex) {
    let finalDealerHand = [...nextDealerHand]
    let finalCardIndex = nextCardIndex

    while (getHandValue(finalDealerHand) < 17 && finalCardIndex < gameShoe.length) {
      finalDealerHand = [...finalDealerHand, gameShoe[finalCardIndex]]
      finalCardIndex += 1
    }

    const playerTotal = getHandValue(nextPlayerHand)
    const dealerTotal = getHandValue(finalDealerHand)
    let result = 'pushes'
    let message = 'Push.'

    if (playerTotal > 21) {
      result = 'losses'
      message = `You bust with ${playerTotal}. Dealer wins.`
    } else if (dealerTotal > 21) {
      result = 'wins'
      message = `Dealer busts with ${dealerTotal}. You win.`
    } else if (playerTotal > dealerTotal) {
      result = 'wins'
      message = `You win ${playerTotal} to ${dealerTotal}.`
    } else if (dealerTotal > playerTotal) {
      result = 'losses'
      message = `Dealer wins ${dealerTotal} to ${playerTotal}.`
    }

    setDealerHand(finalDealerHand)
    setGameCardIndex(finalCardIndex)
    setGamePhase('complete')
    setGameMessage(message)
    setGameCountChecked(false)
    recordGameResult(result)
  }

  function handleGameHit() {
    if (gamePhase !== 'player') return

    if (gameCardIndex >= gameShoe.length) {
      setGameMessage('Shoe is out of cards. Start a new hand to reshuffle.')
      setGamePhase('complete')
      return
    }

    const nextPlayerHand = [...playerHand, gameShoe[gameCardIndex]]
    const nextCardIndex = gameCardIndex + 1

    setPlayerHand(nextPlayerHand)
    setGameCardIndex(nextCardIndex)

    if (getHandValue(nextPlayerHand) > 21) {
      finishGame(nextPlayerHand, dealerHand, nextCardIndex)
    } else {
      setGameMessage('Card dealt. Hit or stand.')
    }
  }

  function handleGameStand() {
    if (gamePhase !== 'player') return
    finishGame(playerHand, dealerHand, gameCardIndex)
  }

  function handleGameCountSubmit(event) {
    event.preventDefault()

    if (gamePhase !== 'complete') {
      setGameMessage('Finish the hand first, then check the count.')
      return
    }

    if (gameCountChecked) {
      setGameMessage('Count already checked. Deal a new hand to keep going.')
      return
    }

    if (gameCountGuess.trim() === '') {
      setGameMessage('Enter the running count first.')
      return
    }

    const userAnswer = Number(gameCountGuess)
    const isCorrect = userAnswer === gameRunningCountAnswer

    setGameCountStats((currentStats) => ({
      correct: currentStats.correct + (isCorrect ? 1 : 0),
      wrong: currentStats.wrong + (isCorrect ? 0 : 1),
    }))
    setGameCountChecked(true)
    setGameCountGuess('')
    setGameMessage(
      isCorrect
        ? `Correct. The running count is ${gameRunningCountAnswer}.`
        : `Not quite. The running count is ${gameRunningCountAnswer}.`,
    )
  }

  function getNextStats(isCorrect) {
    return {
      correct: stats.correct + (isCorrect ? 1 : 0),
      wrong: stats.wrong + (isCorrect ? 0 : 1),
    }
  }

  function saveCompletedRun(finalStats) {
    const score = {
      id: Date.now(),
      playerName: playerName.trim() || 'Player',
      mode,
      deckCount,
      accuracy: getAccuracy(finalStats.correct, finalStats.wrong),
      correct: finalStats.correct,
      wrong: finalStats.wrong,
      timeSeconds: elapsedSeconds,
    }
    const nextTopScores = rankScores([...topScores, score])

    setTopScores(nextTopScores)
    try {
      window.localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(nextTopScores))
    } catch {
      // Scores still work for the current session if browser storage is unavailable.
    }
  }

  function clearScoreboards() {
    setTopScores([])
    try {
      window.localStorage.removeItem(SCORE_STORAGE_KEY)
    } catch {
      // Nothing else to do if browser storage is unavailable.
    }
    setFeedback('Top 5 records cleared.')
  }

  function handlePlayerNameChange(event) {
    setPlayerName(event.target.value)
    try {
      window.localStorage.setItem(PLAYER_STORAGE_KEY, event.target.value)
    } catch {
      // Player name still works for the current session if browser storage is unavailable.
    }
  }

  function goToNextCard(nextRunningCount = runningCount) {
    if (cardIndex + 1 >= shoe.length) {
      setCardIndex(shoe.length)
      setRunningCount(nextRunningCount)
      setTimerStarted(false)
      setFeedback(`${deckCount}-deck shoe complete. Reset to start a new shoe.`)
      return
    }

    setCardIndex(cardIndex + 1)
    setRunningCount(nextRunningCount)
  }

  function recordAnswer(isCorrect, message, nextStats = getNextStats(isCorrect)) {
    setStats(nextStats)
    setFeedback(message)
    return nextStats
  }

  function handleCardValueGuess(value) {
    if (shoeComplete || !currentCard) {
      setFeedback(`${deckCount}-deck shoe complete. Reset to start a new shoe.`)
      return
    }

    startTimer()

    const isCorrect = value === currentCard.value
    const nextStats = recordAnswer(
      isCorrect,
      isCorrect
        ? `Correct. ${currentCard.rank} is ${currentCard.value}.`
        : `Not quite. ${currentCard.rank} counts as ${currentCard.value}.`,
    )
    if (cardIndex + 1 >= shoe.length) {
      saveCompletedRun(nextStats)
    }
    goToNextCard()
  }

  function handleDealRunningCard() {
    if (shoeComplete) {
      setFeedback(`${deckCount}-deck shoe complete. Reset to start a new shoe.`)
      return
    }

    if (runningCheckDue) {
      setFeedback('Random check first. Enter your running count before dealing another card.')
      return
    }

    startTimer()

    if (cardIndex + 1 >= shoe.length) {
      setCardIndex(shoe.length)
      setRunningCount(runningCountAnswer)
      setGuess('')
      setRunningCheckDue(true)
      setFinalRunningChecked(false)
      setTimerStarted(false)
      setFeedback(`${deckCount}-deck shoe complete. Enter the final running count.`)
      return
    }

    const nextCardIndex = cardIndex + 1
    const shouldRandomCheck =
      randomChecksEnabled && nextCardIndex < shoe.length - 1 && Math.random() < 0.18

    setCardIndex(nextCardIndex)
    setRunningCheckDue(shouldRandomCheck)
    setFeedback(shouldRandomCheck ? 'Random check. Enter the running count.' : 'Card dealt. Keep the count in your head.')
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (mode !== 'Card Value') return

      const quickKeyValues = {
        ArrowRight: 1,
        '+': 1,
        '=': 1,
        ArrowDown: 0,
        '0': 0,
        ArrowLeft: -1,
        '-': -1,
      }

      if (!(event.key in quickKeyValues)) return

      event.preventDefault()
      handleCardValueGuess(quickKeyValues[event.key])
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mode, currentCard, runningCount, cardIndex, deckCount])

  function handleRunningCountSubmit(event) {
    event.preventDefault()

    if (shoeComplete && finalRunningChecked) {
      setFeedback(`${deckCount}-deck shoe complete. Reset to start a new shoe.`)
      return
    }

    if (!shoeComplete && !runningCheckDue) {
      setFeedback('Keep dealing. You only check at the end unless Random Checks is on.')
      return
    }

    if (guess.trim() === '') {
      setFeedback('Enter the running count first.')
      return
    }

    startTimer()

    const userAnswer = Number(guess)
    const isCorrect = userAnswer === runningCountAnswer

    const nextStats = recordAnswer(
      isCorrect,
      isCorrect
        ? `Correct. The running count is ${runningCountAnswer}.`
        : `Not quite. The running count is ${runningCountAnswer}.`,
    )
    if (shoeComplete) {
      saveCompletedRun(nextStats)
    }
    setRunningCount(runningCountAnswer)
    setRunningCheckDue(false)
    setFinalRunningChecked(shoeComplete)
    setGuess('')
  }

  function handleTrueCountSubmit(event) {
    event.preventDefault()

    if (guess.trim() === '') {
      setFeedback('Enter the true count first.')
      return
    }

    startTimer()

    const userAnswer = Number(guess)
    const isCorrect = userAnswer === trueCountQuestion.answer

    recordAnswer(
      isCorrect,
      isCorrect
        ? `Correct. True count is ${trueCountQuestion.answer}.`
        : `Not quite. ${trueCountQuestion.runningCount} ÷ ${trueCountQuestion.decksRemaining} truncates to ${trueCountQuestion.answer}.`,
    )
    setGuess('')
    setTrueCountQuestion(getNewTrueCountQuestion())
  }

  useEffect(() => {
    if (!timerStarted) return

    const timerId = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => currentSeconds + 1)
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [timerStarted])

  return (
    <main className="app-shell">
      <div className="app-layout">
        <section className="trainer">
          <header className="app-header">
            <div>
              <p className="eyebrow">Hi-Lo Blackjack</p>
              <h1>Count Trainer</h1>
            </div>
            <div className="header-actions">
              <button className="help-button" type="button" onClick={() => setShowHelp(!showHelp)}>
                {showHelp ? 'Hide Help' : 'Help'}
              </button>
              <button className="reset-button" type="button" onClick={() => resetDrill()}>
                Reset
              </button>
            </div>
          </header>

          {showHelp && (
            <section className="help-panel" aria-label="Hi-Lo scoring help">
              <div className="help-section">
                <h2>Hi-Lo Card Values</h2>
                <div className="help-row">
                  <span>2, 3, 4, 5, 6</span>
                  <strong>+1</strong>
                </div>
                <div className="help-row">
                  <span>7, 8, 9</span>
                  <strong>0</strong>
                </div>
                <div className="help-row">
                  <span>10, J, Q, K, A</span>
                  <strong>-1</strong>
                </div>
              </div>

              <div className="help-section">
                <h2>Running Count</h2>
                <p>
                  Start at 0, then add each card value as cards appear. If you see 5, K, 8,
                  your count moves 0 to +1, then back to 0, then stays 0.
                </p>
                <p>
                  In Running Count mode, deal through the whole shoe while keeping the count
                  in your head, then enter the final count.
                </p>
              </div>

              <div className="help-section">
                <h2>Quick Keys</h2>
                <div className="help-row">
                  <span>Right arrow or +</span>
                  <strong>+1</strong>
                </div>
                <div className="help-row">
                  <span>Down arrow or 0</span>
                  <strong>0</strong>
                </div>
                <div className="help-row">
                  <span>Left arrow or -</span>
                  <strong>-1</strong>
                </div>
              </div>

              <div className="help-section">
                <h2>Timer</h2>
                <p>The timer starts when you answer or deal a card. Reset starts it over.</p>
              </div>

              <div className="help-section">
                <h2>Scoreboards</h2>
                <p>Enter a player name, finish a full shoe, and your best runs go into the Top 5 list.</p>
              </div>

              <div className="help-section">
                <h2>Shoe End</h2>
                <p>When all cards in the selected deck level are used, the shoe stops. Reset starts a new shoe.</p>
              </div>

              <div className="help-section">
                <h2>Random Checks</h2>
                <p>Turn this on in Running Count mode to get surprise count checks before the shoe ends.</p>
              </div>

              <div className="help-section">
                <h2>True Count</h2>
                <p>
                  True count adjusts the running count for how many decks are left. Divide
                  running count by decks remaining, then round toward zero.
                </p>
                <p className="help-example">Example: +6 running count / 2 decks left = +3 true count.</p>
              </div>

              <div className="help-section">
                <h2>Game Mode</h2>
                <p>Play one blackjack hand against the dealer. Hit takes a card. Stand lets the dealer play.</p>
                <p>After each hand, enter the running count for all exposed cards in the shoe.</p>
              </div>
            </section>
          )}

          <div className="mode-tabs" aria-label="Training mode">
            {MODES.map((modeName) => (
              <button
                className={mode === modeName ? 'active' : ''}
                key={modeName}
                type="button"
                onClick={() => resetDrill(deckCount, modeName)}
              >
                {modeName}
              </button>
            ))}
          </div>

          <div className="deck-options" aria-label="Deck count">
            {DECK_OPTIONS.map((option) => (
              <button
                className={deckCount === option ? 'selected' : ''}
                key={option}
                type="button"
                onClick={() => resetDrill(option)}
              >
                {option} {option === 1 ? 'deck' : 'decks'}
              </button>
            ))}
          </div>

          <section className="player-panel" aria-label="Player setup">
            <label htmlFor="player-name">Player Name</label>
            <input
              id="player-name"
              type="text"
              value={playerName}
              placeholder="Player"
              onChange={handlePlayerNameChange}
            />
          </section>

          {mode === 'True Count' ? (
            <section className="true-count-board" aria-label="True count question">
              <div>
                <span>Running Count</span>
                <strong>{trueCountQuestion.runningCount}</strong>
              </div>
              <div>
                <span>Decks Remaining</span>
                <strong>{trueCountQuestion.decksRemaining}</strong>
              </div>
            </section>
          ) : mode === 'Game Mode' ? (
            <section className="game-table" aria-label="Blackjack game table">
              <div className="game-hand">
                <div className="game-hand-header">
                  <span>Dealer</span>
                  <strong>
                    {dealerHand.length === 0
                      ? '-'
                      : gamePhase === 'player'
                        ? `${getBlackjackCardValue(dealerHand[0].rank)}+`
                        : gameDealerTotal}
                  </strong>
                </div>
                <div className="mini-card-row">
                  {dealerHand.length === 0 ? (
                    <span className="empty-hand">No cards yet</span>
                  ) : (
                    dealerHand.map((card, index) =>
                      gamePhase === 'player' && index === 1 ? (
                        <span className="mini-card hidden-card" key={card.id}>
                          ?
                        </span>
                      ) : (
                        <span className={`mini-card ${card.suit}`} key={card.id}>
                          {getCardLabel(card)}
                        </span>
                      ),
                    )
                  )}
                </div>
              </div>

              <div className="game-hand">
                <div className="game-hand-header">
                  <span>{playerName.trim() || 'Player'}</span>
                  <strong>{playerHand.length === 0 ? '-' : gamePlayerTotal}</strong>
                </div>
                <div className="mini-card-row">
                  {playerHand.length === 0 ? (
                    <span className="empty-hand">Start a hand</span>
                  ) : (
                    playerHand.map((card) => (
                      <span className={`mini-card ${card.suit}`} key={card.id}>
                        {getCardLabel(card)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <p className="game-message">{gameMessage}</p>

              <div className="game-actions">
                <button type="button" onClick={startGameHand}>
                  {gamePhase === 'ready' ? 'Deal Hand' : 'New Hand'}
                </button>
                <button disabled={gamePhase !== 'player'} type="button" onClick={handleGameHit}>
                  Hit
                </button>
                <button disabled={gamePhase !== 'player'} type="button" onClick={handleGameStand}>
                  Stand
                </button>
              </div>

              <form className="game-count-check" onSubmit={handleGameCountSubmit}>
                <label htmlFor="game-count">Running count after this hand</label>
                <div>
                  <input
                    disabled={gamePhase !== 'complete' || gameCountChecked}
                    id="game-count"
                    inputMode="numeric"
                    type="number"
                    value={gameCountGuess}
                    onChange={(event) => setGameCountGuess(event.target.value)}
                  />
                  <button disabled={gamePhase !== 'complete' || gameCountChecked} type="submit">
                    Check Count
                  </button>
                </div>
              </form>

              <div className="game-record" aria-label="Game record">
                <div>
                  <span>Wins</span>
                  <strong>{gameRecord.wins}</strong>
                </div>
                <div>
                  <span>Losses</span>
                  <strong>{gameRecord.losses}</strong>
                </div>
                <div>
                  <span>Pushes</span>
                  <strong>{gameRecord.pushes}</strong>
                </div>
                <div>
                  <span>Count Correct</span>
                  <strong>{gameCountStats.correct}</strong>
                </div>
                <div>
                  <span>Count Wrong</span>
                  <strong>{gameCountStats.wrong}</strong>
                </div>
                <div>
                  <span>Count Accuracy</span>
                  <strong>{getAccuracy(gameCountStats.correct, gameCountStats.wrong)}%</strong>
                </div>
              </div>
            </section>
          ) : (
            <section className={`card ${currentCard?.suit || ''}`} aria-label="Current card">
              <span className="corner top">{cardLabel}</span>
              <strong>{cardLabel}</strong>
              <span className="corner bottom">{cardLabel}</span>
            </section>
          )}

          {mode === 'Card Value' && (
            <div className="answer-grid" aria-label="Card value answers">
              {[1, 0, -1].map((value) => (
                <button
                  disabled={shoeComplete}
                  key={value}
                  type="button"
                  onClick={() => handleCardValueGuess(value)}
                >
                  {value > 0 ? `+${value}` : value}
                </button>
              ))}
            </div>
          )}

          {mode === 'Running Count' && (
            <form className="answer-form" onSubmit={handleRunningCountSubmit}>
              <div className="toggle-row">
                <span>Random Checks</span>
                <button
                  aria-pressed={randomChecksEnabled}
                  className={randomChecksEnabled ? 'toggle-button active' : 'toggle-button'}
                  type="button"
                  onClick={() => setRandomChecksEnabled(!randomChecksEnabled)}
                >
                  {randomChecksEnabled ? 'On' : 'Off'}
                </button>
              </div>
              <label htmlFor="running-count">
                {shoeComplete ? 'Final running count' : runningCheckDue ? 'Random check count' : 'Keep counting until a check'}
              </label>
              <div>
                <input
                  disabled={finalRunningChecked || (!shoeComplete && !runningCheckDue)}
                  id="running-count"
                  inputMode="numeric"
                  type="number"
                  value={guess}
                  onChange={(event) => setGuess(event.target.value)}
                />
                <button disabled={finalRunningChecked || (!shoeComplete && !runningCheckDue)} type="submit">Check</button>
              </div>
              <button
                className="secondary-action"
                disabled={shoeComplete || runningCheckDue}
                type="button"
                onClick={handleDealRunningCard}
              >
                {shoeComplete ? 'Shoe Complete' : runningCheckDue ? 'Check Due' : 'Deal Card'}
              </button>
            </form>
          )}

          {mode === 'True Count' && (
            <form className="answer-form" onSubmit={handleTrueCountSubmit}>
              <label htmlFor="true-count">True count, rounded toward zero</label>
              <div>
                <input
                  id="true-count"
                  inputMode="numeric"
                  type="number"
                  value={guess}
                  onChange={(event) => setGuess(event.target.value)}
                />
                <button type="submit">Check</button>
              </div>
            </form>
          )}

          <p className="feedback" role="status">
            {feedback}
          </p>

          <section className="stats-panel" aria-label="Training stats">
            <div>
              <span>{mode === 'Game Mode' ? 'Wins' : 'Correct'}</span>
              <strong>{mode === 'Game Mode' ? gameRecord.wins : stats.correct}</strong>
            </div>
            <div>
              <span>{mode === 'Game Mode' ? 'Losses' : 'Wrong'}</span>
              <strong>{mode === 'Game Mode' ? gameRecord.losses : stats.wrong}</strong>
            </div>
            <div>
              <span>{mode === 'Game Mode' ? 'Pushes' : 'Accuracy'}</span>
              <strong>{mode === 'Game Mode' ? gameRecord.pushes : `${accuracy}%`}</strong>
            </div>
            <div>
              <span>{mode === 'Game Mode' ? 'Count' : 'Running'}</span>
              <strong>
                {mode === 'True Count'
                  ? trueCountQuestion.runningCount
                  : mode === 'Game Mode'
                    ? (gameCountChecked ? gameRunningCountAnswer : 'Hidden')
                    : runningCount}
              </strong>
            </div>
            <div>
              <span>Cards Left</span>
              <strong>
                {mode === 'True Count' ? '—' : mode === 'Game Mode' ? gameCardsRemaining : cardsRemaining}
              </strong>
            </div>
            <div>
              <span>Timer</span>
              <strong>{timerLabel}</strong>
            </div>
          </section>
        </section>

        <aside className="scoreboard" aria-label="Top completed runs">
          <div className="scoreboard-header">
            <h2>Top 5 Completed Runs</h2>
            <button className="clear-scores-button" type="button" onClick={clearScoreboards}>
              Clear Records
            </button>
          </div>
          {topScores.length === 0 ? (
            <p className="empty-scoreboard">Finish a full shoe to set the first record.</p>
          ) : (
            <ol className="leaderboard-list">
              {topScores.map((score, index) => (
                <li className="leaderboard-row" key={score.id}>
                  <span className="rank">{index + 1}</span>
                  <div className="leaderboard-player">
                    <strong>{score.playerName}</strong>
                    <span>
                      {score.mode} · {score.deckCount} {score.deckCount === 1 ? 'deck' : 'decks'}
                    </span>
                  </div>
                  <div>
                    <span>Score</span>
                    <strong>{score.accuracy}%</strong>
                  </div>
                  <div>
                    <span>Time</span>
                    <strong>{formatTime(score.timeSeconds)}</strong>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </main>
  )
}

export default App
