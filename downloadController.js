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

class downloadController {
  static sanitizeUserInput(userInput) {
    return userInput.replace(/[.*+!?^${}()|[\]\\"'#&%=:/<>;:,~`]/g,'');
  }

  static initiateDownloadIfReady() {    
    if (requestsParsed >= Math.min(maxPages,totalPages)) {
      if (errorCount) {
        console.log('Não foi possível obter ' + errorCount + ' das ' + Math.min(maxPages,totalPages) + ' páginas de resultados. O arquivo está incompleto.');
      }
      downloadController.downloadFile();
      tabHelper.setWaitingScreen('Pronto!');
      searchController.cleanForNextRun();
      searchController.setWaitForNextRun('Pronto!');
    }
    else {
      chrome.storage.local.get('slowMode', (chromeStorageData) => {
        if (chromeStorageData.slowMode && (requestsParsed % 50 == 0)) {
          tabHelper.setLoadingScreen("Aguarde um minuto para a próxima leva. O modo lento está ativado.");
        }
      })
    }
  }

  static downloadFile() {
    let csvFileURL = URL.createObjectURL(csvFileContents);
    var currentdate = new Date();
    var filename = currentdate.getFullYear() + '-' + ("0" + (currentdate.getMonth() + 1)).slice(-2) + '-' + ("0" + (currentdate.getDate())).slice(-2) + '-'
      + currentdate.getHours() + currentdate.getMinutes() + currentdate.getSeconds() + ('' + currentdate.getMilliseconds()).slice(0, 1) + '-'
      + encodeURIComponent(searchQuery) + '.csv';
    chrome.downloads.download({
      url: csvFileURL,
      filename: filename
    });
  }
}