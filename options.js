/*****************************************************************************************
This file is part of "Pesquisa de Jurisprudência".

"Pesquisa de Jurisprudência" is free software: you can redistribute it and/or 
modify it under the terms of the GNU General Public License as published by the 
Free Software Foundation, either version 3 of the License, or any later version.

"Pesquisa de Jurisprudência" is distributed in the hope that it will be useful, 
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or 
FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with 
"Pesquisa de Jurisprudência".  If not, see <https://www.gnu.org/licenses/>.

Copyright 2020 Victor Wolf
*****************************************************************************************/

'use strict';

/****************
////VARIABLES////
****************/

let divOptions = document.getElementById('divOptions');
let divEspera = document.getElementById('divEspera');
let checkboxInput = document.getElementById('checkboxInput');

/****************
////FUNCTIONS////
****************/

// During execution and wait, mode cannot be changed. Passes argument true or false to the callback
function isModeChangeAllowed(callback) {
  chrome.storage.sync.get('onExecution', execution => {
    chrome.storage.sync.get('onWait', wait => {
      if (!wait.onWait && !execution.onExecution) {
        callback(true);
      } else {
        callback(false);
      }
    });
  });
}

// Retrieve slowMode value from storage and passes it to callback
function getMode(callback) {
  chrome.storage.sync.get('slowMode', data => callback(data.slowMode));
}

// Self-explanatory
function setWaitingScreenIfChangeNotAllowed(condition) {
  if (!condition) {
    divOptions.setAttribute("hidden", true);
    divEspera.removeAttribute("hidden");
  }
}

// Decides to set the checkmark on the box depending on the argument
function checkTheBoxOrNot(condition) {
  if (condition) {
    checkboxInput.checked = true;
  } else {
    checkboxInput.checked = false;
  }
}

// Triggers the functions that will update the screen
function UpdateScreen() {
  isModeChangeAllowed(setWaitingScreenIfChangeNotAllowed);
  getMode(checkTheBoxOrNot);
}

// If execution and wait allow, this function will later toggle the mode
function setModeIfTrue(condition) {
  if (condition) {
    getMode(toggleMode);
  }
}

// Toggles the Mode: Updates the slowMode value (to be used when checkbox is clicked)
function toggleMode(condition) {
  if (condition) {
    chrome.storage.sync.set({ slowMode: false }, UpdateScreen);
  } else {
    chrome.storage.sync.set({ slowMode: true }, UpdateScreen);
  }
  console.log('Mode toggled to ' + !condition);
}

/***********
////MAIN////
***********/

// Screen must be updated upon refresh
UpdateScreen();

// Sets actions to follow a checkbox click
checkboxInput.onclick = function() {
  isModeChangeAllowed(setModeIfTrue);  
}

// Changes the screen depending on the message received
chrome.runtime.onMessage.addListener(function(msg) {
  if (msg == 'Executing') {
    divOptions.setAttribute("hidden", true);
    divEspera.removeAttribute("hidden");
  } else if (msg == 'Waiting') {
    divOptions.setAttribute("hidden", true);
    divEspera.removeAttribute("hidden");
  } else if (msg == 'WaitComplete') {
    divOptions.removeAttribute("hidden");
    divEspera.setAttribute("hidden", true);
  }
});