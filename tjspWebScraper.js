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

class tjspWebScraper {
  static startScraping(searchQuery) {
    tjspWebScraper.fetchFirstResultPage(searchQuery, tjspWebScraper.scrapingRoutine);
  }

  static scrapingRoutine(response) {
    if (response) {
      let totalHits = maxPages * 20;
      let parsedTotalHits = response.match(/(id="nomeAba-A")(.*)(Acórdãos\()(.*)(\))(.*)/)[4]
      try {
        totalHits = parseInt(parsedTotalHits);
      } catch (error) {
        console.log('Could not parse "' + parsedTotalHits + '" into integer. ' + error + '.');
      }
      totalPages = Math.ceil(totalHits/20);
    
      if (totalHits) {
        tabHelper.setLoadingScreen(`Obtendo acórdãos (${totalHits})...`);

        chrome.storage.local.get('slowMode', (chromeStorageData) => {
          if (chromeStorageData.slowMode) {
            maxPages = 250;
          } else {
            maxPages = 50;
          }
      
          for (let index = 1; index <= Math.min(maxPages,totalPages); index++) {
              if (chromeStorageData.slowMode) {
                let currentBatchNumber = Math.ceil(index / 50);
                if (index <= 50) {
                  tjspWebScraper.fetchSubsequentResultPage(index, tjspWebScraper.parseResponse);
                } 
                else {
                  let isNewBatch = Math.ceil(index / 50) > Math.ceil((index - 1) / 50)
                  if (isNewBatch) {
                    let waitTimeInMinutes = Math.ceil(index / 50) - 1;
                    chrome.alarms.create(`SlowModeDelay${currentBatchNumber}`, { delayInMinutes: waitTimeInMinutes });
                    console.log(`Scheduled ${waitTimeInMinutes}-minute alarm for batch ${currentBatchNumber} on index ${index} due to Slow Mode.`);
                  }
  
                }
              } else {
              tjspWebScraper.fetchSubsequentResultPage(index, tjspWebScraper.parseResponse);
            }
          }
        });

      } else {
        tabHelper.setSearchScreenWithWarning('A pesquisa não retornou resultados. Tente termos diferentes.');
        searchController.cleanForNextRun();
      }

    } else {
      console.log("Invalid response");
      searchController.cleanForNextRun();
      searchController.setWaitForNextRun('Resposta inválida do site.');
    }    
  }

  static fetchFirstResultPage(searchQuery, callback) {
    let uri = 'https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do';
    let body = 'conversationId=&dados.buscaInteiroTeor='
    + encodeURIComponent(searchQuery) 
    + '&dados.pesquisarComSinonimos=S&dados.pesquisarComSinonimos=S&contadoragente=0&contadorMaioragente=0&contadorjuizProlator=0' 
    + '&contadorMaiorjuizProlator=0&contadorcomarca=0&contadorMaiorcomarca=0&dados.origensSelecionadas=T&tipoDecisaoSelecionados=A' 
    + '&dados.ordenarPor=dtPublicacao';

    fetch(uri, {
      'credentials':'include',
      'headers':{'content-type':'application/x-www-form-urlencoded'},
      'body': body,
      'method':'POST'
    })
    .then(tjspWebScraper.handleFetchBadResponses)
    .then(data => callback(data))
    .catch(tjspWebScraper.handleFetchExceptions);
  }

  static fetchSubsequentResultPage(page, callback) {
    let uri = 'https://esaj.tjsp.jus.br/cjsg/trocaDePagina.do?tipoDeDecisao=A&pagina=' + page;
  
    fetch(uri, {'credentials':'include'})
    .then(tjspWebScraper.handleFetchBadResponses)
    .then(data => callback(data))
    .catch(tjspWebScraper.handleFetchExceptions);      
  }

  static parseResponse(response) {
    requestsCompleted++;
    let maxReached = '';
    if (Math.min(maxPages,totalPages) == maxPages) {
      maxReached = '(Limite)'
    }
    tabHelper.setLoadingScreen(`Página ${requestsCompleted} de ${Math.min(maxPages,totalPages)}${maxReached}.`);

    if (response) {
      let parsedResponse = tjspResponseParserHelper.parseResponse(response);
      csvFileContents = new Blob([csvFileContents, parsedResponse], {type: 'application/octet-stream'});
    }

    requestsParsed++;

    downloadController.initiateDownloadIfReady();
  }

  static handleFetchBadResponses(response) {
    if (response.ok) {
      return response.text();
    } else {
      tabHelper.setLoadingScreen(`A conexão falhou (${response.status}).`);
      errorCount++;
      return null;
    }
  }

  static handleFetchExceptions(error) {
    tabHelper.setLoadingScreen(`Display:A conexão falhou. ${error}`);
    errorCount++;
  }  
}