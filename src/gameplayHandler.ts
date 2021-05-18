import * as Colyseus from "colyseus.js";
import MainGame from "./main";
import $ from 'jquery';
import { uuidv4 } from "./utils";

// <div class="form-check">
//   <input class="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1">
//   <label class="form-check-label" for="flexRadioDefault1">
//     Default radio
//   </label>
// </div>

interface IRoomClient {
  roomId: string;
  roomAlias: string;
}

export const client = new Colyseus.Client("ws://localhost:2567");
export let gameRoom: Colyseus.Room = null;

export const StartGame = "StartGame";

export const gameplay = new MainGame();
export let listRoom: IRoomClient[] = [];

const getFormSubmitValue = (jquerySelectString: string) => {
  let values = {};
  $.each($(jquerySelectString).serializeArray(), function(i, field) {
    values[field.name] = field.value;
  });
  return values;
}

// handle join room
$('.selectRoom form').on('submit', ev => {
  ev.preventDefault();

  const formValue = getFormSubmitValue('.selectRoom form');

  joinRoom(listRoom.find(x => x.roomId === formValue['choosenRoomId']));
  // console.log('what the fuck')
  // console.log(ev);
})

// handle create room
$('#createroom').on('click', ev => {
  ev.preventDefault();

  const roomAlias = window.prompt('Input Room Name', 'lets play');

  if (!roomAlias) {
    alert('you have to input roomName');
    return;
  }
  // console.log(roomAlias);

  client.create("gameplay", {roomAlias})
    .then(room => {
      console.log(room);

      getRoom(() => {
        joinRoom(listRoom.find(x => x.roomId === room.id));
      })
    })
})

const joinRoom = (room: IRoomClient) => {
  if (!room) {
    alert('room is not available');
    return;
  }
  $('.selectRoom').hide();
  gameplay.initGameplay();
}

// handle load room id
const loadRoomId = (arr: IRoomClient[]) => {
  $('.selectRoom form .formbody').empty();
  
  for (const room of arr.reverse()) {
    const element = $(`
      <div class="form-check">
      <input class="form-check-input" type="radio" name="choosenRoomId" value="${room.roomId}" id="${uuidv4()}" 
        ${arr.findIndex(x => x === room) === 0 ? "checked" : ""}>
      <label class="form-check-label" for="${uuidv4()}">
        ${`${room.roomAlias} (${room.roomId})`}
      </label>
      </div>`);
    
    $('.selectRoom form .formbody').append(element);
  }
}   

const getRoom = (callBack?: any) => {
  client.getAvailableRooms("gameplay").then((x) => {
    if (x.length > 0) {
      listRoom = x.map(x1 => {
        return {
          roomId: x1.roomId,
          roomAlias: x1.metadata.roomAlias
        }
      });
      loadRoomId(listRoom);
      
      if (callBack) callBack()
    }
  });
}
getRoom();


// const joinOrCrerate = () => {
//   client
//     .joinOrCreate("gameplay")
//     .then((room) => {
//       gameRoom = room;

//       // gameplay.initGameplay();
//       console.log(room.sessionId, "joined", room.name);
//     })
//     .catch((e) => {
//       console.log("JOIN ERROR", e);
//     });
// }


