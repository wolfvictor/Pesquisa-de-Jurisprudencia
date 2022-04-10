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

class tabHelper {
  static setLoadingScreen(displayMessage) {
    divWait.setAttribute("hidden", true);
    divSearchTarget.setAttribute("hidden", true);

    for (let element of searchElements) {
      element.setAttribute("hidden", true);
    }

    divLoading.removeAttribute("hidden");

    if (displayMessage) {
      loadingCaption.innerHTML = displayMessage;
    } else {
      loadingCaption.innerHTML = "Carregando...";
    }
  }

  static setLoadingScreenForSlowMode() {
    divWait.setAttribute("hidden", true);
    divSearchTarget.setAttribute("hidden", true);

    for (let element of searchElements) {
      element.setAttribute("hidden", true);
    }

    divLoading.removeAttribute("hidden");
    loadingCaption.innerHTML = "Carregando... espera de até 60 segundos para a próxima batelada (modo lento ativado).";
  }

  static setWaitingScreen(waitingMessage) {
    divSearchTarget.setAttribute("hidden", true);
    
    for (let element of searchElements) {
      element.setAttribute("hidden", true);
    }
    
    divLoading.setAttribute("hidden", true);
    divWait.removeAttribute("hidden");

    if (waitingMessage) {
      waitMessage.innerHTML = waitingMessage;
    } else {
      waitMessage.innerHTML = `Espere um pouco antes de pesquisar novamente.`;
    }
  }

  static setWaitingScreenWithWaitTime(waitTimeInSeconds) {
    chrome.storage.local.get('waitEndTime', (chromeStorageData) => {
      divSearchTarget.setAttribute("hidden", true);
      
      for (let element of searchElements) {
        element.setAttribute("hidden", true);
      }
  
      divLoading.setAttribute("hidden", true);

      if (waitTimeInSeconds) {
        waitMessage.innerHTML = `Espere um pouco antes de pesquisar novamente. Restam ${waitTimeInSeconds} segundos.`;
      } else {
        waitMessage.innerHTML = `Espere um pouco antes de pesquisar novamente. Restam ${(chromeStorageData.waitEndTime - Date.now())/1000} segundos.`;
      }
      divWait.removeAttribute("hidden");
    });
  }

  static setWaitingScreenWithWaitTimeAndMessage(waitTimeInSeconds, message) {
    chrome.storage.local.get('waitEndTime', (chromeStorageData) => {
      divSearchTarget.setAttribute("hidden", true);
      
      for (let element of searchElements) {
        element.setAttribute("hidden", true);
      }
  
      divLoading.setAttribute("hidden", true);

      if (waitTimeInSeconds) {
        waitMessage.innerHTML = `${message} Espere um pouco antes de pesquisar novamente. Restam ${waitTimeInSeconds} segundos.`;
      } else {
        waitMessage.innerHTML = `${message} Espere um pouco antes de pesquisar novamente. Restam ${(chromeStorageData.waitEndTime - Date.now())/1000} segundos.`;
      }
      divWait.removeAttribute("hidden");
    });
  }

  static setSearchScreenWithoutWarning() {
    divWait.setAttribute("hidden", true);
    divLoading.setAttribute("hidden", true);
    divSearchTarget.removeAttribute("hidden");

    for (let element of searchElements) {
      element.removeAttribute("hidden");
    }

    searchWarning.innerText = "";
    searchWarning.setAttribute("hidden", true);
  }

  static setSearchScreenWithWarning(warningText) {
    divWait.setAttribute("hidden", true);
    divLoading.setAttribute("hidden", true);
    divSearchTarget.removeAttribute("hidden");
    
    for (let element of searchElements) {
      element.removeAttribute("hidden");
    }
    
    searchWarning.innerText = warningText;
    searchWarning.removeAttribute("hidden");
  }

  static setCorrectScreen() {
    chrome.storage.local.get('onExecution', (chromeStorageData) => {
      if (chromeStorageData.onExecution) {
        searchController.cleanForNextRun();
        searchController.setWaitForNextRun('Execução interrompida.');
      }
      else {
        chrome.storage.local.get('onWait', (chromeStorageData) => {
          if (chromeStorageData.onWait) {
            // Bug fix #2: resets wait mode if it was not correctly reset
            chrome.storage.local.get('waitEndTime', (chromeStorageData) => {
              if (chromeStorageData.waitEndTime > Date.now()) {
                tabHelper.setWaitingScreenWithWaitTime();
              } else {
                console.log(`Resetting onWait because it was incorrectly set. Date Wait Mode ended: ${chromeStorageData.waitEndTime}. Date Now: ${Date.now()}.`);
                chrome.storage.local.set({onWait: false}); 
              }
            });
          }
          else {
            tabHelper.setSearchScreenWithoutWarning();
          }
        });        
      }
    });
  }
}