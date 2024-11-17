const AugmentedBoard = require('./AugmentedBoard')
const utils = require('./utils')

class OpponentControlInformation {

  #test
  #board
  #color
  #controlBoard
  #hasKingInSingleCheck = false
  #checkingPiece = null
  #checkingPieceCoordinates = null
  #kingCoordinates = null
  #hasKingInDoubleCheck = false
  /* if the king is in a double check, the king must move, and information about checking pieces is not needed
  for further computations */

  constructor(board, color, test = undefined) {

    if (!(board instanceof AugmentedBoard)) {
      throw new Error('OpponentControlInformation constructor requires an AugmentedBoard argument')
    }

    this.#board = board

    if (color !== 'white' && color !== 'black') {
      throw new Error(`Invalid color argument ${color} supplied`)
    }

    this.#color = color

    utils.validateTestParameter(test)
    this.#test = test === 'test'

    // create an 8x8 array, each entry of which is a boolean false value
    this.#controlBoard = new Array(8).fill(undefined).map(() => new Array(8).fill(false))

    const pieceList = color === 'white' ? board.getWhitePieceListIterable() : board.getBlackPieceListIterable()

    let continueFlag = true
    while (continueFlag) {
      const pieceElement = pieceList.popCurrentPieceElement()
      const piece = pieceElement.piece
      const pieceCoords = pieceElement.coords

      switch (piece.getType()) {
      case 'pawn':
        if (this.#color === 'white') {
          this.#markSquare(piece, pieceCoords, this.#addDiff(pieceCoords, [1, 1]))
          this.#markSquare(piece, pieceCoords, this.#addDiff(pieceCoords, [1, -1]))
        } else {
          this.#markSquare(piece, pieceCoords, this.#addDiff(pieceCoords, [-1, 1]))
          this.#markSquare(piece, pieceCoords, this.#addDiff(pieceCoords, [-1, -1]))
        }
        break
      }

      if (!pieceList.hasNextPieceElement()) continueFlag = false
    }


  }

  squareIsControlled(coords) {
    return this.#controlBoard[coords[0]][coords[1]]
  }

  hasKingInDoubleCheck() {
    return this.#hasKingInDoubleCheck
  }

  hasKingInSingleCheck() {
    return this.#hasKingInSingleCheck
  }

  getCheckingPiece() {
    this.#validateKingInSingleCheck()
    return this.#checkingPiece
  }

  getCheckingPieceCoordinates() {
    this.#validateKingInSingleCheck()
    return this.#checkingPieceCoordinates
  }

  getKingCoordinates() {
    this.#validateKingInSingleCheck()
    return this.#kingCoordinates
  }

  #markSquare(piece, pieceCoords, coords) {
    // if the coords argument do not represent valid board coordinates, then do nothing
    if (!((coords[0] >= 0 && coords[0] <= 7) && (coords[1] >= 0 && coords[1] <= 7))) return

    if (this.#board.isEmptySquare(coords)) {
      this.#setSquareAsControlled(coords)
    } else {
      const occupyingPiece = this.#board.getPiece(coords)
      if (occupyingPiece.getColor() === this.#color) {
        // the control board can be used to determine whether a king can move to a square. A king can't take a protected piece
        this.#setSquareAsControlled(coords)
      } else if (occupyingPiece.getType() === 'king') {
        if (this.#hasKingInSingleCheck) {
          this.#hasKingInDoubleCheck = true
          this.#hasKingInSingleCheck = false
          this.#checkingPiece = null
          this.#checkingPieceCoordinates = null
        } else if (this.#hasKingInDoubleCheck) {
          throw new Error('Not possible for there to be a triple check')
        } else {
          this.#hasKingInSingleCheck = true
          this.#checkingPiece = piece
          this.#checkingPieceCoordinates = pieceCoords
          this.#kingCoordinates = coords
        }
      } else {
        // don't do anything if piece is opposite color and not a king
      }
    }
  }

  #addDiff(coords, diff) {
    return [coords[0] + diff[0], coords[1] + diff[1]]
  }

  #setSquareAsControlled(coords) {
    this.#controlBoard[coords[0]][coords[1]] = true
  }

  #validateKingInSingleCheck() {
    if (!this.#hasKingInSingleCheck) {
      throw new Error('Method can not be used unless player king is in a single check')
    }
  }

  // methods for testing only

  // controlCoords is an array of coordinates (length 2 arrays with two numbers greater than 0 and less than 7) that represent which
  expectState(controlCoords = null, instanceVariables = null, pins = null) {
    if (!this.#test) {
      throw new Error('This method is only available in testing mode.')
    }

    if (controlCoords) {

      const squareHasBeenAddressedBoard = new Array(8).fill(undefined).map(() => new Array(8).fill(false))

      for (const coords of controlCoords) {
        if (!this.squareIsControlled(coords)) {
          throw new Error(`Control boards do not match. Error occurred at coordinates [${coords[0]}, ${coords[1]}].`)
        } else {
          squareHasBeenAddressedBoard[coords[0]][coords[1]] = true
        }
      }

      for (let i = 0; i <= 7; i++) {
        for (let j = 0; j <= 7; j++) {
          if (!squareHasBeenAddressedBoard[i][j]) {
            if (this.squareIsControlled([i, j])) {
              throw new Error(`Control boards do not match. Error occurred at coordinates [${i}, ${j}].`)
            }
          }
        }
      }
    }

    if (instanceVariables) {
      if (instanceVariables.hasKingInSingleCheck !== this.#hasKingInSingleCheck) {
        throw new Error('hasKingInSingleCheck property does not match')
      } else if (instanceVariables.checkingPieceId !== this.#checkingPiece.getId()) {
        throw new Error('Checking piece does not match')
      } else if (instanceVariables.checkingPieceCoordinates[0] !== this.#checkingPieceCoordinates[0]
            || instanceVariables.checkingPieceCoordinates[1] !== this.#checkingPieceCoordinates[1]) {
        throw new Error('Coordinates for checking piece do not match')
      } else if (instanceVariables.kingCoordinates[0] !== this.#kingCoordinates[0]
            || instanceVariables.kingCoordinates[1] !== this.#kingCoordinates[1]) {
        throw new Error('Coordinates for the king do not match')
      } else if (instanceVariables.hasKingInDoubleCheck !== this.#hasKingInDoubleCheck) {
        throw new Error('hasKingInDoubleCheck property does not match')
      }
    }

    if (pins) {
      for (const pin of pins) {
        const pinningPiece = this.#board.getPiece(pin.origin)
        const pinnedPiece = this.#board.getPiece(pin.location)

        if (!pinnedPiece.isPinned()) {
          throw new Error(`isPinned returns as false for piece at [${pin.location[0]}, ${pin.location[1]}]`)
        }

        if (pinningPiece.getId() !== pinnedPiece.getPinningPiece().getId()) {
          throw new Error(`pinning piece stored for piece at [${pin.location[0]}, ${pin.location[1]}] is different
            to that supplied as an argument`)
        }

        if (pinnedPiece.getPinOrigin()[0] !== pin.origin[0] || pinnedPiece.getPinOrigin()[1] !== pin.origin[1]) {
          throw new Error(`pin origin for piece at [${pin.location[0]}, ${pin.location[1]}] does not match
            supplied pin origin`)
        }
      }
    }
  }
}

module.exports = OpponentControlInformation