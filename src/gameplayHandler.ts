import GameplayState, { IPiece, IRoomClient, IUser } from './components/State/GameplayState';
import $ from 'jquery';
import { getFormSubmitValue, uuidv4 } from "./utils";
import { GetUserReady, MeJoin, RollDicePoint, StartGame, StartTurn, SyncPieceState, ThrowDice, UpdatePieceState, UserJoin, UserLeave, UserReady, UserSkipTurn } from "./gameEvent";
import Piece from './components/Piece';
import DiceManager from './components/DiceManager';

export const state = new GameplayState();

// global var
let diceManager: DiceManager = null;

const initGameEvent = () => {
  $('.userInRoom tbody').empty();
  $('.selectRoom').hide();
  $('.userInRoom').show();
  $('.gameplay').show();

  const gameRoom = state.getGameRoom();

  gameRoom.onLeave((_) => {
    location.reload();
  });

  gameRoom.onError((code) => {
    location.reload();
  })

  gameRoom.onMessage(UserJoin, (mess) => {
    state.setListUserInRoom(mess.userList);

    $('.userInRoom tbody').empty();

    for (const user of mess.userList) {
      addUserToRoom(user);
      setUserStatus(user);
    }
  });
  gameRoom.onMessage(StartGame, (mess) => {
    loadGame();

    state.setCurrentTurn(mess.userId);

    setUserTurnIcon(mess.userId);

    calculateUserHandling();
    displayToolBoxOnState();
  });
  gameRoom.onMessage(UserLeave, (mess) => {
    handleUserLeaveUI(mess);
  });
  gameRoom.onMessage(MeJoin, (mess) => {
    state.getGameplay().initGameplay(mess.cameraPos)
      .then(_ => {
        state.getGameRoom().send(GetUserReady, '');
      })
  });
  gameRoom.onMessage(GetUserReady, (mess: any) => {
    // downloadOutput(mess, 'test.json');

    for (const payload of mess.data) {
      handleUserReady(payload);
    }
  });
  gameRoom.onMessage(UserReady, (mess) => {
    if (mess.user.id === state.getUserId()) {
      $('#startGame').prop('disabled', true);
    }
    setUserStatus(mess.user);
    handleUserReady(mess);
  });
  gameRoom.onMessage(UpdatePieceState, (mess) => {
    handleUpdatePiece(mess);
  });
  gameRoom.onMessage(StartTurn, (mess) => {
    state.setCurrentTurn(mess.userId);
    setUserTurnIcon(mess.userId);
    
    calculateUserHandling();
    displayToolBoxOnState();
  });
  state.getGameRoom().onMessage(ThrowDice, mess => {
    diceManager.throwDice(mess.dices);

    state.setEnableToolBox(false);
    state.setCanSpawn(false);
    state.setCanGoNext(false);
  });
  gameRoom.onMessage(RollDicePoint, (mess) => {
    state.setPointDice1(mess.dice1);
    state.setPointDice2(mess.dice2);

    calculateUserHandling();
    displayToolBoxOnState();
  });
  gameRoom.onMessage(SyncPieceState, (mess) => {
    const piece = state.getGamePiece(mess.userId).find(x => x.order === mess.order);
    piece.goByStep(mess.step);
  })
}

const loadGame = () => {
  diceManager = new DiceManager(state.getGameplay().getCamera(),
    state.getGameplay().getWorld());
  
  state.getGameplay().addObject([diceManager]);

  $('.gameToolBox .toolBox #throwDice').on('click', ev => {
    state.getGameRoom().send(ThrowDice, {userId: state.getUserId()});
    state.setHaveThrowDice(true);
  });
  $('.gameToolBox .toolBox #skipTurn').on('click', ev => {
    state.getGameRoom().send(UserSkipTurn, {userId: state.getUserId()});
    state.setHaveThrowDice(false);
  });
  $('.gameToolBox .toolBox #spawnNewPiece').on('click', ev => {
    const listPieceAvailable = state.getGamePiece(state.getUserId()).filter(x => x.atBase === true);
    if (listPieceAvailable.length > 0) {
      state.getGameRoom().send(SyncPieceState, {
        step: 1,
        userId: listPieceAvailable[0].userId,
        order: listPieceAvailable[0].order,
      });
    }
  });
  $('.gameToolBox .toolBox #goOldPiece').on('click', ev => {
    const listPieceAvailable = state.getGamePiece(state.getUserId()).filter(x => x.atBase === false);
    if (listPieceAvailable.length > 0) {

      state.getGameRoom().send(SyncPieceState, {
        step: state.getPointDice1() + state.getPointDice2(),
        userId: listPieceAvailable[0].userId,
        order: listPieceAvailable[0].order,
      });
    }
  });
};

const displayDots = (num: number, jqueryComponent) => {
  let cls = 'odd-'
  if (num % 2 === 0) {
    cls = 'even-'
  }

  $(jqueryComponent).empty();
  for (let i = 1; i <= num; i++) {
    $(jqueryComponent).append('<div class="dot ' + cls + i + '"></div>');
  }
}

export const displayToolBoxOnState = () => {
  const dice1 = state.getPointDice1();
  const dice2 = state.getPointDice2();

  displayDots(dice1, '#dice1');
  displayDots(dice2, '#dice2');

  if (!state.getEnableToolBox() || state.getCurrentTurn() !== state.getUserId()) {
    $('.gameToolBox .toolBox #throwDice').prop('disabled', true);
    $('.gameToolBox .toolBox #skipTurn').prop('disabled', true);
    $('.gameToolBox .toolBox #goOldPiece').prop('disabled', true);
    $('.gameToolBox .toolBox #spawnNewPiece').prop('disabled', true);
  } else {
    if (!state.getHaveThrowDice())
      $('.gameToolBox .toolBox #throwDice').prop('disabled', false);
    else $('.gameToolBox .toolBox #throwDice').prop('disabled', true);

    if (!state.getCanSpawn())
      $('.gameToolBox .toolBox #spawnNewPiece').prop('disabled', true);
    else $('.gameToolBox .toolBox #spawnNewPiece').prop('disabled', false);

    if (!state.getCanGoNext())
      $('.gameToolBox .toolBox #goOldPiece').prop('disabled', true);
    else $('.gameToolBox .toolBox #goOldPiece').prop('disabled', false);
  }
}
displayToolBoxOnState();

const calculateUserHandling = () => {
  if (state.getCurrentTurn() === state.getUserId()) {
    state.setEnableToolBox(true);

    (function specifyCanSpawn() {
      state.setCanSpawn(false);
      let dicePointCanSpawn = false;

      if (state.getPointDice1() === state.getPointDice2()) {
        if (state.getPointDice1() === 1 || state.getPointDice1() === 6) {
          dicePointCanSpawn = true;
        }
      }
      const piecesAtStart = state.getGamePiece(state.getUserId())
        .filter(x => x.getPosType() === 'start');
      const piecesAtCommonOrFinal = state.getGamePiece(state.getUserId())
        .filter(x => x.getPosType() === 'common' 
          || x.getPosType() === 'final');
      
      if (dicePointCanSpawn && piecesAtStart.length <= 0 
        && piecesAtCommonOrFinal.length < 4) {
          state.setCanSpawn(true);
        }
    })();
    
    (function specifyCanGoNext() {
      state.setCanGoNext(false);

      const step = state.getPointDice1() + state.getPointDice2();
      
      const piecesAtStart = state.getGamePiece(state.getUserId())
        .filter(x => x.getPosType() === 'start');
      const piecesAtCommonOrFinal = state.getGamePiece(state.getUserId())
        .filter(x => x.getPosType() === 'common' 
          || x.getPosType() === 'final');
      
      if (!(piecesAtStart.length <= 0 && piecesAtCommonOrFinal.length <= 0)) {
        let pieceArr = state.getGamePiece(state.getUserId());

        for (let i = 0; i < pieceArr.length; i++) {
          if (pieceArr[i].goByStep(step, false)) {
            pieceArr[i].setMode('select');
          }
        }
      }
    })();
  } else {
    state.setEnableToolBox(false);
  }
}

const setUserStatus = (val: IUser) => {
  const elementSelectString = `#${val.id} .user-list-favourite-time`;
  $(elementSelectString).empty();

  const user = <IUser>state.searchUserInRoom(val.id);
  user.isReady = val.isReady;

  if (user.isReady) {
    $(elementSelectString).append(
      $(`
        <a class="user-list-favourite order-2 text-success" href="#"><i class="fas fa-check-circle"></i></a>
        <span class="user-list-time order-1">Ready</span>
      `));
  } else {
    $(elementSelectString).append(
      $(`
        <a class="user-list-favourite order-2 text-info" href="#"><i class="fas fa-clock"></i></a>
        <span class="user-list-time order-1">Waiting...</span>
      `));
  }
}

const setUserTurnIcon = (userId: string) =>  {
  const elementSelectString = `#${userId}`;

  $('.userInRoom .userInRoomList .users-list').removeClass('users-main');
  $(elementSelectString).addClass('users-main');
}

const showUserInfo = (ev: JQuery.ClickEvent, id: string, isModal: boolean = true) => {
  if (isModal) alert('fuck');
}

const showChatBot = (ev: JQuery.ClickEvent, id: string) => {

}

const handleUserReady = (mess: any) => {
  if (mess.user.id === state.getUserId())
    state.getGameplay().setCameraStopOrbitAuto(mess.camera);

  state.setUserCommonPath(mess.user.id, mess.commonPath.data);
  state.setUserFinalPath(mess.user.id, mess.finalPath.data);
  state.setUserPiece(mess.user.id, <IPiece[]>mess.pieces.data);

  // load piece to map
  state.getGameplay().addObject(
    state.getUserPiece(mess.user.id).map(x => {
      const piece = new Piece(
        x.color, x.order,
        {
          radiusTop: 0.08,
          radiusBottom: 0.7,
          radialSegments: 2,
          heightSegments: 50
        },
        Object.values(x.initPosition), 
        state.getGameplay().getWorld(),
        mess.user.id,
      );
      state.addGamePiece(mess.user.id, piece);
      return piece;
    })
  )
}

const handleUpdatePiece = (mess: any) => {
  const piece = <Piece>state.getGamePiece(mess.userId).find(x => x.order === mess.data.order);
  piece.targetPoint = mess.data.targetPoint;
  piece.stepCounter = mess.data.prevStep;
  piece.stepCursor = mess.data.nextStep;
  piece.goal = mess.data.goal;
  piece.isReturn = mess.data.isReturn;
  piece.atBase = mess.data.atBase;
}

const addUserToRoom = (mess: IUser) => {
  // state.addUserInRoom(mess);

  const element = $(`
    <tr class="users-list" id="${mess.id}">
      <td class="title">
        <div class="thumb">
          <img class="img-fluid" src="${mess.avatar}" alt="">
        </div>
        <div class="user-list-details">
          <div class="user-list-info">
            <div class="user-list-title">
              <h5 class="mb-0"><a class="showUserInfo" href="#">${mess.name} 
                ${mess.id === state.getUserId() ? "( YOU )" : ""}</a></h5>
            </div>
            <div class="user-list-option">
              <ul class="list-unstyled">
                <li><i class="fas fa-filter pr-1"></i>${mess.jobTitle}</li>
                <li><i class="fas fa-map-marker-alt pr-1"></i>${mess.address}</li>
              </ul>
            </div>
          </div>
        </div>
      </td>
      <td class="user-list-favourite-time text-center">
        
      </td>
      <td>
        <ul class="list-unstyled mb-0 d-flex justify-content-end">
          <li><a class="showUserInfo" class="text-primary" data-toggle="tooltip" title="" data-original-title="chat"><i class="far fa-eye"></i></a></li>
          <li><a class="showChatBox class="text-info" data-toggle="tooltip" title="" data-original-title="view"><i class="far fa-comment-dots"></i></a></li>
        </ul>
      </td>
    </tr>
  `)
  $('.userInRoom tbody').append(element);

  $(`.userInRoom tbody #${mess.id} .list-unstyled .showUserInfo`).on('click', ev => {
    ev.preventDefault();
    showUserInfo(ev, mess.id, true);
  });

  $(`.userInRoom tbody #${mess.id} .user-list-title .showUserInfo`).on('click', ev => {
    ev.preventDefault();
    showUserInfo(ev, mess.id, false);
  });

  $(`.userInRoom tbody #${mess.id} .showChatBox`).on('click', ev => {
    ev.preventDefault();
    showChatBot(ev, mess.id);
  });
}

const handleUserLeaveUI = (mess: IUser) => {
  $(`#${mess.id}`).remove();
}

$('#startGame').on('click', ev => {
  state.getGameRoom().send(UserReady, {userId: state.getUserId()})
})

// handle join room
$('.selectRoom form').on('submit', ev => {
  ev.preventDefault();

  const formValue = getFormSubmitValue('.selectRoom form');
  handleJoinRoom(state.getListRoom().find(x => x.roomId === formValue['choosenRoomId']));
  // console.log(ev);
});

// handle create room
$('#createRoom').on('click', ev => {
  ev.preventDefault();

  const roomAlias = window.prompt('Input Room Name', 'lets play');

  if (!roomAlias) {
    alert('you have to input roomName');
    return;
  }
  // console.log(roomAlias);

  state.getClient().create("gameplay", { roomAlias, userId: state.getUserId() })
    .then(room => {
      state.setCurrentRoomId(room.id);
      state.setGameRoom(room);

      initGameEvent();
      getRoom();
    })
})

const handleJoinRoom = (room: IRoomClient) => {
  if (!room) {
    alert('room is not available');
    return;
  }
  state.setCurrentRoomId(room.roomId);
  state.getClient().joinById(room.roomId, { userId: state.getUserId() })
    .then(room => {
      state.setGameRoom(room);

      initGameEvent();
    })
    .catch(_ => {
      // console.log(message);
    })
}

const displayListRoom = (arr: IRoomClient[]) => {
  $('.selectRoom form .formBody').empty();

  for (const room of arr.reverse()) {
    const element = $(`
      <div class="form-check">
        <input class="form-check-input" type="radio" name="choosenRoomId" value="${room.roomId}" id="${uuidv4()}" 
          ${arr.findIndex(x => x === room) === 0 ? "checked" : ""}>
        <label class="form-check-label" for="${uuidv4()}">
          ${`${room.roomAlias} (${room.roomId})`}
        </label>
      </div>`);

    $('.selectRoom form .formBody').append(element);
  }
}

const getRoom = (callBack?: any) => {
  state.getClient().getAvailableRooms("gameplay")
    .then((x) => {
      if (x.length > 0) {
        state.setListRoom(x.map(x1 => {
          return {
            roomId: x1.roomId,
            roomAlias: x1.metadata.roomAlias
          }
        }));
        displayListRoom(state.getListRoom());
      } else {
        $('.selectRoom form .formBody').append(
          $(`<div style="margin-top: 10px;">There is currently no room available</div>`),
          $(`<div style="margin-bottom: 50px;">Create new room or refresh your browser</div>`)
        );
      }
      if (callBack) callBack()
    })
    .catch(er => {
      $('.selectRoom form .formBody').append(
        $(`<div style="margin-top: 10px;">Cannot connect to server</div>`),
        $(`<div style="margin-bottom: 50px;">Please try again later</div>`)
      );
    })
}
getRoom();