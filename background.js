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

/**************
////CLASSES////
**************/

class tjspWebScraper {
  static startScraping(searchQuery) {
    tjspWebScraper.fetchFirstResultPage(searchQuery, tjspWebScraper.scrapingRoutine);
  }

  static scrapingRoutine(response) {
    chrome.storage.local.get(['maxPages', 'totalPages', 'slowMode'], (chromeStorageData) => {
      if (response) {
        let totalHits = chromeStorageData.maxPages * 20;
        let parsedTotalHits = response.match(/(id="nomeAba-A")(.*)(Acórdãos\()(.*)(\))(.*)/)[4];
        try {
          totalHits = parseInt(parsedTotalHits);
        } catch (error) {
          console.log('Could not parse "' + parsedTotalHits + '" into integer. ' + error + '.');
        }
      
        if (totalHits) {
          chrome.runtime.sendMessage('Display:Obtendo acórdãos (' + totalHits + ')...');
        } else {
          chrome.runtime.sendMessage('Display:A pesquisa não retornou resultados.');
        }

        let totalPagesCache = Math.ceil(totalHits/20);
        let maxPagesCache = 250;

        if (chromeStorageData.slowMode) {
          maxPagesCache = 250;
        } else {
          maxPagesCache = 50;
        }

        chrome.storage.local.set({
          maxPages: maxPagesCache,
          totalPages: totalPagesCache      
        }, () => {
          for (let index = 1; index <= Math.min(maxPagesCache,totalPagesCache); index++) {
            if (chromeStorageData.slowMode) {
              let currentBatchNumber = Math.ceil(index / 50);
              if (index <= 50) {
                tjspWebScraper.fetchSubsequentResultPage(index, tjspWebScraper.parseResponse);
              } else {
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
        searchController.cleanForNextRun();
      }    
    });
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
      .then(data => callback(data, downloadController.initiateDownloadIfReady))
      .catch(tjspWebScraper.handleFetchExceptions);
  }

  static parseResponse(response, callback) {
    chrome.storage.local.get(['maxPages', 'totalPages', 'requestsCompleted'], (chromeStorageData) => {
      
      let requestsCompletedCache = chromeStorageData.requestsCompleted + 1;
      chrome.storage.local.set({requestsCompleted: requestsCompletedCache});
      
      let effectivePageLimit = Math.min(chromeStorageData.maxPages,chromeStorageData.totalPages);
      let maxReached = '';
      if (effectivePageLimit == chromeStorageData.maxPages) {
        maxReached = '(Limite)';
      }
      chrome.runtime.sendMessage(`Display:Página ${requestsCompletedCache} de ${effectivePageLimit}${maxReached}.`);
    
      let parsedResponse = tjspResponseParserHelper.parseResponse(response);

      chrome.storage.local.get(['csvFileContents'], (chromeStorageData) => {
        let csvFileContentsCache = `${chromeStorageData.csvFileContents}${parsedResponse}`;
        chrome.storage.local.set({csvFileContents: csvFileContentsCache});

        chrome.storage.local.get(['requestsParsed'], (chromeStorageData) => {
          let requestsParsedCache = chromeStorageData.requestsParsed + 1;
          console.log(requestsCompletedCache);
          chrome.storage.local.set({
            requestsParsed: requestsParsedCache
          }, () => {
            callback();
          });
        });  
      });        
    });
  }

  static handleFetchBadResponses(response) {
    if (response.ok) {
      return response.text();
    } else {
      chrome.storage.local.get('errorCount', (chromeStorageData) => {
        chrome.runtime.sendMessage(`Display:A conexão falhou ('${response.status}').`);
        chrome.storage.local.set({errorCount: chromeStorageData.errorCount + 1});
        return null;      
      });
    }
  }

  static handleFetchExceptions(error) {
    chrome.storage.local.get('errorCount', (chromeStorageData) => {
      chrome.runtime.sendMessage(`Display:A conexão falhou. ${error}`);
      chrome.storage.local.set({errorCount: chromeStorageData.errorCount + 1});
    });
  }
}

class tjspResponseParserHelper {
  parserOffset = 0;

  static parseResponse(response) {
    let HTML_Response = document.createElement('html');
    HTML_Response.innerHTML = response;

    let parsedData = '';

    let HTML_ElementsToParse = HTML_Response.getElementsByClassName('fundocinza1');
      
    for (let HTML_ElementToParse of HTML_ElementsToParse) {
      tjspResponseParserHelper.parserOffset = 0;

      let id = tjspResponseParserHelper.extractId(HTML_ElementToParse);
      let numeroProcesso = tjspResponseParserHelper.extractNumeroProcesso(HTML_ElementToParse, id);

      tjspResponseParserHelper.parserOffset = 0;

      let classe = tjspResponseParserHelper.extractClasse(HTML_ElementToParse, id);
      let relator = tjspResponseParserHelper.extractRelator(HTML_ElementToParse, id);
      let comarca = tjspResponseParserHelper.extractComarca(HTML_ElementToParse, id);
      let orgaoJulgador = tjspResponseParserHelper.extractOrgaoJulgador(HTML_ElementToParse, id);
      let dataJulgamento = tjspResponseParserHelper.extractDataJulgamento(HTML_ElementToParse, id);
      let dataPublicacao = tjspResponseParserHelper.extractDataPublicacao(HTML_ElementToParse, id);
      let ementa = tjspResponseParserHelper.extractEmenta(HTML_ElementToParse, id);
  
      parsedData = parsedData +
        numeroProcesso +
        classe +
        relator +
        comarca +
        orgaoJulgador +
        dataJulgamento +
        dataPublicacao +
        ementa;
    }
    
    return parsedData;
  }

  static extractEmenta(HTML_ElementToParse, id) {
    let ementa = '\r\n';
    try {
      ementa = HTML_ElementToParse.getElementsByClassName('ementaClass2')[6 + tjspResponseParserHelper.parserOffset].textContent.replace(/.*Ementa:/, 'Ementa:').replace(/Ementa:.*Ementa:/s, '').replace(/Ementa:/g, '').replace(/;/g, ',').replace(/\n/g, '').trim() + '\r\n';
      if (ementa.match(/Outros números:.*/i)) {
        ementa = '\r\n';
        ementa = HTML_ElementToParse.getElementsByClassName('ementaClass2')[7 + tjspResponseParserHelper.parserOffset].textContent.replace(/.*Ementa:/, 'Ementa:').replace(/Ementa:.*Ementa:/s, '').replace(/Ementa:/g, '').replace(/;/g, ',').replace(/\n/g, '').trim() + '\r\n';
      }
    } catch (error) {
      console.log('Cannot get contents of Ementa for search result #' + id + '. ' + error + '.');
      tjspResponseParserHelper.parserOffset++;
    }
    return ementa;
  }

  static extractDataPublicacao(HTML_ElementToParse, id) {
    let dataPublicacao = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[5 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Data de publicação:.*/)) {
        dataPublicacao = text.replace('Data de publicação:', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
      tjspResponseParserHelper.parserOffset++;
    }
    return dataPublicacao;
  }

  static extractDataJulgamento(HTML_ElementToParse, id) {
    let dataJulgamento = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[4 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Data do julgamento:.*/)) {
        dataJulgamento = text.replace('Data do julgamento:', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
      tjspResponseParserHelper.parserOffset++;
    }
    return dataJulgamento;
  }

  static extractOrgaoJulgador(HTML_ElementToParse, id) {
    let orgaoJulgador = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[3 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Órgão julgador:.*/)) {
        orgaoJulgador = text.replace('Órgão julgador:', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
      tjspResponseParserHelper.parserOffset++;
    }
    return orgaoJulgador;
  }

  static extractComarca(HTML_ElementToParse, id) {
    let comarca = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[2 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Comarca:.*/)) {
        comarca = text.replace('Comarca:', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
      tjspResponseParserHelper.parserOffset++;
    }
    return comarca;
  }

  static extractRelator(HTML_ElementToParse, id) {
    let relator = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[1 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Relator\(a\):.*/)) {
        relator = text.replace('Relator(a):', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
      tjspResponseParserHelper.parserOffset++;
    }
    return relator;
  }

  static extractClasse(HTML_ElementToParse, id) {
    let classe = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[0 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Classe\/Assunto:.*/)) {
        classe = text.replace('Classe/Assunto:', '').trim() + ';';
      } else if (text.match(/.*Classe:.*/)) {
        classe = text.replace('Classe:', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
      tjspResponseParserHelper.parserOffset++;
    }
    return classe;
  }

  static extractNumeroProcesso(HTML_ElementToParse, id) {
    let numeroProcesso = ';';
    try {
      numeroProcesso = HTML_ElementToParse.getElementsByClassName('ementaClass')[1 + tjspResponseParserHelper.parserOffset].getElementsByClassName('esajLinkLogin downloadEmenta')[0].text.trim() + ';';
    } catch (error1) {
      try {
        tjspResponseParserHelper.parserOffset--;
        numeroProcesso = HTML_ElementToParse.getElementsByClassName('ementaClass')[1 + tjspResponseParserHelper.parserOffset].getElementsByClassName('esajLinkLogin downloadEmenta')[0].text.trim() + ';';
      } catch (error2) {
        console.log('Cannot get contents of numeroProcesso(2) for search result #' + id + '. ' + error2 + '.');
      }
      console.log('Cannot get contents of numeroProcesso(1) for search result #' + id + '. ' + error1 + '.');
    }
    return numeroProcesso;
  }

  static extractId(HTML_ElementToParse) {
    let id = ';';
    try {
      id = HTML_ElementToParse.getElementsByClassName('ementaClass')[0 + tjspResponseParserHelper.parserOffset].textContent.replace('-', '').trim();
    } catch (error) {
      console.log('Cannot get contents of id. ' + error + '.');
      tjspResponseParserHelper.parserOffset++;
    }
    return id;
  }
}

class searchController {
  static cleanForNextRun() {
    chrome.storage.local.set({
      onWait: true, 
      onExecution: false,
      requestsCompleted: 0,
      requestsParsed: 0,
      errorCount: 0,
      searchQuery: '',
      csvFileContents: '\ufeffNúmero do processo;Classe/Assunto;Relator(a);Comarca;Órgão Julgador;Data do Julgamento;Data de Publicação;Ementa\r\n'
    }, () => {
      let waitTimeInMinutes = 1;
      chrome.alarms.create("WaitForNextRun", { delayInMinutes: waitTimeInMinutes });
      chrome.runtime.sendMessage('Waiting');

      // Bug fix #2: sets a datetime to confirm wait mode
      chrome.storage.local.set({lastWaitEnd: Date.now() + waitTimeInMinutes * 60 * 1000 }); 
    });     
  }
}

class downloadController {
  static initiateDownloadIfReady() {
    chrome.storage.local.get(['maxPages', 'totalPages', 'requestsParsed', 'errorCount'], (chromeStorageData) => {
      let effectivePageLimit = Math.min(chromeStorageData.maxPages,chromeStorageData.totalPages);
      if (chromeStorageData.requestsParsed >= effectivePageLimit) {
        if (chromeStorageData.errorCount) {
          console.log(`Não foi possível obter ${chromeStorageData.errorCount} das ${effectivePageLimit} páginas de resultados. O arquivo está incompleto.`);
        }
        downloadController.downloadFile();
        searchController.cleanForNextRun();
      }
    });
  }

  static downloadFile() {
    chrome.storage.local.get(['searchQuery', 'csvFileContents'], (chromeStorageData) => {
      let csvFileBlob = new Blob([chromeStorageData.csvFileContents], {type: 'text/csv'});
      let csvFileURL = URL.createObjectURL(csvFileBlob);
      var currentdate = new Date();
      var filename = currentdate.getFullYear() + '-' + ("0" + (currentdate.getMonth() + 1)).slice(-2) + '-' + ("0" + (currentdate.getDate())).slice(-2) + '-'
        + currentdate.getHours() + currentdate.getMinutes() + currentdate.getSeconds() + ('' + currentdate.getMilliseconds()).slice(0, 1) + '-'
        + encodeURIComponent(chromeStorageData.searchQuery) + '.csv';
      chrome.downloads.download({
        url: csvFileURL,
        filename: filename
      });
    });
  }
}

/***********
////MAIN////
***********/

// Initializing the Extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    slowMode: false,
    onWait: false,
    onExecution: false,
    lastWaitEnd: Date.UTC(0,0),
    maxPages: 250,
    totalPages: 0,
    requestsCompleted: 0,
    requestsParsed: 0,
    errorCount: 0,
    searchQuery: '',
    csvFileContents: '\ufeffNúmero do processo;Classe/Assunto;Relator(a);Comarca;Órgão Julgador;Data do Julgamento;Data de Publicação;Ementa\r\n'
  });
});

// Reset options and modes to default on Startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({
    slowMode: false,
    onWait: false,
    onExecution: false,
    lastWaitEnd: Date.UTC(0,0),
    maxPages: 250,
    totalPages: 0,
    requestsCompleted: 0,
    requestsParsed: 0,
    errorCount: 0,
    searchQuery: '',
    csvFileContents: '\ufeffNúmero do processo;Classe/Assunto;Relator(a);Comarca;Órgão Julgador;Data do Julgamento;Data de Publicação;Ementa\r\n'
  });
});

// Receives message with search content and performs first connection to the site
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.match(/Search:/)) {
    chrome.storage.local.set({onExecution: true}, () => {
      chrome.runtime.sendMessage('Executing');
    });

    let searchQueryCache = msg.replace(/Search:/,'');
    chrome.runtime.sendMessage('Display:Conectando...');

    chrome.storage.local.set({searchQuery: searchQueryCache}, () => {
      tjspWebScraper.startScraping(searchQueryCache);  
    });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name == "WaitForNextRun") {
    chrome.storage.local.set({onWait: false}, () => { 
      chrome.runtime.sendMessage('WaitComplete');
    });
  }
  else if (alarm.name.match(/SlowModeDelay/)) {
    let batchNumber = parseInt(alarm.name.replace(/SlowModeDelay/,''));
    for (let index = (batchNumber * 50) - 49; index <= (batchNumber * 50); index++) {
      tjspWebScraper.fetchSubsequentResultPage(index, tjspWebScraper.parseResponse);
    }
  }
});