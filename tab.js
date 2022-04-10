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
let searchElements = document.getElementsByClassName('search');
let divLoading = document.getElementById('divLoading');
let searchQueryInput = document.getElementById('searchQueryInput');
let searchWarning = document.getElementById('searchWarning');
let errorMessage = document.getElementById('errorMessage');
let downloadButton = document.getElementById('downloadButton');
let loadingCaption = document.getElementById('loadingCaption');

let maxPages = 250;
let totalPages = 0;
let requestsCompleted = 0;
let requestsParsed = 0;
let csvFileContents = new Blob([
  "\ufeff",
  'Número do processo;Classe/Assunto;Relator(a);Comarca;Órgão Julgador;Data do Julgamento;Data de Publicação;Ementa\r\n'
], {type: 'application/octet-stream'});  
let searchQuery = '';
let errorCount = 0;

/***********
////MAIN////
***********/

downloadButton.onclick = () => {
  if (searchQueryInput.value) {
    chrome.storage.local.set({onExecution: true});
    tabHelper.setLoadingScreen('Conectando...');
    searchQuery = downloadController.sanitizeUserInput(searchQueryInput.value);
    tjspWebScraper.startScraping(searchQuery);
    tabHelper.setLoadingScreen();
  } else {
    errorMessage.removeAttribute("hidden");
  }
};

searchQueryInput.addEventListener("keyup", (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    downloadButton.click();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name == "WaitForNextRun") {
    chrome.storage.local.set({onWait: false}, () => { 
      tabHelper.setSearchScreenWithoutWarning();
    });
  }
  else if (alarm.name.match(/SlowModeDelay/)) {
    let batchNumber = parseInt(alarm.name.replace(/SlowModeDelay/,''));
    for (let index = (batchNumber * 50) - 49; index <= (batchNumber * 50); index++) {
      tjspWebScraper.fetchSubsequentResultPage(index, tjspWebScraper.parseResponse);
    }
  }
});

tabHelper.setCorrectScreen()

// Focus on the search field as soon as the user opens the popup page
searchQueryInput.focus();
