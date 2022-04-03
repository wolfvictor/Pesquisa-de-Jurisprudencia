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
let divEspera = document.getElementById('divEspera');
let checkboxInput = document.getElementById('checkboxInput');

/**************
////CLASSES////
**************/

class optionsHelper {
  static isModeChangeAllowed(callback) {
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

  static getMode(callback) {
    chrome.storage.sync.get('slowMode', data => callback(data.slowMode));
  }
  
  static setWaitingScreenIfChangeNotAllowed(condition) {
    if (!condition) {
      divOptions.setAttribute("hidden", true);
      divEspera.removeAttribute("hidden");
    }
  }

  static checkTheBoxWhenOptionIsEnabled(condition) {
    if (condition) {
      checkboxInput.checked = true;
    } else {
      checkboxInput.checked = false;
    }
  }

  static UpdateScreen() {
    optionsHelper.isModeChangeAllowed(optionsHelper.setWaitingScreenIfChangeNotAllowed);
    optionsHelper.getMode(optionsHelper.checkTheBoxWhenOptionIsEnabled);
  }

  static setModeIfTrue(condition) {
    if (condition) {
      optionsHelper.getMode(optionsHelper.toggleMode);
    }
  }

  static toggleMode(condition) {
    if (condition) {
      chrome.storage.sync.set({ slowMode: false }, optionsHelper.UpdateScreen);
    } else {
      chrome.storage.sync.set({ slowMode: true }, optionsHelper.UpdateScreen);
    }
    console.log('Mode toggled to ' + !condition);
  }

}

/***********
////MAIN////
***********/

// Sets actions to follow a checkbox click
checkboxInput.onclick = function() {
  optionsHelper.isModeChangeAllowed(optionsHelper.setModeIfTrue);  
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

// The screen must be updated upon refresh
optionsHelper.UpdateScreen();