import './style.css'

import $ from 'jquery';
import { Subscription, interval } from 'rxjs';
import { TwistyPlayer } from 'cubing/twisty';
import { experimentalSolve3x3x3IgnoringCenters } from 'cubing/search';
import { invoke } from '@tauri-apps/api/core';

import * as THREE from 'three';

import {
  now,
  connectGanCube,
  GanCubeConnection,
  GanCubeEvent,
  GanCubeMove,
  MacAddressProvider,
  makeTimeFromTimestamp,
  cubeTimestampCalcSkew,
  cubeTimestampLinearFit
} from './lib';

import { faceletsToPattern, patternToFacelets } from './utils';

// Define the structure of scanned devices returned from Rust
interface ScannedDevice {
  name: string | null;
  address: string;
  signal_strength: number | null;
}

// Store the selected device globally
let selectedDevice: ScannedDevice | null = null;

const SOLVED_STATE = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

var twistyPlayer = new TwistyPlayer({
  puzzle: '3x3x3',
  visualization: 'PG3D',
  alg: '',
  experimentalSetupAnchor: 'start',
  background: 'none',
  controlPanel: 'none',
  hintFacelets: 'none',
  experimentalDragInput: 'none',
  cameraLatitude: 0,
  cameraLongitude: 0,
  cameraLatitudeLimit: 0,
  tempoScale: 5
});

$('#cube').append(twistyPlayer);

var conn: GanCubeConnection | null;
var lastMoves: GanCubeMove[] = [];
var solutionMoves: GanCubeMove[] = [];

var twistyScene: THREE.Scene;
var twistyVantage: any;

const HOME_ORIENTATION = new THREE.Quaternion().setFromEuler(new THREE.Euler(15 * Math.PI / 180, -20 * Math.PI / 180, 0));
var cubeQuaternion: THREE.Quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(30 * Math.PI / 180, -30 * Math.PI / 180, 0));

async function amimateCubeOrientation() {
  if (!twistyScene || !twistyVantage) {
    var vantageList = await twistyPlayer.experimentalCurrentVantages();
    twistyVantage = [...vantageList][0];
    twistyScene = await twistyVantage.scene.scene();
  }
  twistyScene.quaternion.slerp(cubeQuaternion, 0.5);
  twistyVantage.render();
  requestAnimationFrame(amimateCubeOrientation);
}
requestAnimationFrame(amimateCubeOrientation);

var basis: THREE.Quaternion | null;

async function handleGyroEvent(event: GanCubeEvent) {
  if (event.type == "GYRO") {
    let { x: qx, y: qy, z: qz, w: qw } = event.quaternion;
    let quat = new THREE.Quaternion(qx, qz, -qy, qw).normalize();
    if (!basis) {
      basis = quat.clone().conjugate();
    }
    cubeQuaternion.copy(quat.premultiply(basis).premultiply(HOME_ORIENTATION));
    $('#quaternion').val(`x: ${qx.toFixed(3)}, y: ${qy.toFixed(3)}, z: ${qz.toFixed(3)}, w: ${qw.toFixed(3)}`);
    if (event.velocity) {
      let { x: vx, y: vy, z: vz } = event.velocity;
      $('#velocity').val(`x: ${vx}, y: ${vy}, z: ${vz}`);
    }
  }
}

async function handleMoveEvent(event: GanCubeEvent) {
  if (event.type == "MOVE") {
    if (timerState == "READY") {
      setTimerState("RUNNING");
    }
    twistyPlayer.experimentalAddMove(event.move, { cancel: false });
    lastMoves.push(event);
    if (timerState == "RUNNING") {
      solutionMoves.push(event);
    }
    if (lastMoves.length > 256) {
      lastMoves = lastMoves.slice(-256);
    }
    if (lastMoves.length > 10) {
      var skew = cubeTimestampCalcSkew(lastMoves);
      $('#skew').val(skew + '%');
    }
  }
}

var cubeStateInitialized = false;

async function handleFaceletsEvent(event: GanCubeEvent) {
  if (event.type == "FACELETS" && !cubeStateInitialized) {
    if (event.facelets != SOLVED_STATE) {
      var kpattern = faceletsToPattern(event.facelets);
      var solution = await experimentalSolve3x3x3IgnoringCenters(kpattern);
      var scramble = solution.invert();
      twistyPlayer.alg = scramble;
    } else {
      twistyPlayer.alg = '';
    }
    cubeStateInitialized = true;
    console.log("Initial cube state is applied successfully", event.facelets);
  }
}

function handleCubeEvent(event: GanCubeEvent) {
  if (event.type != "GYRO")
    console.log("GanCubeEvent", event);
  if (event.type == "GYRO") {
    handleGyroEvent(event);
  } else if (event.type == "MOVE") {
    handleMoveEvent(event);
  } else if (event.type == "FACELETS") {
    handleFaceletsEvent(event);
  } else if (event.type == "HARDWARE") {
    $('#hardwareName').val(event.hardwareName || '- n/a -');
    $('#hardwareVersion').val(event.hardwareVersion || '- n/a -');
    $('#softwareVersion').val(event.softwareVersion || '- n/a -');
    $('#productDate').val(event.productDate || '- n/a -');
    $('#gyroSupported').val(event.gyroSupported ? "YES" : "NO");
  } else if (event.type == "BATTERY") {
    $('#batteryLevel').val(event.batteryLevel + '%');
  } else if (event.type == "DISCONNECT") {
    twistyPlayer.alg = '';
    $('.info input').val('- n/a -');
    $('#connect').html('Connect');
  }
}

const customMacAddressProvider: MacAddressProvider = async (device, isFallbackCall): Promise<string | null> => {
  // If we have a selected device from scanning, use its MAC address
  if (selectedDevice) {
    console.log('Using scanned device MAC:', selectedDevice.address);
    return selectedDevice.address;
  }
  
  if (isFallbackCall) {
    return prompt('Unable do determine cube MAC address!\nPlease enter MAC address manually:');
  } else {
    return typeof device.watchAdvertisements == 'function' ? null :
      prompt('Seems like your browser does not support Web Bluetooth watchAdvertisements() API. Enable following flag in Chrome:\n\nchrome://flags/#enable-experimental-web-platform-features\n\nor enter cube MAC address manually:');
  }
};

$('#reset-state').on('click', async () => {
  await conn?.sendCubeCommand({ type: "REQUEST_RESET" });
  twistyPlayer.alg = '';
  cubeStateInitialized = false;
});

$('#reset-gyro').on('click', async () => {
  basis = null;
});

// Scan for cubes using Rust btleplug
$('#scan').on('click', async () => {
  try {
    console.log('Starting cube scan...');
    $('#scan').html('Scanning...').prop('disabled', true);
    
    const devices: ScannedDevice[] = await invoke('scan_for_cubes');
    console.log('Scan results:', devices);
    
    if (devices.length === 0) {
      alert('No GAN cubes found. Make sure your cube is turned on and nearby.');
      $('#scan').html('Scan for Cubes').prop('disabled', false);
      return;
    }
    
    // Show device selection
    const deviceList = $('#device-list');
    deviceList.empty();
    
    devices.forEach(device => {
      const deviceButton = $(`
        <div class="device-option">
          <button class="device-button" data-address="${device.address}">
            <div class="device-name">${device.name || 'Unknown GAN Cube'}</div>
            <div class="device-address">${device.address}</div>
            <div class="device-signal">Signal: ${device.signal_strength || 'Unknown'} dBm</div>
          </button>
        </div>
      `);
      
      deviceButton.find('.device-button').on('click', async () => {
        selectedDevice = device;
        $('.device-button').removeClass('selected');
        deviceButton.find('.device-button').addClass('selected');
        console.log('Selected device:', device);
        
        // Automatically trigger connection when device is clicked
        try {
          deviceButton.find('.device-button').html('<div class="device-name">Connecting...</div>');
          
          if (conn) {
            conn.disconnect();
            conn = null;
          }
          
          conn = await connectGanCube(customMacAddressProvider);
          conn.events$.subscribe(handleCubeEvent);
          await conn.sendCubeCommand({ type: "REQUEST_HARDWARE" });
          await conn.sendCubeCommand({ type: "REQUEST_FACELETS" });
          await conn.sendCubeCommand({ type: "REQUEST_BATTERY" });
          $('#deviceName').val(conn.deviceName);
          $('#deviceMAC').val(conn.deviceMAC);
          $('#disconnect').show();
          $('#scan').hide();
          
          // Hide device selection after successful connection
          $('#device-selection').hide();
          
          console.log('Connected successfully!');
        } catch (error) {
          console.error('Failed to connect to cube:', error);
          alert('Failed to connect to cube. Make sure your cube is nearby and try again.');
          deviceButton.find('.device-button').html(`
            <div class="device-name">${device.name || 'Unknown GAN Cube'}</div>
            <div class="device-address">${device.address}</div>
            <div class="device-signal">Signal: ${device.signal_strength || 'Unknown'} dBm</div>
          `);
        }
      });
      
      deviceList.append(deviceButton);
    });
    
    $('#device-selection').show();
    $('#scan').html('Scan for Cubes').prop('disabled', false);
    
  } catch (error) {
    console.error('Scan failed:', error);
    alert('Failed to scan for cubes: ' + error);
    $('#scan').html('Scan for Cubes').prop('disabled', false);
  }
});

$('#disconnect').on('click', async () => {
  if (conn) {
    conn.disconnect();
    conn = null;
    selectedDevice = null;
    $('.info input').val('- n/a -');
    $('#disconnect').hide();
    $('#scan').show();
    console.log('Disconnected from cube');
  }
});

var timerState: "IDLE" | "READY" | "RUNNING" | "STOPPED" = "IDLE";

function setTimerState(state: typeof timerState) {
  timerState = state;
  switch (state) {
    case "IDLE":
      stopLocalTimer();
      $('#timer').hide();
      break;
    case 'READY':
      setTimerValue(0);
      $('#timer').show();
      $('#timer').css('color', '#0f0');
      break;
    case 'RUNNING':
      solutionMoves = [];
      startLocalTimer();
      $('#timer').css('color', '#999');
      break;
    case 'STOPPED':
      stopLocalTimer();
      $('#timer').css('color', '#fff');
      var fittedMoves = cubeTimestampLinearFit(solutionMoves);
      var lastMove = fittedMoves.slice(-1).pop();
      setTimerValue(lastMove ? lastMove.cubeTimestamp! : 0);
      break;
  }
}

twistyPlayer.experimentalModel.currentPattern.addFreshListener(async (kpattern) => {
  var facelets = patternToFacelets(kpattern);
  if (facelets == SOLVED_STATE) {
    if (timerState == "RUNNING") {
      setTimerState("STOPPED");
    }
    twistyPlayer.alg = '';
  }
});

function setTimerValue(timestamp: number) {
  let t = makeTimeFromTimestamp(timestamp);
  $('#timer').html(`${t.minutes}:${t.seconds.toString(10).padStart(2, '0')}.${t.milliseconds.toString(10).padStart(3, '0')}`);
}

var localTimer: Subscription | null = null;
function startLocalTimer() {
  var startTime = now();
  localTimer = interval(30).subscribe(() => {
    setTimerValue(now() - startTime);
  });
}

function stopLocalTimer() {
  localTimer?.unsubscribe();
  localTimer = null;
}

function activateTimer() {
  if (timerState == "IDLE" && conn) {
    setTimerState("READY");
  } else {
    setTimerState("IDLE");
  }
}

$(document).on('keydown', (event) => {
  if (event.which == 32) {
    event.preventDefault();
    activateTimer();
  }
});

$("#cube").on('touchstart', () => {
  activateTimer();
});
