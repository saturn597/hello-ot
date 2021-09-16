const gameAbortedReasons = {
  opponentDisconnect: 'opponentDisconnect',
  opponentLeft: 'opponentLeft',
  serverConnectionLost: 'serverConnectionLost',
};

const config = {
  devMode: false,
  gameAbortedReasons,
  port: 443,

  boardWidth: 8,  // Width and height of board in squares
  boardHeight: 8,

  squareWidth: 52,
  squareHeight: 52,  // Width and height of squares in pixels
}

export default config;
