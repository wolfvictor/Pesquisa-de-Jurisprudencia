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

let divSearchTarget = document.getElementById('divSearchTarget');
let divWait = document.getElementById('divWait');
let waitMessage = document.getElementById('waitMessage');
let divSearch = document.getElementById('divSearch');
let divLoading = document.getElementById('divLoading');
let searchQueryInput = document.getElementById('searchQueryInput');
let searchWarning = document.getElementById('searchWarning');
let errorMessage = document.getElementById('errorMessage');
let downloadButton = document.getElementById('downloadButton');
let loadingCaption = document.getElementById('loadingCaption');

/**************
////CLASSES////
**************/

class popUpHelper {
  static setLoadingScreen() {
    divWait.setAttribute("hidden", true);
    divSearchTarget.setAttribute("hidden", true);
    divSearch.setAttribute("hidden", true);
    divLoading.removeAttribute("hidden");
    loadingCaption.innerHTML = "Carregando...";
  }

  static setLoadingScreenForSlowMode() {
    divWait.setAttribute("hidden", true);
    divSearchTarget.setAttribute("hidden", true);
    divSearch.setAttribute("hidden", true);
    divLoading.removeAttribute("hidden");
    loadingCaption.innerHTML = "Carregando... espera de até 60 segundos para a próxima batelada (modo lento ativado).";
  }

  static setWaitingScreen() {
    divSearchTarget.setAttribute("hidden", true);
    divSearch.setAttribute("hidden", true);
    divLoading.setAttribute("hidden", true);
    divWait.removeAttribute("hidden");
    popUpHelper.setWaitingScreenWithWaitTime();
  }

  static setWaitingScreenWithWaitTime() {
    chrome.storage.local.get('lastWaitEnd', (data) => {
      divSearchTarget.setAttribute("hidden", true);
      divSearch.setAttribute("hidden", true);
      divLoading.setAttribute("hidden", true);
      waitMessage.innerHTML = `Pronto! Espere um pouco antes de pesquisar novamente. Restam ${(data.lastWaitEnd - Date.now())/1000} segundos.`;
      divWait.removeAttribute("hidden");
    });
  }

  static setSearchScreenWithoutWarning() {
    divWait.setAttribute("hidden", true);
    divLoading.setAttribute("hidden", true);
    divSearchTarget.removeAttribute("hidden");
    divSearch.removeAttribute("hidden");
    searchWarning.innerText = "";
    searchWarning.setAttribute("hidden", true);
  }

  static setSearchScreenWithWarning(warningText) {
    divWait.setAttribute("hidden", true);
    divLoading.setAttribute("hidden", true);
    divSearchTarget.removeAttribute("hidden");
    divSearch.removeAttribute("hidden");
    searchWarning.innerText = warningText;
    searchWarning.removeAttribute("hidden");
  }

  static setWaitingScreenIfOnWait() {
    chrome.storage.local.get('onWait', (data) => {
      if (data.onWait) {
        // Bug fix #2: resets wait mode if it was not correctly reset
        chrome.storage.local.get('lastWaitEnd', (data) => {
          if (data.lastWaitEnd > Date.now()) {
            console.log(`Wait mode is active. Please wait until ${data.lastWaitEnd}. Date Now: ${Date.now()}.`);
            popUpHelper.setWaitingScreen();
          } else {
            console.log(`Resetting onWait because it was incorrectly set. Date Wait Mode ended: ${data.lastWaitEnd}. Date Now: ${Date.now()}.`);
            chrome.storage.local.set({onWait: false}); 
          }
        });
      }
    });
  }

  static setLoadingScreenIfOnExecution() {
    chrome.storage.local.get('onExecution', (data) => {
      if (data.onExecution) {
        chrome.storage.local.get('slowMode', (data) => {
          if (data.slowMode) {
                popUpHelper.setLoadingScreenForSlowMode();
          }
          else {
            popUpHelper.setLoadingScreen();
          }
        });    
      }
    });
  }
}

/***********
////MAIN////
***********/

// When button is pressed, send the search query to the background script
downloadButton.onclick = () => {
  if (searchQueryInput.value) {
    chrome.runtime.sendMessage('Search:' + searchQueryInput.value);
    popUpHelper.setLoadingScreen();
  } else {
    errorMessage.removeAttribute("hidden");
  }
};

// Enter on search field should also act as if button has been pressed
searchQueryInput.addEventListener("keyup", (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    downloadButton.click();
  }
});

// Display messages to the user according to the current background step
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.match('Display:A pesquisa não retornou resultados.')) {
    popUpHelper.setSearchScreenWithWarning(msg.replace(/Display:/,''));
  } 
  else if (msg.match(/Display:/)) {
    popUpHelper.setLoadingScreen();
    loadingCaption.innerHTML = msg.replace(/Display:/,'');
  } 
  else if (msg == 'Waiting') {
    popUpHelper.setWaitingScreen();
  } 
  else if (msg == 'WaitComplete') {
    searchQueryInput.value = '';
    popUpHelper.setSearchScreenWithoutWarning();
  }
});

popUpHelper.setWaitingScreenIfOnWait()
popUpHelper.setLoadingScreenIfOnExecution()

// Focus on the search field as soon as the user opens the popup page
searchQueryInput.focus();