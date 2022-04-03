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

let divAcesso = document.getElementById('divAcesso');
let divEspera = document.getElementById('divEspera');
let divPesquisa = document.getElementById('divPesquisa');
let divLoading = document.getElementById('divLoading');
let divDone = document.getElementById('divDone');
let pesquisa = document.getElementById('pesquisa');
let errorMessage = document.getElementById('error');
let button = document.getElementById('enviar');
let loadingCaption = document.getElementById('loadingCaption');

/**************
////CLASSES////
**************/

class popUpHelper {
  static setLoadingScreen() {
    divEspera.setAttribute("hidden", true);
    divAcesso.setAttribute("hidden", true);
    divPesquisa.setAttribute("hidden", true);
    divDone.setAttribute("hidden", true);
    divLoading.removeAttribute("hidden");
  }

  static setWaitingScreen() {
    divAcesso.setAttribute("hidden", true);
    divPesquisa.setAttribute("hidden", true);
    divDone.setAttribute("hidden", true);
    divLoading.setAttribute("hidden", true);
    divEspera.removeAttribute("hidden");
  }

  static setSearchScreen() {
    divEspera.setAttribute("hidden", true);
    divDone.setAttribute("hidden", true);
    divLoading.setAttribute("hidden", true);
    divAcesso.removeAttribute("hidden");
    divPesquisa.removeAttribute("hidden");
  }

  static setDoneScreen() {
    divEspera.setAttribute("hidden", true);
    divAcesso.setAttribute("hidden", true);
    divPesquisa.setAttribute("hidden", true);
    divLoading.setAttribute("hidden", true);
    divDone.removeAttribute("hidden");
  }

  static setWaitingScreenIfOnWait() {
    chrome.storage.sync.get('onWait', function(data) {
      if (data.onWait) {
        // Bug fix #2: resets wait mode if it was not correctly reset
        chrome.storage.sync.get('lastWaitEnd', function(data) {
          if (data.lastWaitEnd > Date.now()) {
            console.log(`Wait mode is active. Please wait until ${data.lastWaitEnd}. Date Now: ${Date.now()}.`);
            popUpHelper.setWaitingScreen();
          } else {
            console.log(`Resetting onWait because it was incorrectly set. Date Wait Mode ended: ${data.lastWaitEnd}. Date Now: ${Date.now()}.`);
            chrome.storage.sync.set({onWait: false}, function() {}); 
          }
        });
      }
    });
  }

  static setLoadingScreenIfOnExecution() {
    chrome.storage.sync.get('onExecution', function(data) {
      if (data.onExecution) {
        popUpHelper.setLoadingScreen();
      }
    });        
  }
}

/***********
////MAIN////
***********/

// When button is pressed, send the search query to the background script
button.onclick = function (element) {
  if (pesquisa.value) {
    chrome.runtime.sendMessage('Search:' + pesquisa.value);
    popUpHelper.setLoadingScreen();
  } else {
    errorMessage.removeAttribute("hidden");
  }
};

// Enter on search field should also act as if button has been pressed
pesquisa.addEventListener("keyup", function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    button.click();
  }
});

// Display messages to the user according to the current background step
chrome.runtime.onMessage.addListener(function(msg) {
  if (msg.match('Display:A pesquisa não retornou resultados.')) {
    loadingCaption.innerHTML = msg.replace(/Display:/,'');
    setTimeout(() => {
      popUpHelper.setSearchScreen();
    }, 3000);
  } else if (msg.match(/Display:/)) {
    popUpHelper.setLoadingScreen();
    loadingCaption.innerHTML = msg.replace(/Display:/,'');
  } else if (msg == 'Done') {
    popUpHelper.setDoneScreen();
  } else if (msg == 'Waiting') {
    popUpHelper.setWaitingScreen();
  } else if (msg == 'WaitComplete') {
    pesquisa.value = '';
    popUpHelper.setSearchScreen();
  }
});

popUpHelper.setWaitingScreenIfOnWait()
popUpHelper.setLoadingScreenIfOnExecution()

// Focus on the search field as soon as the user opens the popup page
pesquisa.focus();