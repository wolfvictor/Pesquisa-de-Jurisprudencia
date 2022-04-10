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

class tjspResponseParserHelper {
  parserOffset = 0;

  static parseResponse(response) {
    let HTML_Response = document.createElement('html');
    HTML_Response.innerHTML = response;

    let parsedData = new Blob([], {type: 'application/octet-stream'});

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
  
      parsedData = new Blob([
        parsedData,
        numeroProcesso,
        classe,
        relator,
        comarca,
        orgaoJulgador,
        dataJulgamento,
        dataPublicacao,
        ementa
      ], {type: 'application/octet-stream'});   
    }
    
    return parsedData;
  }

  static logParsingIssuesVerbose(fieldName, id, error) {
    console.debug(`Cannot get contents of ${fieldName} for search result #${id}. ${error}.`);
  }

  static extractEmenta(HTML_ElementToParse, id) {
    let fieldName = "Ementa";
    let ementa = '\r\n';
    try {
      ementa = HTML_ElementToParse.getElementsByClassName('ementaClass2')[6 + tjspResponseParserHelper.parserOffset].textContent.replace(/.*Ementa:/, 'Ementa:').replace(/Ementa:.*Ementa:/s, '').replace(/Ementa:/g, '').replace(/;/g, ',').replace(/\n/g, '').trim() + '\r\n';
      if (ementa.match(/Outros números:.*/i)) {
        ementa = '\r\n';
        ementa = HTML_ElementToParse.getElementsByClassName('ementaClass2')[7 + tjspResponseParserHelper.parserOffset].textContent.replace(/.*Ementa:/, 'Ementa:').replace(/Ementa:.*Ementa:/s, '').replace(/Ementa:/g, '').replace(/;/g, ',').replace(/\n/g, '').trim() + '\r\n';
      }
    } catch (error) {
      tjspResponseParserHelper.logParsingIssuesVerbose(fieldName, id, error);
      tjspResponseParserHelper.parserOffset++;
    }
    return ementa;
  }

  static extractDataPublicacao(HTML_ElementToParse, id) {
    let fieldName = "DataPublicacao"
    let dataPublicacao = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[5 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Data de publicação:.*/)) {
        dataPublicacao = text.replace('Data de publicação:', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      tjspResponseParserHelper.logParsingIssuesVerbose(fieldName, id, error);
      tjspResponseParserHelper.parserOffset++;
    }
    return dataPublicacao;
  }

  static extractDataJulgamento(HTML_ElementToParse, id) {
    let fieldName = "DataJulgamento";
    let dataJulgamento = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[4 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Data do julgamento:.*/)) {
        dataJulgamento = text.replace('Data do julgamento:', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      tjspResponseParserHelper.logParsingIssuesVerbose(fieldName, id, error);
      tjspResponseParserHelper.parserOffset++;
    }
    return dataJulgamento;
  }

  static extractOrgaoJulgador(HTML_ElementToParse, id) {
    let fieldName = "OrgaoJulgador";
    let orgaoJulgador = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[3 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Órgão julgador:.*/)) {
        orgaoJulgador = text.replace('Órgão julgador:', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      tjspResponseParserHelper.logParsingIssuesVerbose(fieldName, id, error);
      tjspResponseParserHelper.parserOffset++;
    }
    return orgaoJulgador;
  }

  static extractComarca(HTML_ElementToParse, id) {
    let fieldName = "Comarca";
    let comarca = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[2 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Comarca:.*/)) {
        comarca = text.replace('Comarca:', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      tjspResponseParserHelper.logParsingIssuesVerbose(fieldName, id, error);
      tjspResponseParserHelper.parserOffset++;
    }
    return comarca;
  }

  static extractRelator(HTML_ElementToParse, id) {
    let fieldName = "Relator";
    let relator = ';';
    try {
      let text = HTML_ElementToParse.getElementsByClassName('ementaClass2')[1 + tjspResponseParserHelper.parserOffset].textContent;
      if (text.match(/.*Relator\(a\):.*/)) {
        relator = text.replace('Relator(a):', '').trim() + ';';
      } else {
        tjspResponseParserHelper.parserOffset--;
      }
    } catch (error) {
      tjspResponseParserHelper.logParsingIssuesVerbose(fieldName, id, error);
      tjspResponseParserHelper.parserOffset++;
    }
    return relator;
  }

  static extractClasse(HTML_ElementToParse, id) {
    let fieldName = "Classe";
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
      tjspResponseParserHelper.logParsingIssuesVerbose(fieldName, id, error);
      tjspResponseParserHelper.parserOffset++;
    }
    return classe;
  }

  static extractNumeroProcesso(HTML_ElementToParse, id) {
    let fieldName = "NumeroProcesso";
    let numeroProcesso = ';';
    try {
      numeroProcesso = HTML_ElementToParse.getElementsByClassName('ementaClass')[1 + tjspResponseParserHelper.parserOffset].getElementsByClassName('esajLinkLogin downloadEmenta')[0].text.trim() + ';';
    } catch (error1) {
      try {
        tjspResponseParserHelper.parserOffset--;
        numeroProcesso = HTML_ElementToParse.getElementsByClassName('ementaClass')[1 + tjspResponseParserHelper.parserOffset].getElementsByClassName('esajLinkLogin downloadEmenta')[0].text.trim() + ';';
      } catch (error2) {
        tjspResponseParserHelper.logParsingIssuesVerbose(`${fieldName}2`, id, error2);
      }
      tjspResponseParserHelper.logParsingIssuesVerbose(`${fieldName}1`, id, error1);
    }
    return numeroProcesso;
  }

  static extractId(HTML_ElementToParse) {
    let id = ';';
    try {
      id = HTML_ElementToParse.getElementsByClassName('ementaClass')[0 + tjspResponseParserHelper.parserOffset].textContent.replace('-', '').trim();
    } catch (error) {
      console.log(`Cannot get contents of id. ${error}.`);
      tjspResponseParserHelper.parserOffset++;
    }
    return id;
  }
}