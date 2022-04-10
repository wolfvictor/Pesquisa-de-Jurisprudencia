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

Copyright 2022 Victor Wolf
*****************************************************************************************/

'use strict';

/****************
////VARIABLES////
****************/

let divOptions = document.getElementById('divOptions');
let divWait = document.getElementById('divWait');
let slowModeCheckboxInput = document.getElementById('slowModeCheckboxInput');
let waitMessage = document.getElementById('waitMessage');

/***********
////MAIN////
***********/

// Sets actions to follow a checkbox click
slowModeCheckboxInput.onclick = async () => {
  let modeChangeAllowed = await optionsHelper.isModeChangeAllowed();
  if (modeChangeAllowed) {
    optionsHelper.toggleSlowMode();
  } else {
    optionsHelper.setWaitingScreen();
  }
}

// Changes the screen depending on the message received
chrome.runtime.onMessage.addListener((msg) => {
  if (msg == 'Executing') {
    divOptions.setAttribute("hidden", true);
    divWait.removeAttribute("hidden");
  } else if (msg == 'Waiting') {
    divOptions.setAttribute("hidden", true);
    divWait.removeAttribute("hidden");
  } else if (msg == 'WaitComplete') {
    divOptions.removeAttribute("hidden");
    divWait.setAttribute("hidden", true);
  }
});

// The screen must be updated upon refresh
optionsHelper.UpdateScreen();