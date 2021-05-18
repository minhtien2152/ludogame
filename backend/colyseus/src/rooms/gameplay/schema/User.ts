import { GameRoom } from './GameRoom';
import { Camera } from './Camera';
import { Dice } from './Dice';
import { Vec3 } from './Vec3';
import { Schema, Context, type } from "@colyseus/schema";
import * as fk from "faker";

// 4 slot on each gameplay
export class User extends Schema {

  @type('string')
  id: string;

  @type('boolean')
  isReady;

  @type('string')
  name;

  @type('string')
  jobTitle;

  @type('string')
  address;

  @type('string')
  avatar;

  // init gameState
  // set exact value
  constructor(id: string, play: boolean) {
    super();

    this.id = id;
    this.isReady = play;
    this.name = fk.internet.userName();
    this.avatar = fk.internet.avatar(); 
    this.jobTitle = fk.name.jobTitle()
    this.address = fk.address;
  }
}
