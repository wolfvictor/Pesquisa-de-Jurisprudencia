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

Copyright 2020 Victor Wolf
*****************************************************************************************/

'use strict';

/****************
////VARIABLES////
****************/

let maxPages = 250;
let totalPages = 0;
let requestsCompleted = 0;
let requestsParsed = 0;
let blob = new Blob([], {type: 'text/csv'});   
let search = '';
let errorCount = 0;

/****************
////FUNCTIONS////
****************/

// Receives fetch response and decides on how to proceed
function handleFetchErrors(response) {
  if (response.ok) {
    return response.text();
  } else {
    chrome.runtime.sendMessage('Display:Conexão falhou (' + response.status + ').');
    errorCount++;
    return null;
  }
}

// Resets variables for next run and decides if wait is required
function cleanForNextRun() {
  requestsCompleted = 0;
  requestsParsed = 0;
  errorCount = 0;
  chrome.storage.sync.set({onExecution: false}, function() {});
  chrome.storage.sync.get('slowMode', function(data) {
    if (!data.slowMode) {
      chrome.storage.sync.set({onWait: true}, function() {
        let waitingTime = 45000;
        setTimeout(() => {
          chrome.storage.sync.set({onWait: false}, function() { 
            chrome.runtime.sendMessage('WaitComplete');
          });
        }, waitingTime);
        setTimeout(() => {
          chrome.runtime.sendMessage('Waiting');
        }, 5000);
        // Bug fix #2: sets a datetime to confirm wait mode
        chrome.storage.sync.set({lastWaitEnd: Date.now() + waitingTime }, function() {}); 
      });     
    }
  });
}

// Implements first connection to the site
function fetchPrimeiraPesquisaESAJ(pesquisa, callback) {
  let uri = 'https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do';
  let body = 'conversationId=&dados.buscaInteiroTeor=' + encodeURIComponent(pesquisa) + '&dados.pesquisarComSinonimos=S&dados.pesquisarComSinonimos=S&contadoragente=0&contadorMaioragente=0&contadorjuizProlator=0&contadorMaiorjuizProlator=0&contadorcomarca=0&contadorMaiorcomarca=0&dados.origensSelecionadas=T&tipoDecisaoSelecionados=A&dados.ordenarPor=dtPublicacao';

  fetch(uri, {
    'credentials':'include',
    'headers':{'content-type':'application/x-www-form-urlencoded'},
    'body': body,
    'method':'POST'
  })
    .then(handleFetchErrors)
    .then(data => callback(data));
}

// Gets pages after first connection to the site has been made
function fetchSegundaPesquisaESAJ(page, callback) {
  let uri = 'https://esaj.tjsp.jus.br/cjsg/trocaDePagina.do?tipoDeDecisao=A&pagina=' + page;

  fetch(uri, {'credentials':'include'})
    .then(handleFetchErrors)
    .then(data => callback(data));
}

// Gets results page by page
function getAcordaos(response) {
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
      chrome.runtime.sendMessage('Display:Obtendo acórdãos (' + totalHits + ')...');
    } else {
      chrome.runtime.sendMessage('Display:A pesquisa não retornou resultados.');
    }
    
    chrome.storage.sync.get('slowMode', function(data) {
      if (data.slowMode) {
        maxPages = 250;
      } else {
        maxPages = 50;
      }
  
      for (let index = 1; index <= Math.min(maxPages,totalPages); index++) {
          if (data.slowMode) {
          setTimeout(fetchSegundaPesquisaESAJ, (index + 1) * 1200, index, parseResponse);
        } else {
          fetchSegundaPesquisaESAJ(index, parseResponse);
        }
      }
    });
  } else {
    cleanForNextRun();
  }
}

// Parses the response, prints the results and calls sendDoneMessage once all loops finished
function parseResponse(response) {
  requestsCompleted++;
  let maxReached = '';
  if (Math.min(maxPages,totalPages) == maxPages) {
    maxReached = '(Limite)'
  }
  chrome.runtime.sendMessage('Display:Página ' + requestsCompleted + ' de ' + Math.min(maxPages,totalPages) + maxReached + '.');

  if (response) {
    let HTMLresponse = document.createElement('html');
    HTMLresponse.innerHTML = response;
    let elements = HTMLresponse.getElementsByClassName('fundocinza1');
    
    let lineToAppend = '';
  
    for (let element of elements) {
      let offset = 0;

      let id = ';';
      try {
        id = element.getElementsByClassName('ementaClass')[0 + offset].textContent.replace('-','').trim();
      } catch (error) {
        console.log('Cannot get contents of id. ' + error + '.');
        offset++;
      }
      
      let numeroProcesso = ';';
      try {
        numeroProcesso = element.getElementsByClassName('ementaClass')[1 + offset].getElementsByClassName('esajLinkLogin downloadEmenta')[0].text.trim() + ';';
      } catch (error1) {
        try {
          offset--;
          numeroProcesso = element.getElementsByClassName('ementaClass')[1 + offset].getElementsByClassName('esajLinkLogin downloadEmenta')[0].text.trim() + ';';
        } catch (error2) {
          console.log('Cannot get contents of numeroProcesso(2) for search result #' + id + '. ' + error2 + '.');
        }
        console.log('Cannot get contents of numeroProcesso(1) for search result #' + id + '. ' + error1 + '.');
      }

      offset = 0;

      let classe = ';';
      try {
        let text = element.getElementsByClassName('ementaClass2')[0 + offset].textContent;
        if (text.match(/.*Classe\/Assunto:.*/)) {
          classe = text.replace('Classe/Assunto:', '').trim() + ';';
        } else if (text.match(/.*Classe:.*/)) {
          classe = text.replace('Classe:', '').trim() + ';';
        } else {
          offset--;
        }
      } catch (error) {
        console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
        offset++;
      }
      
      let relator = ';';
      try {
        let text = element.getElementsByClassName('ementaClass2')[1 + offset].textContent;
        if (text.match(/.*Relator\(a\):.*/)) {
          relator = text.replace('Relator(a):', '').trim() + ';';
        } else {
          offset--;
        }
      } catch (error) {
        console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
        offset++;
      }
      
      let comarca = ';';
      try {
        let text = element.getElementsByClassName('ementaClass2')[2 + offset].textContent;
        if (text.match(/.*Comarca:.*/)) {
          comarca = text.replace('Comarca:', '').trim() + ';';
        } else {
          offset--;
        }
      } catch (error) {
        console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
        offset++;
      }

      let orgaoJulgador = ';';
      try {
        let text = element.getElementsByClassName('ementaClass2')[3 + offset].textContent;
        if (text.match(/.*Órgão julgador:.*/)) {
          orgaoJulgador = text.replace('Órgão julgador:', '').trim() + ';';
        } else {
          offset--;
        }
      } catch (error) {
        console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
        offset++;
      }

      let dataJulgamento = ';';
      try {
        let text = element.getElementsByClassName('ementaClass2')[4 + offset].textContent;
        if (text.match(/.*Data do julgamento:.*/)) {
          dataJulgamento = text.replace('Data do julgamento:', '').trim() + ';';
        } else {
          offset--;
        }
      } catch (error) {
        console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
        offset++;
      }
      
      let dataPublicacao = ';';
      try {
        let text = element.getElementsByClassName('ementaClass2')[5 + offset].textContent;
        if (text.match(/.*Data de publicação:.*/)) {
          dataPublicacao = text.replace('Data de publicação:', '').trim() + ';';
        } else {
          offset--;
        }
      } catch (error) {
        console.log('Cannot get contents of orgaoJulgador for search result #' + id + '. ' + error + '.');
        offset++;
      }

      let ementa = '\r\n';
      try {
        ementa = element.getElementsByClassName('ementaClass2')[6 + offset].textContent.replace(/.*Ementa:/,'Ementa:').replace(/Ementa:.*Ementa:/s, '').replace(/Ementa:/g, '').replace(/;/g,',').replace(/\n/g,'').trim() + '\r\n';
        if (ementa.match(/Outros números:.*/i)) {
          ementa = '\r\n';
          ementa = element.getElementsByClassName('ementaClass2')[7 + offset].textContent.replace(/.*Ementa:/,'Ementa:').replace(/Ementa:.*Ementa:/s, '').replace(/Ementa:/g, '').replace(/;/g,',').replace(/\n/g,'').trim() + '\r\n';
        }
      } catch (error) {
        console.log('Cannot get contents of Ementa for search result #' + id + '. ' + error + '.');
        offset++;
      }
  
      blob = new Blob([blob, numeroProcesso, classe, relator, comarca, orgaoJulgador, dataJulgamento, dataPublicacao, ementa], {type: 'application/octet-stream'});   
    }
  }

  setTimeout(waitBeforeDownload, 0);

}

// Counts parsed requests until limit is reached, then calls downloadFile.
function waitBeforeDownload() {
  requestsParsed++;
  if (requestsParsed >= Math.min(maxPages,totalPages)) {
    if (errorCount) {
      console.log('Não foi possível obter ' + errorCount + ' das ' + Math.min(maxPages,totalPages) + ' páginas de resultados. O arquivo está incompleto.');
    }
    downloadFile();
    chrome.runtime.sendMessage('Done');
    cleanForNextRun();
  }
}

// Prompts user to download file. File (blob) is reset in the end.
function downloadFile() {
  let blobUrl = URL.createObjectURL(blob);
  var currentdate = new Date();
  var filename = currentdate.getFullYear() + '-' + ("0" + (currentdate.getMonth() + 1)).slice(-2) + '-' + ("0" + (currentdate.getDate())).slice(-2) + '-'
    + currentdate.getHours() + currentdate.getMinutes() + currentdate.getSeconds() + ('' + currentdate.getMilliseconds()).slice(0, 1) + '-'
    + encodeURIComponent(search) + '.csv';
  chrome.downloads.download({
    url: blobUrl,
    filename: filename
  });
}

/***********
////MAIN////
***********/

// Initializing the Extension
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.set({slowMode: false, onWait: false, onExecution: false, lastWaitEnd: Date.UTC(0,0)}, function() {});
});

// Reset options and modes to default on Startup
chrome.runtime.onStartup.addListener(function() {
  chrome.storage.sync.set({slowMode: false, onWait: false, onExecution: false, lastWaitEnd: Date.UTC(0,0)}, function() {});
});

// Receives message with search content and performs first connection to the site
chrome.runtime.onMessage.addListener(function(msg) {
  if (msg.match(/Search:/)) {
    chrome.storage.sync.set({onExecution: true}, function() {
      chrome.runtime.sendMessage('Executing');
    });
    search = msg.replace(/Search:/,'');
    blob = new Blob(["\ufeff", 'Número do processo;Classe/Assunto;Relator(a);Comarca;Órgão Julgador;Data do Julgamento;Data de Publicação;Ementa\r\n'], {type: 'application/octet-stream'});
    chrome.runtime.sendMessage('Display:Conectando...');
    fetchPrimeiraPesquisaESAJ(search, getAcordaos);
  }
});

