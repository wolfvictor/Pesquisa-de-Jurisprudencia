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

class optionsHelper {
  static async isModeChangeAllowed() {
    let chromeStorageData = await chrome.storage.local.get(['onWait', 'onExecution']);
    return !chromeStorageData.onWait && !chromeStorageData.onExecution;
  }
  
  static async setWaitingScreen() {
    divOptions.setAttribute("hidden", true);
    waitMessage.innerHTML = "Espere a execução terminar para modificar as opções.";
    divWait.removeAttribute("hidden");

    let chromeStorageData = await chrome.storage.local.get(['onWait', 'onExecution', 'waitEndTime']);

    if (chromeStorageData.onExecution) {
      waitMessage.innerHTML = "Espere a execução terminar para modificar as opções.";
    } else if (chromeStorageData.onWait){
      waitMessage.innerHTML = `Espere mais ${(chromeStorageData.waitEndTime - Date.now())/1000} segundos terminar para modificar as opções.`;
    } else {
      console.log('Something went wrong.');
    }
  }

  static checkTheBoxWhenOptionIsEnabled(condition) {
    if (condition) {
      slowModeCheckboxInput.checked = true;
    } else {
      slowModeCheckboxInput.checked = false;
    }
  }

  static async UpdateScreen() {
    let modeChangeAllowed = await optionsHelper.isModeChangeAllowed();
    if (modeChangeAllowed) {
      let chromeStorageData = await chrome.storage.local.get('slowMode');
      optionsHelper.checkTheBoxWhenOptionIsEnabled(chromeStorageData.slowMode);
    } else {
      optionsHelper.setWaitingScreen();
    }
  }

  static async toggleSlowMode() {
    let chromeStorageData = await chrome.storage.local.get('slowMode');

    chrome.storage.local.set({ slowMode: !chromeStorageData.slowMode }, () => {
      console.log('Mode toggled to ' + !chromeStorageData.slowMode);
    });
    
    optionsHelper.UpdateScreen;
  }

}