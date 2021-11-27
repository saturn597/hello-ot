import React from 'react';

import config from '../config.js';
import OthelloState from '../othelloState.js';

import Board from './board.js';
import Instructions from './instructions.js';
import ScoreDisplay from './scoreDisplay.js';
import TurnIndicator from './turnIndicator.js';
import UndoRedo from './undoRedo.js';

const gameAbortedReasons = config.gameAbortedReasons;


export default class Game extends React.Component {
  // A React game of Othello.

  constructor(props) {
    super(props);

    this.advanceState = this.advanceState.bind(this);
    this.endGame = this.endGame.bind(this);
    this.socketClosed = this.socketClosed.bind(this);
    this.socketMessage = this.socketMessage.bind(this);

    const os = OthelloState.initialState(this.props.width, this.props.height);
    this.state = {
      gameAborted: false,
      history: [os],
      historyIndex: 0,
      os,
    };

    if (props.ws) {
      props.ws.addEventListener('close', this.socketClosed);
      props.ws.addEventListener('message', this.socketMessage);
    }
  }

  componentWillUnmount() {
    if (this.props.ws) {
      this.props.ws.removeEventListener('close', this.socketClosed);
      this.props.ws.removeEventListener('message', this.socketMessage);
    }
  }

  acceptingClicks() {
    // Determine whether our board should accept clicks

    const props = this.props;
    const state = this.state;

    const gameOngoing = !state.gameAborted && !state.os.gameOver;
    const ourTurn = state.os.currentPlayer === props.player;
    const playingOffline = props.player === null;

    return gameOngoing && (ourTurn || playingOffline);
  }

  advanceState(change) {
    this.setState((state, props) => {
      const historyIndex = state.historyIndex + change;
      const os = state.history[historyIndex];
      return { os, historyIndex };
    });
  }

  endGame() {
    this.props.onEnd();
  }

  handleClick(square) {
    // mouse was clicked in a given square

    this.setState((state, props) => {
      if (!this.acceptingClicks()) {
        return null;
      }

      const os = state.os.move(square);
      if (os === null) {
        // OthelloState returns null on invalid move
        return null;
      }

      const historyIndex = state.historyIndex + 1;
      const history = state.history.slice(0, historyIndex);
      history.push(os);

      if (this.props.player !== null) {
        props.ws.send(JSON.stringify({ move: square }));
      }

      return { os, history, historyIndex };
    });
  }

  socketClosed(e) {
    this.setState((state, props) => {
      if (props.player === null) {
        return null;
      }
      return {
        gameAborted: gameAbortedReasons.serverConnectionLost,
      };
    })
  }

  socketMessage(msg) {
    const parsed = JSON.parse(msg.data);
    if ('move' in parsed) {
      // server is saying our opponent moved
      const square = parsed['move'];

      this.setState((state, props) => {
        return {
          os: state.os.move(square),
        };
      });
    }

    if ('gameEnd' in parsed) {
      const reason = parsed['gameEnd'];
      this.setState({
        gameAborted: gameAbortedReasons[reason],
      });
    }
  }

  render() {
    const score = this.state.os.getScore();

    const online = this.props.player !== null;
    const allowUndo = this.state.historyIndex > 0;
    const allowRedo = this.state.historyIndex < this.state.history.length - 1;

    return (
      <div id="main">
        <Board
          enabled={this.acceptingClicks()}
          squares={this.state.os.squares}
          onClick={i => this.handleClick(i)}
          width={this.props.width}
        />
        <div id="hud">
          <ScoreDisplay score={score} />
          <TurnIndicator
            online={online}
            player={this.props.player}
            turn={this.state.os.currentPlayer}
          />
          <Instructions
            gameAborted={this.state.gameAborted}
            os={this.state.os}
            player={this.props.player}
            turn={this.state.os.currentPlayer}
          />
          {!online &&
            <UndoRedo
              allowUndo={allowUndo}
              allowRedo={allowRedo}
              advanceState={this.advanceState}
            />
          }
          <button id="endGame" onClick={this.endGame}>End game</button>
        </div>

      </div>
    );
  }
}


