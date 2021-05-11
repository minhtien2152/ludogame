// import Board from "./components/Board";
// import Piece from "./components/Piece";
// import Dice from "./components/Dice";
import * as Colyseus from "colyseus.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import * as THREE from 'three';
import Board from "./components/Board";

let client = new Colyseus.Client('ws://localhost:2567');

export let globalState = {
  sayHi: '',
}

// client.joinOrCreate("main_game").then(room => {
//   // client.send("powerup", { kind: "ammo" });
//   console.log('==== client ====')
//   console.log(client);
//   room.onStateChange((state) => {
//     console.log(state)
//   })
//   console.log(room.sessionId, "joined", room.name);
// }).catch(e => {
//   console.log("JOIN ERROR", e);
// });

const data = [
  [-5.439477664422223, 1.199988980367679, -5.308972802276404],
  [-5.393146085870269, 1.1999890702525435, -7.71029413378612],
  [-7.779093281241222, 1.1999884336587399, -7.6962970855280775],
  [-7.735512466757786, 1.199988657083725, -5.359430200465674],
];

const colors = ["#8aacae", "#b4cb5f", "#ca5452", "#d7c944"];

export default async function Main() {

  // setup renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );

  document.body.appendChild( renderer.domElement );

  // camera + scene
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.fromArray([0, 0, 0]);
  // camera.position.fromArray([camVal, 0, 5]);

  const ambinentLight = new THREE.AmbientLight(); // soft white light
  ambinentLight.intensity = 0.5;

  const spotLight = new THREE.PointLight();
  spotLight.intensity = 1;
  spotLight.position.set( 10, -25, -10 );

  // const sky = new THREE.Sky

  scene.add( ambinentLight, spotLight );
  const board = new Board();
  scene.add( await board.getMesh() );

  const controls = new OrbitControls( camera, renderer.domElement );
  controls.update();
  
  // console.log(gr);

  // update function
  function update() {

  }

  // render function
  function render() {
    requestAnimationFrame( render );
    
    // update code

    controls.update();

    // end update
    
    renderer.render( scene, camera );
  }

  render();
};  

Main();